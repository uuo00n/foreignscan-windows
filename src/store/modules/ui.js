import { getJson } from '../../services/apiClient';

export const state = () => ({
  showResultsPanel: false,
  backendStatus: 'unknown',
  backendError: null,
  listActiveTab: 'all',
  isBatchMode: false,
  batchSelectedIds: [],
  sidebarCollapsed: false
});

export const getters = {
  hasBackendError: (s) => s.backendStatus === 'error',
  isBatchMode: (s) => s.isBatchMode,
  batchSelectedIds: (s) => s.batchSelectedIds,
  sidebarCollapsed: (s) => s.sidebarCollapsed
};

export const mutations = {
  TOGGLE_SIDEBAR(s) {
    s.sidebarCollapsed = !s.sidebarCollapsed;
  },
  SET_BACKEND_STATUS(s, status) {
    s.backendStatus = status;
  },
  SET_BACKEND_ERROR(s, error) {
    s.backendError = error;
  },
  SET_SHOW_RESULTS_PANEL(s, show) {
    s.showResultsPanel = !!show;
  },
  SET_LIST_ACTIVE_TAB(s, tab) {
    s.listActiveTab = tab || 'all';
  },
  SET_IS_BATCH_MODE(s, isBatch) {
    s.isBatchMode = !!isBatch;
    if (!isBatch) {
      s.batchSelectedIds = [];
    }
  },
  SET_BATCH_SELECTED_IDS(s, ids) {
    s.batchSelectedIds = Array.isArray(ids) ? ids : [];
  },
  TOGGLE_BATCH_SELECTED_ID(s, id) {
    if (!id) return;
    const idx = s.batchSelectedIds.indexOf(id);
    if (idx >= 0) s.batchSelectedIds.splice(idx, 1);
    else s.batchSelectedIds.push(id);
  }
};

export const actions = {
  async checkBackendHealth({ commit }) {
    try {
      const { ok } = await getJson('/ping');
      if (ok) {
        commit('SET_BACKEND_STATUS', 'connected');
        commit('SET_BACKEND_ERROR', null);
        return true;
      }
      commit('SET_BACKEND_STATUS', 'error');
      commit('SET_BACKEND_ERROR', '后端服务异常');
      return false;
    } catch (error) {
      console.error('健康检查失败:', error);
      commit('SET_BACKEND_STATUS', 'error');
      commit('SET_BACKEND_ERROR', '后端连接失败');
      return false;
    }
  },
  setListActiveTab({ commit }, tab) {
    commit('SET_LIST_ACTIVE_TAB', tab);
  }
};
