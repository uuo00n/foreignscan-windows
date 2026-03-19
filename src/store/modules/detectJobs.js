import { apiUrl, deleteJson, getJson, postJson } from '../../services/apiClient';
import { normalizeJob } from '../../services/adapters/detectAdapter';

export const state = () => ({
  detectJobs: {}
});

export const mutations = {
  SET_DETECT_JOB(s, job) {
    if (!job || !job.ID) return;
    const id = job.ID;
    s.detectJobs = { ...s.detectJobs, [id]: job };
  },
  REMOVE_DETECT_JOB(s, jobId) {
    if (!jobId) return;
    const next = { ...s.detectJobs };
    delete next[jobId];
    s.detectJobs = next;
  },
  CLEAR_DETECT_JOBS_HISTORY(s) {
    const jobs = s.detectJobs || {};
    const terminal = new Set(['completed', 'failed', 'canceled']);
    const next = {};
    for (const [id, job] of Object.entries(jobs)) {
      if (!job) continue;
      if (!terminal.has(job.Status)) next[id] = job;
    }
    s.detectJobs = next;
  }
};

export const actions = {
  async startYOLOForSelected({ dispatch, rootState }, { ids = [], config = {} } = {}) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const healthy = await dispatch('checkBackendHealth');
    if (!healthy) throw new Error('backend_unhealthy');

    const body = config || {};
    const records = Array.isArray(rootState.inspectionRecords) ? rootState.inspectionRecords : [];
    const roomsTree = Array.isArray(rootState.roomsTree) ? rootState.roomsTree : [];
    const credentialsMap = rootState.detectPadCredentials && typeof rootState.detectPadCredentials === 'object'
      ? rootState.detectPadCredentials
      : {};
    const roomMap = new Map(roomsTree.map((room) => [String(room.id || ''), room]));
    const recordMap = new Map(records.map((record) => [String(record.id || ''), record]));

    const tasks = ids.map((id) => (async () => {
      try {
        const rid = String(id || '').trim();
        const record = recordMap.get(rid);
        const roomId = String((record && (record.roomId || record.room_id || (record.room && record.room.id))) || '').trim();
        if (!roomId) {
          return { id: rid, ok: false, error: '无法识别图片所属房间，请先刷新列表' };
        }

        const room = roomMap.get(roomId);
        const padId = String((room && room.padId) || '').trim();
        if (!padId) {
          return { id: rid, ok: false, error: `房间 ${room && (room.name || room.id) ? (room.name || room.id) : roomId} 未绑定 Pad ID` };
        }

        const credentials = credentialsMap[roomId] || {};
        const padKey = String(credentials.padKey || '').trim();
        if (!padKey) {
          return { id: rid, ok: false, error: `房间 ${room && (room.name || room.id) ? (room.name || room.id) : roomId} 未配置检测 PadKey` };
        }

        const { ok, data } = await postJson(`/api/images/${rid}/detect`, body, {
          headers: {
            'X-Pad-Id': padId,
            'X-Pad-Key': padKey
          }
        });
        const jobId = (data && (data.jobId || data.id || (data.job && (data.job.id || data.job.jobId)))) || null;
        if (!ok) {
          return { id: rid, ok: false, error: (data && data.message) || '触发检测失败' };
        }
        return { id: rid, ok, jobId };
      } catch (error) {
        return { id: String(id || ''), ok: false, error: String(error) };
      }
    })());

    const settled = await Promise.allSettled(tasks);
    return settled.map((r, i) => (r.status === 'fulfilled'
      ? r.value
      : { id: ids[i], ok: false, error: String(r.reason) }));
  },

  async initDetectJobs({ commit }, jobPairs = []) {
    for (const pair of (jobPairs || [])) {
      if (!pair || !pair.jobId) continue;
      commit('SET_DETECT_JOB', {
        ID: pair.jobId,
        Status: 'queued',
        Progress: 0,
        Total: 0,
        Message: '等待任务开始'
      });
    }
  },

  async subscribeJobs({ commit, dispatch }, jobPairs = []) {
    const terminal = new Set(['completed', 'failed', 'canceled']);

    for (const pair of (jobPairs || [])) {
      if (!pair || !pair.ok || !pair.jobId) continue;
      const jobId = pair.jobId;

      try {
        const urls = [
          apiUrl(`/api/detect/jobs/${jobId}/stream`),
          apiUrl(`/api/jobs/${jobId}/stream`)
        ];
        let es = null;
        const openStream = (idx) => {
          if (idx >= urls.length) {
            dispatch('pollJobUntilDone', { jobId, imageId: pair.id });
            return;
          }
          try {
            es = new EventSource(urls[idx]);
            es.onmessage = (evt) => {
              try {
                const json = JSON.parse(evt.data);
                const job = normalizeJob(json) || {
                  ID: jobId,
                  Status: 'running',
                  Progress: 0,
                  Total: 0,
                  Message: ''
                };
                commit('SET_DETECT_JOB', job);
                if (terminal.has(job.Status)) {
                  es.close();
                  if (pair.id) dispatch('fetchDetectionsByImage', { imageId: pair.id });
                }
              } catch (_) {
                // ignore parse errors in stream frames
              }
            };
            es.onerror = () => {
              try { es.close(); } catch (_) {}
              openStream(idx + 1);
            };
          } catch (_) {
            openStream(idx + 1);
          }
        };

        openStream(0);
      } catch (_) {
        dispatch('pollJobUntilDone', { jobId, imageId: pair.id });
      }
    }
  },

  async pollJobUntilDone({ commit, dispatch }, { jobId, imageId }) {
    const terminal = new Set(['completed', 'failed', 'canceled']);
    const interval = 1200;
    let timer = null;

    const run = async () => {
      try {
        const { ok, data } = await getJson(`/api/detect/jobs/${jobId}`);
        if (ok && data) {
          const raw = data.job || data;
          const job = normalizeJob(raw);
          if (job) {
            if (!job.ID) job.ID = jobId;
            commit('SET_DETECT_JOB', job);
            if (terminal.has(job.Status)) {
              clearInterval(timer);
              timer = null;
              if (imageId) dispatch('fetchDetectionsByImage', { imageId });
            }
          }
        } else {
          clearInterval(timer);
          timer = null;
        }
      } catch (_) {
        clearInterval(timer);
        timer = null;
      }
    };

    await run();
    timer = setInterval(run, interval);
  },

  async cancelDetectJob({ commit }, { jobId }) {
    if (!jobId) return false;
    try {
      const { ok } = await deleteJson(`/api/detect/jobs/${jobId}`);
      if (ok) {
        commit('REMOVE_DETECT_JOB', jobId);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  },

  clearDetectJobsHistory({ commit }) {
    commit('CLEAR_DETECT_JOBS_HISTORY');
    return true;
  }
};
