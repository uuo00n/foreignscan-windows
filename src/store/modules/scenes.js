import { getJson, postForm, postJson } from '../../services/apiClient';

const asArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const k of keys) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
};

const normalizeRooms = (data) => {
  const rooms = asArray(data, ['rooms']);
  return rooms.map((room) => ({
    ...room,
    points: Array.isArray(room.points) ? room.points : []
  }));
};

export const state = () => ({
  sceneNameMap: {}, // pointId -> "房间 / 点位"（保留字段名兼容现有组件）
  scenes: [], // 点位扁平列表（保留字段名兼容现有组件）
  roomsTree: [],
  roomNameMap: {},
  pointsByRoom: {},
  activeSceneId: null,
  currentSceneLatestInfo: null
});

export const getters = {
  scenes: (s) => s.scenes,
  roomsTree: (s) => s.roomsTree,
  pointsByRoom: (s) => s.pointsByRoom,
  roomNameMap: (s) => s.roomNameMap
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
  SET_ROOMS_TREE(s, rooms) {
    s.roomsTree = rooms || [];
  },
  SET_ROOM_NAME_MAP(s, map) {
    s.roomNameMap = map || {};
  },
  SET_POINTS_BY_ROOM(s, map) {
    s.pointsByRoom = map || {};
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

  async fetchStyleImagesByScene(_, pointId) {
    try {
      if (!pointId) return [];
      const { ok, status, data } = await getJson(`/api/style-images/point/${pointId}`);
      if (ok && data && data.success && data.styleImage) {
        return [data.styleImage];
      }
      if (status === 404) return [];
      return [];
    } catch (error) {
      console.error(`获取点位[${pointId}]样式图片失败:`, error);
      return [];
    }
  },

  async fetchRoomsTree({ commit, dispatch }) {
    try {
      const healthy = await dispatch('checkBackendHealth');
      if (!healthy) {
        commit('SET_SCENE_NAME_MAP', {});
        commit('SET_SCENES', []);
        commit('SET_ROOMS_TREE', []);
        commit('SET_ROOM_NAME_MAP', {});
        commit('SET_POINTS_BY_ROOM', {});
        return [];
      }

      const { ok, data } = await getJson('/api/rooms/tree');
      if (!ok) {
        commit('SET_SCENE_NAME_MAP', {});
        commit('SET_SCENES', []);
        commit('SET_ROOMS_TREE', []);
        commit('SET_ROOM_NAME_MAP', {});
        commit('SET_POINTS_BY_ROOM', {});
        return [];
      }

      const rooms = normalizeRooms(data);
      const roomNameMap = {};
      const pointsByRoom = {};
      const sceneNameMap = {};
      const flatPoints = [];

      rooms.forEach((room) => {
        const rid = String(room.id || '');
        if (!rid) return;
        roomNameMap[rid] = room.name || rid;
        pointsByRoom[rid] = [];

        (room.points || []).forEach((point) => {
          const pid = String(point.id || '');
          if (!pid) return;
          const pointName = point.name || pid;
          const display = `${room.name || rid} / ${pointName}`;
          sceneNameMap[pid] = display;
          const item = {
            id: pid,
            name: pointName,
            roomId: rid,
            roomName: room.name || rid,
            hasStyleImage: point.hasStyleImage === true,
            styleImageId: point.styleImageId || null,
            styleImagePath: point.styleImagePath || null,
            display
          };
          pointsByRoom[rid].push(item);
          flatPoints.push(item);
        });
      });

      commit('SET_SCENE_NAME_MAP', sceneNameMap);
      commit('SET_SCENES', flatPoints);
      commit('SET_ROOMS_TREE', rooms);
      commit('SET_ROOM_NAME_MAP', roomNameMap);
      commit('SET_POINTS_BY_ROOM', pointsByRoom);
      return rooms;
    } catch (error) {
      console.error('获取房间点位树失败:', error);
      commit('SET_SCENE_NAME_MAP', {});
      commit('SET_SCENES', []);
      commit('SET_ROOMS_TREE', []);
      commit('SET_ROOM_NAME_MAP', {});
      commit('SET_POINTS_BY_ROOM', {});
      return [];
    }
  },

  async fetchSceneNameMap({ dispatch, state }) {
    await dispatch('fetchRoomsTree');
    return state.sceneNameMap || {};
  },

  async addScene() {
    return { success: false, message: '当前版本不支持在客户端新增房间，请使用配置导入接口' };
  },

  async deleteScene() {
    return { success: false, message: '当前版本不支持在前端直接删除房间/点位，请使用导入重建' };
  },

  async batchDeleteScenes() {
    return { success: false, message: '当前版本不支持批量删除，请使用导入重建' };
  },

  async importRoomsConfig({ dispatch }, payload) {
    try {
      const { ok, data } = await postJson('/api/rooms/import', payload || {});
      if (!ok || !data || data.success === false) {
        return {
          success: false,
          message: (data && data.message) || '导入失败'
        };
      }
      await dispatch('fetchRoomsTree');
      return { success: true, data };
    } catch (error) {
      console.error('导入房间点位配置失败:', error);
      return { success: false, message: error.message || '导入失败' };
    }
  },

  async uploadImage(_, { file, pointId }) {
    try {
      if (!pointId) return { success: false, message: '缺少 pointId' };
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pointId', pointId);
      const { ok, data } = await postForm('/api/style-images', formData);
      if (ok) return { success: true, data };
      return { success: false, message: (data && data.message) || '上传失败' };
    } catch (error) {
      console.error('上传图片失败:', error);
      return { success: false, message: error.message };
    }
  },

  async fetchSceneImages(_, pointId) {
    try {
      const qs = new URLSearchParams();
      if (pointId) qs.set('pointId', pointId);
      const { ok, data } = await getJson(`/api/images/filter?${qs.toString()}`);
      if (!ok) return [];
      return asArray(data, ['images', 'list']);
    } catch (error) {
      console.error('获取点位图片失败', error);
      return [];
    }
  },

  async fetchSceneLatestInfo({ commit }, pointId) {
    if (!pointId) {
      commit('SET_CURRENT_SCENE_LATEST_INFO', null);
      return null;
    }
    try {
      const qs = new URLSearchParams();
      qs.set('pointId', pointId);
      const { ok, data } = await getJson(`/api/images/filter?${qs.toString()}`);
      if (!ok || !data || !Array.isArray(data.images)) {
        commit('SET_CURRENT_SCENE_LATEST_INFO', null);
        return null;
      }
      const latest = data.images[0] || null;
      if (!latest) {
        commit('SET_CURRENT_SCENE_LATEST_INFO', null);
        return null;
      }
      const info = {
        latestImage: latest,
        latestStatus: latest.status || 'none',
        hasIssue: latest.hasIssue === true
      };
      commit('SET_CURRENT_SCENE_LATEST_INFO', info);
      return info;
    } catch (e) {
      console.error('获取点位详情失败:', e);
      commit('SET_CURRENT_SCENE_LATEST_INFO', null);
      return null;
    }
  }
};
