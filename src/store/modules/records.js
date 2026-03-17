import { apiBaseUrl, getJson } from '../../services/apiClient';
import { normalizeDetections } from '../../services/adapters/detectAdapter';

const asArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const k of keys) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
};

const statusKey = (s) => {
  if (s === 'qualified' || s === '合格') return 'qualified';
  if (s === 'defect' || s === '缺陷' || s === '异常') return 'defect';
  if (s === 'undetected' || s === '未检测') return 'undetected';
  if (s === '已检测') return 'detected';
  return 'unknown';
};

export const state = () => ({
  inspectionRecords: [],
  currentRecord: null,
  currentImage: null,
  detectionResults: [],
  processedImagePath: null
});

export const mutations = {
  SET_INSPECTION_RECORDS(s, records) {
    s.inspectionRecords = records;
  },

  SET_CURRENT_RECORD(s, record) {
    s.currentRecord = record;
    if (record) {
      let fullPath = null;
      if (record.path) {
        fullPath = apiBaseUrl + record.path;
      } else if (record.roomId && record.pointId && record.filename) {
        fullPath = `${apiBaseUrl}uploads/images/${record.roomId}/${record.pointId}/${record.filename}`;
      }
      s.currentImage = {
        id: record.id,
        path: fullPath
      };
      s.detectionResults = [];
      s.processedImagePath = null;
    } else {
      s.currentImage = null;
    }
  },

  SET_DETECTION_RESULTS(s, results) {
    s.detectionResults = results;
    s.showResultsPanel = true;
  },

  SET_PROCESSED_IMAGE_PATH(s, path) {
    s.processedImagePath = path || null;
  },

  UPDATE_RECORD_STATUS(s, { id, status }) {
    if (!id || !status) return;
    const list = Array.isArray(s.inspectionRecords) ? s.inspectionRecords : [];
    s.inspectionRecords = list.map((r) => {
      if (r && r.id === id) return { ...r, status };
      return r;
    });
    if (s.currentRecord && s.currentRecord.id === id) {
      s.currentRecord = { ...s.currentRecord, status };
    }
  },

  UPDATE_RECORD_FLAGS(s, { id, isDetected, hasIssue }) {
    if (!id) return;
    const list = Array.isArray(s.inspectionRecords) ? s.inspectionRecords : [];
    s.inspectionRecords = list.map((r) => {
      if (r && r.id === id) {
        const next = { ...r };
        if (isDetected !== undefined) next.isDetected = !!isDetected;
        if (hasIssue !== undefined) next.hasIssue = !!hasIssue;
        return next;
      }
      return r;
    });
    if (s.currentRecord && s.currentRecord.id === id) {
      const cur = { ...s.currentRecord };
      if (isDetected !== undefined) cur.isDetected = !!isDetected;
      if (hasIssue !== undefined) cur.hasIssue = !!hasIssue;
      s.currentRecord = cur;
    }
  }
};

export const actions = {
  loadInspectionRecords({ commit }, records) {
    commit('SET_INSPECTION_RECORDS', records);
  },

  async fetchImagesFromServer({ commit, dispatch }) {
    try {
      commit('SET_BACKEND_STATUS', 'unknown');
      commit('SET_BACKEND_ERROR', null);

      const isHealthy = await dispatch('checkBackendHealth');
      if (!isHealthy) {
        commit('SET_INSPECTION_RECORDS', []);
        return [];
      }

      const { ok, data } = await getJson('/api/images');
      if (ok) {
        const list = asArray(data, ['images']);
        commit('SET_INSPECTION_RECORDS', list);
        return list;
      }

      commit('SET_BACKEND_STATUS', 'error');
      commit('SET_BACKEND_ERROR', '获取数据失败');
      commit('SET_INSPECTION_RECORDS', []);
      return [];
    } catch (error) {
      console.error('获取图片列表失败:', error);
      commit('SET_BACKEND_STATUS', 'error');
      commit('SET_BACKEND_ERROR', '后端连接失败');
      commit('SET_INSPECTION_RECORDS', []);
      return [];
    }
  },

  async fetchImagesByFilter({ commit, dispatch }, { status, start = null, end = null, roomId = null, pointId = null } = {}) {
    try {
      const isHealthy = await dispatch('checkBackendHealth');
      if (!isHealthy) {
        commit('SET_INSPECTION_RECORDS', []);
        return [];
      }

      const statusMap = {
        detected: '已检测',
        undetected: '未检测'
      };
      let statusText = status;
      if (status && typeof status === 'string') {
        statusText = statusMap[status] || status;
      }
      if (statusText === '全部' || status === 'all') {
        statusText = '';
      }

      const qs = new URLSearchParams();
      if (statusText) {
        if (status === 'qualified' || status === 'exception') {
          qs.set('status', '已检测');
          qs.set('hasIssue', status === 'exception' ? 'true' : 'false');
        } else {
          qs.set('status', statusText);
        }
      }
      if (start) qs.set('start', start);
      if (end) qs.set('end', end);
      if (roomId) qs.set('roomId', roomId);
      if (pointId) qs.set('pointId', pointId);

      const { ok, data } = await getJson(`/api/images/filter?${qs.toString()}`);
      if (ok) {
        const images = asArray(data, ['images', 'list']);
        commit('SET_INSPECTION_RECORDS', images);
        return images;
      }

      commit('SET_BACKEND_STATUS', 'error');
      commit('SET_BACKEND_ERROR', data && data.message ? data.message : '筛选接口返回错误');
      commit('SET_INSPECTION_RECORDS', []);
      return [];
    } catch (error) {
      console.error('筛选请求失败:', error);
      commit('SET_BACKEND_STATUS', 'error');
      commit('SET_BACKEND_ERROR', '筛选请求失败');
      commit('SET_INSPECTION_RECORDS', []);
      return [];
    }
  },

  setCurrentRecord({ commit }, record) {
    commit('SET_CURRENT_RECORD', record);
  },

  setDetectionResults({ commit }, results) {
    commit('SET_DETECTION_RESULTS', results);
  },

  setShowResultsPanel({ commit }, show) {
    commit('SET_SHOW_RESULTS_PANEL', show);
  },

  async fetchDetectionsByImage({ commit, dispatch }, { imageId }) {
    if (!imageId) return [];

    const healthy = await dispatch('checkBackendHealth');
    if (!healthy) return [];

    try {
      const { ok, data: raw } = await getJson(`/api/images/${imageId}/detections`);
      if (!ok || !raw) return [];

      let processedUrl = null;
      if (Array.isArray(raw)) {
        processedUrl = raw[0] && raw[0].processedUrl ? raw[0].processedUrl : null;
      } else if (raw && Array.isArray(raw.detections)) {
        processedUrl = raw.detections[0] && raw.detections[0].processedUrl ? raw.detections[0].processedUrl : null;
      }
      if (processedUrl) {
        commit('SET_PROCESSED_IMAGE_PATH', apiBaseUrl + (processedUrl.startsWith('/') ? processedUrl.slice(1) : processedUrl));
      }

      let detArray = [];
      if (Array.isArray(raw)) detArray = raw;
      else if (raw && Array.isArray(raw.detections)) detArray = raw.detections;

      const isDetectedFlag = detArray.length > 0;
      let hasIssueFlag = false;
      for (const d of detArray) {
        const summary = d && d.summary;
        if (summary && summary.hasIssue === true) {
          hasIssueFlag = true;
          break;
        }
      }

      const list = normalizeDetections(raw);
      if (!Array.isArray(list)) return [];

      commit('SET_DETECTION_RESULTS', list);
      commit('SET_SHOW_RESULTS_PANEL', true);

      const getTimeVal = (item) => {
        const t = item.updatedAt || item.timestamp || item.time || item.CreatedAt || item.UpdatedAt || item.created_at || item.updated_at || item._fallbackTime;
        if (!t) return 0;
        return new Date(t).getTime();
      };

      let maxTime = 0;
      list.forEach((item) => {
        const t = getTimeVal(item);
        if (t > maxTime) maxTime = t;
      });

      let finalHasIssue = hasIssueFlag;
      if (maxTime > 0) {
        const latestItems = list.filter((item) => Math.abs(getTimeVal(item) - maxTime) < 1000);
        if (latestItems.length > 0) {
          let foundIssue = false;
          for (const item of latestItems) {
            const type = String(item.type || '').toLowerCase();
            if (type.includes('hole')) {
              foundIssue = true;
              break;
            }
            if (!type.includes('bolts') && !type.includes('hole')) {
              foundIssue = true;
              break;
            }
          }
          finalHasIssue = foundIssue;
        }
      }

      const nextStatus = isDetectedFlag ? '已检测' : '未检测';
      commit('UPDATE_RECORD_FLAGS', { id: imageId, isDetected: isDetectedFlag, hasIssue: finalHasIssue });
      commit('UPDATE_RECORD_STATUS', { id: imageId, status: nextStatus });

      return list;
    } catch (e) {
      return [];
    }
  }
};
