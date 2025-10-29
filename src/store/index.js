import { createStore } from 'vuex'

export default createStore({
  state: {
    inspectionRecords: [],
    currentRecord: null,
    currentImage: null,
    detectionResults: []
  },
  getters: {
  },
  mutations: {
    SET_INSPECTION_RECORDS(state, records) {
      state.inspectionRecords = records;
    },
    SET_CURRENT_RECORD(state, record) {
      state.currentRecord = record;
      // 设置当前图片，使用服务器图片路径
      state.currentImage = {
        id: record.id,
        path: record.path ? `http://localhost:3000${record.path}` : require('@/assets/hinge-example.jpg')
      };
      // 清空检测结果
      state.detectionResults = [];
    },
    SET_DETECTION_RESULTS(state, results) {
      state.detectionResults = results;
    }
  },
  actions: {
    loadInspectionRecords({ commit }, records) {
      commit('SET_INSPECTION_RECORDS', records);
    },
    async fetchImagesFromServer({ commit }) {
      try {
        const response = await fetch('http://localhost:3000/api/images');
        const data = await response.json();
        if (data.success) {
          commit('SET_INSPECTION_RECORDS', data.images);
          return data.images;
        }
        return [];
      } catch (error) {
        console.error('Error fetching images:', error);
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