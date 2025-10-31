import { createStore } from 'vuex'

export default createStore({
  state: {
    inspectionRecords: [],
    currentRecord: null,
    currentImage: null,
    detectionResults: [],
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
        // 设置当前图片，使用服务器图片路径
        state.currentImage = {
          id: record.id,
          path: record.filename ? `http://localhost:3000/uploads/${record.filename}` : null
        };
        // 清空检测结果
        state.detectionResults = [];
      } else {
        state.currentImage = null;
      }
    },
    SET_DETECTION_RESULTS(state, results) {
      state.detectionResults = results;
    },
    SET_BACKEND_STATUS(state, status) {
      state.backendStatus = status;
    },
    SET_BACKEND_ERROR(state, error) {
      state.backendError = error;
    }
  },
  actions: {
    loadInspectionRecords({ commit }, records) {
      commit('SET_INSPECTION_RECORDS', records);
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
    setCurrentRecord({ commit }, record) {
      commit('SET_CURRENT_RECORD', record);
    },
    setDetectionResults({ commit }, results) {
      commit('SET_DETECTION_RESULTS', results);
    }
  },
  modules: {
  }
})