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
      // 设置当前图片
      state.currentImage = {
        id: record.id,
        path: require('@/assets/hinge-example.jpg')
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