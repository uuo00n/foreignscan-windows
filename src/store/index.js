import { createStore } from 'vuex'

export default createStore({
  state: {
    inspectionRecords: [],
    currentRecord: null,
    currentImage: null,
    detectionResults: [],
    // 场景名称映射：由后端提供 sceneId -> 场景名称 的映射
    sceneNameMap: {},
    // 右侧“检测结果”面板显示控制：默认隐藏，点击“检测结果”后显示
    showResultsPanel: false,
    backendStatus: 'unknown', // 'connected', 'error'
    backendError: null
  },
  getters: {
    hasBackendError: state => state.backendStatus === 'error'
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
        const baseURL = 'http://localhost:3000/';
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

        const response = await fetch('http://localhost:3000/api/scenes');
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
        const response = await fetch('http://localhost:3000/ping');
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
        
        const response = await fetch('http://localhost:3000/api/images');
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
    // 使用 /images/filter 根据状态（以及可选的时间范围）获取筛选后的图片列表
    // 注意：后端接口期望的 status 为中文："合格" | "缺陷" | "未检测"
    // 前端 Tabs 使用的英文 key："qualified" | "defect" | "undetected"，需要做一次映射
    async fetchImagesByFilter({ commit, dispatch }, { status, start = null, end = null } = {}) {
      try {
        // 后端健康检查：若失败则直接清空并返回
        const isHealthy = await dispatch('checkBackendHealth');
        if (!isHealthy) {
          commit('SET_INSPECTION_RECORDS', []);
          return [];
        }

        // 将英文状态 key 映射为后端需要的中文值
        const statusMap = {
          qualified: '合格',
          defect: '缺陷',
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
        qs.set('status', statusText);
        if (start) qs.set('start', start); // 支持 YYYY-MM-DD 或 RFC3339
        if (end) qs.set('end', end);

        // 发起筛选请求：根据后端路由注册，正确路径为 /api/images/filter
        // 说明：后端在 cmd/server/main.go 中通过 api 组注册（api.GET("/images/filter", ...）），实际路径需带上 /api 前缀
        const url = `http://localhost:3000/api/images/filter?${qs.toString()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
          // 兼容返回结构：images 或 list
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
    }
  },
  modules: {
  }
})