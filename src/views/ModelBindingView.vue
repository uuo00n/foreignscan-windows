<template>
  <div class="model-binding-container">
    <div class="content-layout">
      <RoomListPanel
        :rooms="roomsTree"
        :value="selectedRoomId"
        v-model:sortOrder="roomSortOrder"
        :show-pad="false"
        title="房间列表"
        @change="handleRoomChange"
      />

      <section class="binding-panel">
        <div class="binding-header">
          <div class="title">模型绑定</div>
          <t-button variant="text" theme="primary" @click="loadData">刷新</t-button>
        </div>

        <t-loading :loading="loading || saving">
          <div v-if="selectedRoom" class="binding-body">
            <t-alert theme="info" :message="roomHintText" />

            <div class="path-section">
              <div class="label">当前房间模型路径</div>
              <t-input :value="currentModelPath" readonly placeholder="当前未绑定模型" />
            </div>

            <div class="path-section">
              <div class="label">待绑定模型路径</div>
              <t-input v-model="modelPathDraft" readonly placeholder="请选择 .pt 模型文件" />
            </div>

            <div class="actions">
              <t-button variant="outline" @click="pickModelFile">选择 .pt 文件</t-button>
              <t-button theme="primary" :disabled="!modelPathDraft" @click="saveBinding">绑定到当前房间</t-button>
              <t-button theme="warning" variant="outline" :disabled="!currentModelPath" @click="unbindBinding">解绑</t-button>
            </div>
          </div>

          <div v-else class="binding-empty">
            <t-empty description="暂无可绑定房间" />
          </div>
        </t-loading>
      </section>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import RoomListPanel from '../components/RoomListPanel.vue';

export default {
  name: 'ModelBindingView',
  components: {
    RoomListPanel
  },
  setup() {
    const store = useStore();
    const loading = ref(false);
    const saving = ref(false);
    const selectedRoomId = ref('');
    const roomSortOrder = ref('asc');
    const modelPathDraft = ref('');
    const lastRoomModelErrorKey = ref('');

    const roomsTree = computed(() => store.getters.roomsTree || []);
    const roomModelMap = computed(() => store.getters.roomModelMap || {});
    const roomModelApiError = computed(() => store.getters.roomModelApiError || null);
    const selectedRoom = computed(() => {
      return roomsTree.value.find((room) => String(room.id || '') === String(selectedRoomId.value || '')) || null;
    });
    const currentModelPath = computed(() => {
      const rid = String(selectedRoomId.value || '').trim();
      if (!rid) return '';
      return String(roomModelMap.value[rid] || '');
    });
    const roomHintText = computed(() => {
      if (!selectedRoom.value) return '请先选择房间。';
      const roomName = selectedRoom.value.name || selectedRoom.value.id;
      if (currentModelPath.value) {
        return `房间“${roomName}”已绑定模型。`;
      }
      return `房间“${roomName}”当前未绑定模型。`;
    });

    const syncSelection = () => {
      const rooms = Array.isArray(roomsTree.value) ? roomsTree.value : [];
      if (rooms.length === 0) {
        selectedRoomId.value = '';
        return;
      }
      const exists = rooms.some((room) => String(room.id || '') === String(selectedRoomId.value || ''));
      if (!exists) {
        selectedRoomId.value = String(rooms[0].id || '');
      }
    };

    const roomDisplayName = (roomId) => {
      const rid = String(roomId || '').trim();
      const room = (roomsTree.value || []).find((item) => String(item.id || '') === rid);
      return (room && (room.name || room.id)) || rid || '-';
    };

    const loadData = async () => {
      loading.value = true;
      try {
        await Promise.all([
          store.dispatch('fetchRoomsTree'),
          store.dispatch('fetchRoomModels')
        ]);
        syncSelection();
        const error = roomModelApiError.value;
        if (!error) {
          lastRoomModelErrorKey.value = '';
          return;
        }
        const errKey = `${error.status || 0}:${String(error.message || '')}`;
        if (lastRoomModelErrorKey.value === errKey) return;
        lastRoomModelErrorKey.value = errKey;
        if (error.status === 404) {
          MessagePlugin.warning('后端当前版本不支持 /api/room-models，请重启或重建 foreignscan-backend 后重试。');
          return;
        }
        MessagePlugin.error(error.message || '获取房间模型映射失败');
      } finally {
        loading.value = false;
      }
    };

    const handleRoomChange = (value) => {
      selectedRoomId.value = String(value || '');
    };

    const pickModelFile = async () => {
      if (!window.electronAPI || typeof window.electronAPI.pickModelFile !== 'function') {
        MessagePlugin.error('当前运行环境不支持文件选择器');
        return;
      }
      try {
        const result = await window.electronAPI.pickModelFile();
        if (!result || result.canceled) return;
        const selected = String(result.path || '').trim();
        if (!selected) return;
        modelPathDraft.value = selected;
      } catch (error) {
        MessagePlugin.error(error?.message || '打开文件选择器失败');
      }
    };

    const saveBinding = async () => {
      const rid = String(selectedRoomId.value || '').trim();
      const modelPath = String(modelPathDraft.value || '').trim();
      if (!rid) {
        MessagePlugin.warning('请先选择房间');
        return;
      }
      if (!modelPath) {
        MessagePlugin.warning('请先选择模型文件');
        return;
      }

      saving.value = true;
      try {
        const res = await store.dispatch('bindRoomModel', { roomId: rid, modelPath });
        if (res && res.success) {
          MessagePlugin.success('模型绑定成功');
          modelPathDraft.value = currentModelPath.value || modelPath;
          return;
        }
        if (res && res.status === 409) {
          const detail = res.data && res.data.detail ? res.data.detail : {};
          const conflictRoomName = roomDisplayName(detail.conflictRoomId);
          MessagePlugin.error(`绑定冲突：模型已被房间“${conflictRoomName}”占用`);
          return;
        }
        MessagePlugin.error((res && res.message) || '模型绑定失败');
      } finally {
        saving.value = false;
      }
    };

    const unbindBinding = async () => {
      const rid = String(selectedRoomId.value || '').trim();
      if (!rid) {
        MessagePlugin.warning('请先选择房间');
        return;
      }
      const dialog = DialogPlugin.confirm({
        header: '确认解绑模型',
        body: `将解绑房间“${roomDisplayName(rid)}”当前模型，是否继续？`,
        theme: 'warning',
        confirmBtn: '解绑',
        cancelBtn: '取消',
        onConfirm: async () => {
          dialog.hide();
          dialog.destroy();
          saving.value = true;
          try {
            const res = await store.dispatch('unbindRoomModel', { roomId: rid });
            if (res && res.success) {
              MessagePlugin.success('模型已解绑');
              modelPathDraft.value = '';
              return;
            }
            MessagePlugin.error((res && res.message) || '解绑失败');
          } finally {
            saving.value = false;
          }
        },
        onClose: () => {
          dialog.destroy();
        }
      });
    };

    watch(currentModelPath, (next) => {
      modelPathDraft.value = String(next || '');
    }, { immediate: true });

    onMounted(async () => {
      await loadData();
    });

    return {
      loading,
      saving,
      roomsTree,
      selectedRoomId,
      roomSortOrder,
      selectedRoom,
      currentModelPath,
      modelPathDraft,
      roomHintText,
      loadData,
      handleRoomChange,
      pickModelFile,
      saveBinding,
      unbindBinding
    };
  }
};
</script>

<style scoped>
.model-binding-container {
  padding: 16px;
  background: var(--td-bg-color-page);
  height: 100%;
  overflow: auto;
}

.content-layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  min-height: calc(100vh - 160px);
}

.binding-panel {
  border: 1px solid var(--td-component-stroke);
  border-radius: 8px;
  background: var(--td-bg-color-container);
  padding: 16px;
}

.binding-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.title {
  font-size: 16px;
  font-weight: 600;
}

.binding-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.path-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.binding-empty {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1024px) {
  .content-layout {
    grid-template-columns: 1fr;
  }
}
</style>
