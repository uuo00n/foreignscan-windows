import { createStore } from 'vuex'
import apiConfig from '../config/api.json';
const API_BASE = apiConfig.API_BASE;

const normalizeJob = (src) => {
  if (!src) return null;
  const nested = src.job || {};
  const id = src.ID || src.id || src.jobId || nested.ID || nested.id || nested.jobId || null;
  let status = (src.Status || src.status || src.state || nested.Status || nested.status || nested.state || '').toLowerCase();
  if (!status) {
    if (src.done === true || nested.done === true) status = 'completed'; else status = 'running';
  }
  if (status === 'success') status = 'completed';
  if (status === 'error') status = 'failed';
  if (status === 'cancelled') status = 'canceled';
  const percent = src.percent ?? src.percentage ?? nested.percent ?? nested.percentage;
  let progress = src.Progress ?? src.progress ?? nested.Progress ?? nested.progress ?? 0;
  let total = src.Total ?? src.total ?? nested.Total ?? nested.total ?? 0;
  if ((percent != null) && (!total || Number(total) === 0)) { total = 100; progress = percent; }
  const message = src.Message || src.message || nested.Message || nested.message || '';
  return { ID: id, Status: status || 'running', Progress: Number(progress) || 0, Total: Number(total) || 0, Message: String(message || '') };
}


// 统一检测结果字段：兼容后端不同命名/结构（含 detections[].items）
const normalizeDetections = (raw) => {
  // 尝试提取顶层公共时间字段（仅当 raw 为非数组对象时）
  let commonTime = null;
  if (raw && !Array.isArray(raw) && typeof raw === 'object') {
    commonTime = raw.updatedAt || raw.timestamp || raw.time || raw.CreatedAt || raw.UpdatedAt || raw.created_at || raw.updated_at || null;
  }

  // 解析顶层列表：可能为数组或对象属性
  let top = [];
  try {
    if (Array.isArray(raw)) {
      top = raw;
    } else if (raw && Array.isArray(raw.detections)) {
      top = raw.detections;
    } else if (raw && Array.isArray(raw.results)) {
      top = raw.results;
    } else if (raw && Array.isArray(raw.data)) {
      top = raw.data;
    } else if (raw && raw.detection && Array.isArray(raw.detection)) {
      top = raw.detection;
    } else {
      top = [];
    }
  } catch (_) {
    top = [];
  }
  // 展平 detections[].items 结构为基础项列表
  const baseItems = [];
  for (const det of (top || [])) {
    // 如果 top 是数组，且每个元素有 detections/items 字段，可能需要进一步解包
    // 但根据之前逻辑，这里主要处理 detections[i].items
    // 同时也尝试从 det 这一层提取时间（如果是数组结构，det 就是顶层项）
    const detTime = det.updatedAt || det.timestamp || det.time || det.CreatedAt || det.UpdatedAt || det.created_at || det.updated_at || commonTime;
    
    if (det && Array.isArray(det.items) && det.items.length > 0) {
      for (const it of det.items) {
        baseItems.push({ ...it, _fallbackTime: detTime });
      }
    } else {
      baseItems.push({ ...det, _fallbackTime: detTime });
    }
  }
  // 统一为 { x, y, width, height, type, confidence, updatedAt }
  return baseItems.map((i) => {
    const bbox = i && i.bbox;
    let x = 0, y = 0, width = 0, height = 0;
    if (Array.isArray(bbox)) {
      x = bbox[0]; y = bbox[1]; width = bbox[2]; height = bbox[3];
    } else if (bbox && typeof bbox === 'object') {
      x = bbox.x ?? bbox.left ?? bbox.minX ?? 0;
      y = bbox.y ?? bbox.top ?? bbox.minY ?? 0;
      width = (bbox.width ?? bbox.w ?? ((bbox.right ?? bbox.maxX ?? 0) - (bbox.left ?? bbox.minX ?? 0)));
      height = (bbox.height ?? bbox.h ?? ((bbox.bottom ?? bbox.maxY ?? 0) - (bbox.top ?? bbox.minY ?? 0)));
    } else {
      x = i.x ?? 0; y = i.y ?? 0; width = i.width ?? 0; height = i.height ?? 0;
    }
    const type = i.class ?? i.type ?? i.label ?? i.category ?? '未知类型';
    let confidence = i.confidence ?? i.score ?? i.probability ?? 0;
    if (confidence > 1) confidence = confidence / 100;
    width = Math.max(0, Number(width) || 0);
    height = Math.max(0, Number(height) || 0);
    x = Math.max(0, Number(x) || 0);
    y = Math.max(0, Number(y) || 0);

    // 优先使用 item 自身的时间，其次使用继承的时间
    const updatedAt = i.updatedAt || i.timestamp || i.time || i.CreatedAt || i.UpdatedAt || i.created_at || i.updated_at || i._fallbackTime || null;

    return { x, y, width, height, type, confidence, updatedAt };
  });
};

export default createStore({
  state: {
    inspectionRecords: [],
    currentRecord: null,
    currentImage: null,
    detectionResults: [],
    processedImagePath: null,
    // 场景名称映射：由后端提供 sceneId -> 场景名称 的映射
    sceneNameMap: {},
    // 右侧“检测结果”面板显示控制：默认隐藏，点击“检测结果”后显示
    showResultsPanel: false,
    backendStatus: 'unknown', // 'connected', 'error'
    backendError: null,
    // 任务状态：jobId -> job
    detectJobs: {},
    listActiveTab: 'all',
    // 批量处理模式状态
    isBatchMode: false,
    // 批量选择选中的记录ID集合
    batchSelectedIds: []
  },
  getters: {
    hasBackendError: state => state.backendStatus === 'error',
    isBatchMode: state => state.isBatchMode,
    batchSelectedIds: state => state.batchSelectedIds
  },
  mutations: {
    SET_INSPECTION_RECORDS(state, records) {
      state.inspectionRecords = records;
    },
    SET_CURRENT_RECORD(state, record) {
      state.currentRecord = record;
      if (record) {
        // 设置当前图片，按照后端返回规范拼接完整图片 URL
        // 后端数据示例中的 path 为相对路径：uploads/images/{sceneId}/{filename}
        const baseURL = API_BASE;
        let fullPath = null;
        if (record.path) {
          // 优先使用后端返回的相对路径
          fullPath = baseURL + record.path;
        } else if (record.sceneId && record.filename) {
          // 兼容后端未返回 path 字段的情况，根据 sceneId 与 filename 拼接
          fullPath = `${baseURL}uploads/images/${record.sceneId}/${record.filename}`;
        }
        state.currentImage = {
          id: record.id,
          path: fullPath
        };
        // 清空检测结果
        state.detectionResults = [];
        state.processedImagePath = null;
        // 切换记录时默认隐藏右侧面板，等待用户点击“检测结果”
        state.showResultsPanel = false;
      } else {
        state.currentImage = null;
      }
    },
    SET_DETECTION_RESULTS(state, results) {
      state.detectionResults = results;
      // 用户点击“检测结果”后，无论结果是否为空，都显示右侧面板
      state.showResultsPanel = true;
    },
    SET_BACKEND_STATUS(state, status) {
      state.backendStatus = status;
    },
    SET_BACKEND_ERROR(state, error) {
      state.backendError = error;
    },
    // 设置场景名称映射
    SET_SCENE_NAME_MAP(state, map) {
      // 避免不必要的对象复制：直接赋值即可
      state.sceneNameMap = map || {};
    },
    // 显示/隐藏检测结果面板（备用）
    SET_SHOW_RESULTS_PANEL(state, show) {
      state.showResultsPanel = !!show;
    },
    SET_PROCESSED_IMAGE_PATH(state, path) {
      state.processedImagePath = path || null;
    },
    // 任务状态更新：单个或批量
    SET_DETECT_JOB(state, job) {
      if (!job || !job.ID) return;
      const id = job.ID;
      state.detectJobs = { ...state.detectJobs, [id]: job };
    },
    REMOVE_DETECT_JOB(state, jobId) {
      if (!jobId) return;
      const next = { ...state.detectJobs };
      delete next[jobId];
      state.detectJobs = next;
    },
    UPDATE_RECORD_STATUS(state, { id, status }) {
      if (!id || !status) return;
      const list = Array.isArray(state.inspectionRecords) ? state.inspectionRecords : [];
      state.inspectionRecords = list.map((r) => {
        if (r && r.id === id) {
          return { ...r, status };
        }
        return r;
      });
      if (state.currentRecord && state.currentRecord.id === id) {
        state.currentRecord = { ...state.currentRecord, status };
      }
    }
    ,
    UPDATE_RECORD_FLAGS(state, { id, isDetected, hasIssue }) {
      if (!id) return;
      const list = Array.isArray(state.inspectionRecords) ? state.inspectionRecords : [];
      state.inspectionRecords = list.map((r) => {
        if (r && r.id === id) {
          const next = { ...r };
          if (isDetected !== undefined) next.isDetected = !!isDetected;
          if (hasIssue !== undefined) next.hasIssue = !!hasIssue;
          return next;
        }
        return r;
      });
      if (state.currentRecord && state.currentRecord.id === id) {
        const cur = { ...state.currentRecord };
        if (isDetected !== undefined) cur.isDetected = !!isDetected;
        if (hasIssue !== undefined) cur.hasIssue = !!hasIssue;
        state.currentRecord = cur;
      }
    },
    SET_LIST_ACTIVE_TAB(state, tab) {
      state.listActiveTab = tab || 'all';
    },
    SET_IS_BATCH_MODE(state, isBatch) {
      state.isBatchMode = !!isBatch;
      if (!isBatch) {
        state.batchSelectedIds = [];
      }
    },
    SET_BATCH_SELECTED_IDS(state, ids) {
      state.batchSelectedIds = Array.isArray(ids) ? ids : [];
    },
    TOGGLE_BATCH_SELECTED_ID(state, id) {
      if (!id) return;
      const idx = state.batchSelectedIds.indexOf(id);
      if (idx >= 0) {
        state.batchSelectedIds.splice(idx, 1);
      } else {
        state.batchSelectedIds.push(id);
      }
    }
  },
  actions: {
    loadInspectionRecords({ commit }, records) {
      commit('SET_INSPECTION_RECORDS', records);
    },
    // 获取场景名称映射：兼容两种返回结构
    // 1) { scenes: [{ id: 'hinge', name: '铰链' }, ...] }
    // 2) { map: { hinge: '铰链', ... } } 或直接返回 { hinge: '铰链', ... }
    async fetchSceneNameMap({ commit, dispatch }) {
      try {
        // 确保后端健康：如果之前未检测过，先尝试健康检查，但不强制依赖
        if ((await dispatch('checkBackendHealth')) === false) {
          commit('SET_SCENE_NAME_MAP', {});
          return {};
        }

        const response = await fetch(API_BASE + 'api/scenes');
        const data = await response.json();

        let map = {};
        if (response.ok) {
          if (data && Array.isArray(data.scenes)) {
            // 数组结构：转换为 map
            map = data.scenes.reduce((acc, s) => {
              if (s && (s.id != null) && s.name) {
                acc[String(s.id)] = s.name;
              }
              return acc;
            }, {});
          } else if (data && data.map && typeof data.map === 'object') {
            map = data.map;
          } else if (data && typeof data === 'object') {
            // 直接返回 map 的情况
            map = data;
          }
          commit('SET_SCENE_NAME_MAP', map || {});
          return map || {};
        } else {
          commit('SET_SCENE_NAME_MAP', {});
          return {};
        }
      } catch (error) {
        console.error('获取场景映射失败:', error);
        commit('SET_SCENE_NAME_MAP', {});
        return {};
      }
    },
    // 健康检查接口
    async checkBackendHealth({ commit }) {
      try {
        const response = await fetch(API_BASE + 'ping');
        if (response.ok) {
          commit('SET_BACKEND_STATUS', 'connected');
          commit('SET_BACKEND_ERROR', null);
          return true;
        } else {
          commit('SET_BACKEND_STATUS', 'error');
          commit('SET_BACKEND_ERROR', '后端服务异常');
          return false;
        }
      } catch (error) {
        console.error('健康检查失败:', error);
        commit('SET_BACKEND_STATUS', 'error');
        commit('SET_BACKEND_ERROR', '后端连接失败');
        return false;
      }
    },
    // 获取图片列表
    async fetchImagesFromServer({ commit, dispatch }) {
      try {
        commit('SET_BACKEND_STATUS', 'unknown');
        commit('SET_BACKEND_ERROR', null);
        
        // 先进行健康检查
        const isHealthy = await dispatch('checkBackendHealth');
        if (!isHealthy) {
          commit('SET_INSPECTION_RECORDS', []);
          return [];
        }
        
        const response = await fetch(API_BASE + 'api/images');
        const data = await response.json();
        
        if (response.ok && data.images) {
          commit('SET_INSPECTION_RECORDS', data.images);
          return data.images;
        } else {
          commit('SET_BACKEND_STATUS', 'error');
          commit('SET_BACKEND_ERROR', '获取数据失败');
          commit('SET_INSPECTION_RECORDS', []);
          return [];
        }
      } catch (error) {
        console.error('获取图片列表失败:', error);
        commit('SET_BACKEND_STATUS', 'error');
        commit('SET_BACKEND_ERROR', '后端连接失败');
        commit('SET_INSPECTION_RECORDS', []);
        return [];
      }
    },
    // 使用 /images/filter 根据状态（以及可选的时间范围与 hasIssue）获取筛选后的图片列表
    async fetchImagesByFilter({ commit, dispatch }, { status, start = null, end = null } = {}) {
      try {
        // 后端健康检查：若失败则直接清空并返回
        const isHealthy = await dispatch('checkBackendHealth');
        if (!isHealthy) {
          commit('SET_INSPECTION_RECORDS', []);
          return [];
        }

        // 英文标签到后端中文的映射
        const statusMap = {
          detected: '已检测',
          undetected: '未检测'
        };
        // 如果传入的是中文，则直接使用；否则根据英文 key 转换
        let statusText = status;
        if (status && typeof status === 'string') {
          statusText = statusMap[status] || status; // 允许直接传中文
        }

        // 若未指定状态或选择“全部”，回退到获取所有图片列表
        if (!statusText || statusText === '全部' || status === 'all') {
          return await dispatch('fetchImagesFromServer');
        }

        // 构建查询参数：仅在存在时添加，避免“神秘命名”和冗余参数
        const qs = new URLSearchParams();
        let useFlagsOnly = false;
        if (status === 'qualified' || status === 'exception') {
          // 合格/异常基于 isDetected=true 且 hasIssue 精筛
          qs.set('status', '已检测');
          qs.set('hasIssue', status === 'exception' ? 'true' : 'false');
        } else {
          qs.set('status', statusText);
        }
        if (start) qs.set('start', start);
        if (end) qs.set('end', end);

        // 发起筛选请求：根据后端路由注册，正确路径为 /api/images/filter
        // 说明：后端在 cmd/server/main.go 中通过 api 组注册（api.GET("/images/filter", ...）），实际路径需带上 /api 前缀
        const url = `${API_BASE}api/images/filter?${qs.toString()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
          const images = Array.isArray(data.images) ? data.images : (Array.isArray(data.list) ? data.list : []);
          commit('SET_INSPECTION_RECORDS', images);
          return images;
        } else {
          // 返回非 2xx：认为后端异常
          commit('SET_BACKEND_STATUS', 'error');
          commit('SET_BACKEND_ERROR', data && data.message ? data.message : '筛选接口返回错误');
          commit('SET_INSPECTION_RECORDS', []);
          return [];
        }
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
    // 显示/隐藏右侧面板的 Action（供需要时直接调用）
    setShowResultsPanel({ commit }, show) {
      commit('SET_SHOW_RESULTS_PANEL', show);
    },
    async startYOLOForSelected({ state, dispatch }, { ids = [], config = {} } = {}) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return [];
      }
      const healthy = await dispatch('checkBackendHealth');
      if (!healthy) {
        throw new Error('backend_unhealthy');
      }
      const body = config || {};
      const tasks = ids.map((id) => (async () => {
        try {
          const resp = await fetch(`${API_BASE}api/images/${id}/detect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          let data = {};
          try { data = await resp.json(); } catch (_) {}
          const jobId = (data && (data.jobId || data.id || (data.job && (data.job.id || data.job.jobId)))) || null;
          return { id, ok: resp.ok, jobId };
        } catch (error) {
          return { id, ok: false, error: String(error) };
        }
      })());
      const settled = await Promise.allSettled(tasks);
      return settled.map((r, i) => r.status === 'fulfilled' ? r.value : { id: ids[i], ok: false, error: String(r.reason) });
    },
    async initDetectJobs({ commit }, jobPairs = []) {
      try {
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
      } catch (_) {}
    },
    async subscribeJobs({ commit, dispatch }, jobPairs = []) {
      // jobPairs: [{ id: imageId, jobId, ok }]
      const terminal = new Set(['completed','failed','canceled']);
      for (const pair of (jobPairs || [])) {
        if (!pair || !pair.ok || !pair.jobId) continue;
        const jobId = pair.jobId;
        try {
          const urls = [
            `${API_BASE}api/detect/jobs/${jobId}/stream`,
            `${API_BASE}api/jobs/${jobId}/stream`
          ];
          let es = null;
          const openStream = (idx) => {
            if (idx >= urls.length) { dispatch('pollJobUntilDone', { jobId, imageId: pair.id }); return; }
            try {
              es = new EventSource(urls[idx]);
              es.onmessage = (evt) => {
                try {
                  const json = JSON.parse(evt.data);
                  const job = normalizeJob(json) || { ID: jobId, Status: 'running', Progress: 0, Total: 0, Message: '' };
                  commit('SET_DETECT_JOB', job);
                  if (job && terminal.has(job.Status)) {
                    es.close();
                    if (pair.id) dispatch('fetchDetectionsByImage', { imageId: pair.id });
                  }
                } catch (_) {}
              };
              es.onerror = () => { try { es.close(); } catch (_) {}; openStream(idx + 1); };
            } catch (_) { openStream(idx + 1); }
          };
          openStream(0);
        } catch (_) {
          dispatch('pollJobUntilDone', { jobId, imageId: pair.id });
        }
      }
    },
    async pollJobUntilDone({ commit, dispatch }, { jobId, imageId }) {
      const terminal = new Set(['completed','failed','canceled']);
      const interval = 1200;
      let timer = null;
      const run = async () => {
        try {
          const resp = await fetch(`${API_BASE}api/detect/jobs/${jobId}`);
          const data = await resp.json();
          if (resp.ok && data) {
            const raw = data.job || data;
            let job = normalizeJob(raw);
            if (job && !job.ID) job.ID = jobId;
            if (job) commit('SET_DETECT_JOB', job);
            if (job && terminal.has(job.Status)) {
              clearInterval(timer);
              timer = null;
              if (imageId) {
                dispatch('fetchDetectionsByImage', { imageId });
              }
            }
          } else {
            // 服务器返回错误，停止轮询
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
    async fetchDetectionsByImage({ commit, dispatch }, { imageId }) {
      if (!imageId) return [];
      const healthy = await dispatch('checkBackendHealth');
      if (!healthy) return [];
      try {
        const resp = await fetch(`${API_BASE}api/images/${imageId}/detections`);
        const raw = await resp.json();
        if (resp.ok && raw) {
          let processedUrl = null;
          if (Array.isArray(raw)) {
            processedUrl = raw[0] && raw[0].processedUrl ? raw[0].processedUrl : null;
          } else if (raw && Array.isArray(raw.detections)) {
            processedUrl = raw.detections[0] && raw.detections[0].processedUrl ? raw.detections[0].processedUrl : null;
          }
          if (processedUrl) {
            commit('SET_PROCESSED_IMAGE_PATH', API_BASE + (processedUrl.startsWith('/') ? processedUrl.slice(1) : processedUrl));
          }
          let detArray = [];
          if (Array.isArray(raw)) {
            detArray = raw;
          } else if (raw && Array.isArray(raw.detections)) {
            detArray = raw.detections;
          }
          const isDetectedFlag = detArray.length > 0;
          let hasIssueFlag = false;
          for (const d of detArray) {
            const s = d && d.summary;
            if (s && s.hasIssue === true) { hasIssueFlag = true; break; }
          }
          const list = normalizeDetections(raw);
          if (Array.isArray(list)) {
            commit('SET_DETECTION_RESULTS', list);
            commit('SET_SHOW_RESULTS_PANEL', true);
            
            // 优化合格/异常判定逻辑：
            // 1. 找到最新的一次检测时间（根据 updatedAt/timestamp 等字段）
            // 2. 检查该时间点的所有检测结果中是否存在异常（hasIssue）
            // 3. 如果最新一次检测结果均无异常（例如全是 Bolts），则标记为合格（hasIssue = false）
            
            // 辅助函数：提取时间戳数值
            const getTimeVal = (item) => {
              const t = item.updatedAt || item.timestamp || item.time || item.CreatedAt || item.UpdatedAt || item.created_at || item.updated_at || item._fallbackTime;
              if (!t) return 0;
              return new Date(t).getTime();
            };

            // 找到最新的时间戳
            let maxTime = 0;
            list.forEach(item => {
              const t = getTimeVal(item);
              if (t > maxTime) maxTime = t;
            });

            // 如果没有时间戳信息，默认使用原来的 hasIssueFlag
            // 如果有时间戳，筛选出最新的一批结果进行判断
            let finalHasIssue = hasIssueFlag;
            if (maxTime > 0) {
              // 筛选出属于最新这一批的检测结果（允许 1秒内的误差，防止微小时间差）
              const latestItems = list.filter(item => Math.abs(getTimeVal(item) - maxTime) < 1000);
              
              if (latestItems.length > 0) {
                // 重新判断这些项是否有异常
                // 异常判定规则：类型包含 'hole' 或 confidence >= 0.8 (且不是 bolts) 等
                // 这里复用 DetectionResults 组件里的逻辑思路：
                // Bolts -> 合格, hole -> 异常/复检
                let foundIssue = false;
                for (const item of latestItems) {
                  const type = String(item.type || '').toLowerCase();
                  if (type.includes('hole')) {
                    foundIssue = true;
                    break;
                  }
                  // 如果既不是 bolts 也不是 hole，按置信度兜底？
                  // 用户需求："当最新的检测结果时间戳内没有含有异常，标记为合格"
                  // 这里的“异常”通常指 'hole' 或者高风险项。
                  // 如果是 Bolts，不算异常。
                  if (!type.includes('bolts') && !type.includes('hole')) {
                    // 其他类型，保留原有置信度判断或默认视为潜在异常
                    if ((item.confidence || 0) >= 0.8) {
                      foundIssue = true;
                      break;
                    }
                  }
                }
                finalHasIssue = foundIssue;
              }
            }

            const nextStatus = isDetectedFlag ? '已检测' : '未检测';
            commit('UPDATE_RECORD_FLAGS', { id: imageId, isDetected: isDetectedFlag, hasIssue: finalHasIssue });
            commit('UPDATE_RECORD_STATUS', { id: imageId, status: nextStatus });
            return list;
          }
        }
        return [];
      } catch (e) {
        return [];
      }
    },
    async cancelDetectJob({ commit, dispatch }, { jobId }) {
      if (!jobId) return false;
      try {
        const resp = await fetch(`${API_BASE}api/detect/jobs/${jobId}`, { method: 'DELETE' });
        if (resp.ok) {
          commit('REMOVE_DETECT_JOB', jobId);
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    },
    setListActiveTab({ commit }, tab) {
      commit('SET_LIST_ACTIVE_TAB', tab);
    }
  },
  modules: {
  }
})
