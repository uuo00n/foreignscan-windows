import { deleteJson, getJson, postForm, postJson } from '../../services/apiClient';

const asArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const k of keys) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
};

export const state = () => ({
  sceneNameMap: {},
  scenes: [],
  activeSceneId: null,
  currentSceneLatestInfo: null
});

export const getters = {
  scenes: (s) => s.scenes
};

export const mutations = {
  SET_SCENES(s, scenes) {
    s.scenes = scenes;
  },
  ADD_SCENE(s, scene) {
    s.scenes.push(scene);
  },
  SET_SCENE_NAME_MAP(s, map) {
    s.sceneNameMap = map || {};
  },
  SET_CURRENT_SCENE_LATEST_INFO(s, info) {
    s.currentSceneLatestInfo = info || null;
  }
};

export const actions = {
  async fetchStyleImages() {
    try {
      const { ok, data } = await getJson('/api/style-images');
      if (!ok) return [];
      return asArray(data, ['styleImages', 'images']);
    } catch (error) {
      console.error('获取样式图片失败:', error);
      return [];
    }
  },

  async fetchStyleImagesByScene(_, sceneId) {
    try {
      if (!sceneId) return [];
      const { ok, data } = await getJson(`/api/style-images/scene/${sceneId}`);
      if (ok && data && data.success && Array.isArray(data.styleImages)) {
        return data.styleImages;
      }
      return [];
    } catch (error) {
      console.error(`获取场景[${sceneId}]样式图片失败:`, error);
      return [];
    }
  },

  async fetchSceneNameMap({ commit, dispatch }) {
    try {
      const healthy = await dispatch('checkBackendHealth');
      if (!healthy) {
        commit('SET_SCENE_NAME_MAP', {});
        commit('SET_SCENES', []);
        return {};
      }

      const { ok, data } = await getJson('/api/scenes');
      let map = {};
      let scenesList = [];

      if (ok) {
        if (data && Array.isArray(data.scenes)) {
          scenesList = data.scenes;
          map = data.scenes.reduce((acc, s) => {
            if (s && s.id != null && s.name) {
              acc[String(s.id)] = s.name;
            }
            return acc;
          }, {});
        } else if (data && data.map && typeof data.map === 'object') {
          map = data.map;
          scenesList = Object.keys(map).map((k) => ({ id: k, name: map[k] }));
        } else if (data && typeof data === 'object') {
          map = data;
          scenesList = Object.keys(map).map((k) => ({ id: k, name: map[k] }));
        }
      }

      commit('SET_SCENE_NAME_MAP', map || {});
      commit('SET_SCENES', scenesList || []);
      return map || {};
    } catch (error) {
      console.error('获取场景映射失败:', error);
      commit('SET_SCENE_NAME_MAP', {});
      commit('SET_SCENES', []);
      return {};
    }
  },

  async addScene(_, sceneData) {
    try {
      const { ok, data } = await postJson('/api/scenes', sceneData);
      if (ok) return { success: true, data };
      return { success: false, message: (data && data.message) || '添加场景失败' };
    } catch (error) {
      console.error('添加场景失败:', error);
      return { success: false, message: error.message };
    }
  },

  async deleteScene(_, sceneId) {
    try {
      const { ok, status, data } = await deleteJson(`/api/scenes/${sceneId}`);
      if (ok || status === 204) return { success: true, data };
      return { success: false, message: (data && data.message) || `删除场景失败 (${status})` };
    } catch (error) {
      console.error('删除场景失败:', error);
      return { success: false, message: error.message };
    }
  },

  async batchDeleteScenes({ dispatch }, sceneIds) {
    if (!Array.isArray(sceneIds) || sceneIds.length === 0) {
      return { success: true, count: 0 };
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    const promises = sceneIds.map((id) => dispatch('deleteScene', id));
    const results = await Promise.all(promises);
    results.forEach((result) => {
      if (result.success) successCount += 1;
      else {
        failCount += 1;
        errors.push(result.message);
      }
    });

    return {
      success: failCount === 0,
      successCount,
      failCount,
      errors
    };
  },

  async uploadImage(_, { file, sceneId }) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (sceneId) formData.append('sceneId', sceneId);
      const { ok, data } = await postForm('/api/style-images', formData);
      if (ok) return { success: true, data };
      return { success: false, message: (data && data.message) || '上传失败' };
    } catch (error) {
      console.error('上传图片失败:', error);
      return { success: false, message: error.message };
    }
  },

  async fetchSceneImages(_, sceneId) {
    try {
      const qs = new URLSearchParams();
      if (sceneId) qs.set('sceneId', sceneId);
      const { ok, data } = await getJson(`/api/images/filter?${qs.toString()}`);
      if (!ok) return [];
      return asArray(data, ['images', 'list']);
    } catch (error) {
      console.error('获取场景图片失败', error);
      return [];
    }
  },

  async fetchSceneLatestInfo({ commit }, sceneId) {
    if (!sceneId) {
      commit('SET_CURRENT_SCENE_LATEST_INFO', null);
      return null;
    }
    try {
      const { ok, data } = await getJson(`/api/scenes/${sceneId}`);
      if (ok && data && data.success) {
        commit('SET_CURRENT_SCENE_LATEST_INFO', data);
        return data;
      }
      commit('SET_CURRENT_SCENE_LATEST_INFO', null);
      return null;
    } catch (e) {
      console.error('获取场景详情失败:', e);
      commit('SET_CURRENT_SCENE_LATEST_INFO', null);
      return null;
    }
  }
};
