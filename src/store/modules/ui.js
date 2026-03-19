import { getJson } from '../../services/apiClient';

const DETECT_PAD_CREDENTIALS_KEY = 'detect_pad_credentials_v1';

const loadCredentialsFromStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(DETECT_PAD_CREDENTIALS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch (_) {
    return {};
  }
};

const saveCredentialsToStorage = (map) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(DETECT_PAD_CREDENTIALS_KEY, JSON.stringify(map || {}));
  } catch (_) {
    // ignore storage failures
  }
};

export const state = () => ({
  showResultsPanel: false,
  backendStatus: 'unknown',
  backendError: null,
  listActiveTab: 'all',
  isBatchMode: false,
  batchSelectedIds: [],
  sidebarCollapsed: false,
  detectPadCredentials: loadCredentialsFromStorage()
});

export const getters = {
  hasBackendError: (s) => s.backendStatus === 'error',
  isBatchMode: (s) => s.isBatchMode,
  batchSelectedIds: (s) => s.batchSelectedIds,
  sidebarCollapsed: (s) => s.sidebarCollapsed,
  detectPadCredentials: (s) => s.detectPadCredentials || {}
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
  },
  SET_DETECT_PAD_CREDENTIALS(s, map) {
    s.detectPadCredentials = map && typeof map === 'object' ? map : {};
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
  loadDetectPadCredentials({ commit }) {
    const map = loadCredentialsFromStorage();
    commit('SET_DETECT_PAD_CREDENTIALS', map);
    return map;
  },
  saveDetectPadCredentials({ commit }, map) {
    const payload = map && typeof map === 'object' ? map : {};
    commit('SET_DETECT_PAD_CREDENTIALS', payload);
    saveCredentialsToStorage(payload);
    return payload;
  },
  setListActiveTab({ commit }, tab) {
    commit('SET_LIST_ACTIVE_TAB', tab);
  }
};
