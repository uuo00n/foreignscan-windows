<template>
  <div class="pad-binding-container">
    <div class="content-layout">
      <RoomListPanel
        :rooms="roomsTree"
        :value="selectedRoomId"
        v-model:sortOrder="roomSortOrder"
        @change="handleRoomChange"
      />

      <section class="binding-panel">
        <div class="binding-header">
          <div class="header-main">
            <div class="title">房间设备绑定</div>
            <div class="meta" v-if="selectedRoom">当前房间：{{ selectedRoom.name || selectedRoom.id }}</div>
          </div>
          <div class="header-actions">
            <t-button variant="text" theme="primary" @click="openGuideDialog">
              使用说明
            </t-button>
          </div>
        </div>

        <t-loading :loading="loadingRooms || generating">
          <div v-if="selectedRoom" class="binding-body">
            <t-alert theme="info" title="当前状态" :message="roomHintText" />
            <div class="key-actions">
              <t-button theme="primary" :loading="generating" @click="generateBindingKey">
                生成绑定码
              </t-button>
              <t-button
                variant="outline"
                :disabled="!currentBindKey"
                @click="copyBindKey"
              >
                复制绑定码
              </t-button>
            </div>

            <t-card v-if="currentBindKey" class="key-card" :bordered="true">
              <div class="key-row">
                <div class="label">绑定码</div>
                <t-input :value="currentBindKey" readonly />
              </div>
              <div class="key-meta">
                <span>过期时间：{{ expiresAtText }}</span>
                <span :class="['countdown', isExpired ? 'expired' : 'valid']">
                  {{ countdownText }}
                </span>
              </div>
            </t-card>

            <div v-else class="key-empty">
              <t-empty description="尚未生成绑定码" />
            </div>
          </div>

          <div v-else class="binding-empty">
            <t-empty description="暂无可绑定房间" />
          </div>
        </t-loading>
      </section>
    </div>

    <t-dialog
      v-model:visible="guideDialogVisible"
      header="使用说明与绑定流程"
      width="640px"
      placement="center"
      attach="body"
      :show-in-attached-element="false"
      :draggable="false"
      :close-on-overlay-click="true"
      destroy-on-close
    >
      <div class="guide-dialog-body">
        <t-alert
          theme="info"
          title="绑定说明"
          message="绑定码由 Windows 端按房间生成，设备输入绑定码后完成绑定。绑定码 10 分钟内有效，且仅可使用一次。"
        />
        <t-steps
          class="guide-steps"
          layout="vertical"
          :readonly="true"
          :current="guideCurrent"
          :options="guideSteps"
        />
        <t-card class="guide-card" :bordered="true">
          <p>1. 重新生成绑定码会使同房间旧绑定码立即失效。</p>
          <p>2. 请在有效期内完成设备端输入，过期后需重新生成。</p>
          <p>3. 完成绑定后，可在“当前已绑定设备”处查看房间绑定状态。</p>
        </t-card>
      </div>
      <template #footer>
        <t-button theme="primary" @click="guideDialogVisible = false">我知道了</t-button>
      </template>
    </t-dialog>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import RoomListPanel from '../components/RoomListPanel.vue';

export default {
  name: 'PadBindingView',
  components: {
    RoomListPanel
  },
  setup() {
    const store = useStore();

    const loadingRooms = ref(false);
    const generating = ref(false);
    const guideDialogVisible = ref(false);
    const selectedRoomId = ref('');
    const roomSortOrder = ref('asc');
    const bindKey = ref('');
    const expiresAt = ref('');
    const nowTs = ref(Date.now());
    let timer = null;

    const roomsTree = computed(() => store.getters.roomsTree || []);
    const detectPadCredentials = computed(() => store.getters.detectPadCredentials || {});
    const padBindingPreviewByRoom = computed(() => store.getters.padBindingPreviewByRoom || {});
    const selectedRoom = computed(() => {
      return roomsTree.value.find((item) => String(item.id || '') === String(selectedRoomId.value || '')) || null;
    });

    const roomHintText = computed(() => {
      if (!selectedRoom.value) return '请先选择房间。';
      const padId = String(selectedRoom.value.padId || '').trim();
      const lastSeen = selectedRoom.value.padLastSeenAt ? new Date(selectedRoom.value.padLastSeenAt) : null;
      const lastSeenText = lastSeen && !Number.isNaN(lastSeen.getTime())
        ? `，最后在线：${lastSeen.toLocaleString()}`
        : '';
      return padId ? `当前已绑定设备：${padId}${lastSeenText}` : '当前房间尚未绑定设备。';
    });

    const expiresAtTs = computed(() => {
      const raw = String(expiresAt.value || '').trim();
      if (!raw) return 0;
      const ts = new Date(raw).getTime();
      return Number.isNaN(ts) ? 0 : ts;
    });
    const isExpired = computed(() => {
      if (!currentBindKey.value) return false;
      if (!expiresAtTs.value) return false;
      return nowTs.value >= expiresAtTs.value;
    });
    const countdownText = computed(() => {
      if (!currentBindKey.value) return '';
      if (!expiresAtTs.value) return '有效期未知';
      const remain = Math.max(0, Math.floor((expiresAtTs.value - nowTs.value) / 1000));
      if (remain === 0) return '已过期';
      const min = Math.floor(remain / 60);
      const sec = remain % 60;
      return `剩余 ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    });
    const expiresAtText = computed(() => {
      if (!expiresAtTs.value) return '-';
      return new Date(expiresAtTs.value).toLocaleString();
    });
    const currentBindKey = computed(() => {
      if (!selectedRoom.value) return '';
      return bindKey.value;
    });
    const guideCurrent = computed(() => 1);
    const guideSteps = computed(() => ([
      { value: 0, title: '选择房间', content: '在左侧房间列表选择目标房间。' },
      { value: 1, title: '生成绑定码', content: '点击“生成绑定码”，获取该房间一次性绑定码。' },
      { value: 2, title: '设备输入绑定码', content: '在设备端配置页面输入绑定码完成绑定。' },
      { value: 3, title: '验证结果', content: '回到 Windows 查看“当前已绑定设备”和在线信息。' }
    ]));

    const syncSelection = () => {
      const rooms = Array.isArray(roomsTree.value) ? roomsTree.value : [];
      if (rooms.length === 0) {
        selectedRoomId.value = '';
        return;
      }
      const exists = rooms.some((room) => String(room.id || '') === String(selectedRoomId.value || ''));
      if (!exists) selectedRoomId.value = String(rooms[0].id || '');
    };

    const parseExpiresTs = (raw) => {
      const value = String(raw || '').trim();
      if (!value) return 0;
      const ts = new Date(value).getTime();
      return Number.isNaN(ts) ? 0 : ts;
    };

    const clearCurrentKey = () => {
      bindKey.value = '';
      expiresAt.value = '';
    };

    const restoreKeyForRoom = async (roomId) => {
      const rid = String(roomId || '').trim();
      if (!rid) {
        clearCurrentKey();
        return;
      }
      const preview = padBindingPreviewByRoom.value && padBindingPreviewByRoom.value[rid]
        ? padBindingPreviewByRoom.value[rid]
        : null;
      if (!preview) {
        clearCurrentKey();
        return;
      }
      const expiresRaw = String(preview.expiresAt || '').trim();
      const expiresTs = parseExpiresTs(expiresRaw);
      if (!expiresTs || expiresTs <= nowTs.value) {
        await store.dispatch('clearPadBindingPreview', { roomId: rid });
        clearCurrentKey();
        return;
      }
      bindKey.value = String(preview.bindKey || '');
      expiresAt.value = expiresRaw;
    };

    const updateCredentialsForRoom = async (roomId, padKey) => {
      const rid = String(roomId || '').trim();
      if (!rid || !padKey) return;
      const next = { ...(detectPadCredentials.value || {}) };
      next[rid] = {
        ...(next[rid] || {}),
        padKey: String(padKey)
      };
      await store.dispatch('saveDetectPadCredentials', next);
    };

    const loadRooms = async () => {
      loadingRooms.value = true;
      try {
        await store.dispatch('loadPadBindingPreview');
        await store.dispatch('fetchRoomsTree');
        syncSelection();
        await restoreKeyForRoom(selectedRoomId.value);
      } finally {
        loadingRooms.value = false;
      }
    };

    const handleRoomChange = async (value) => {
      selectedRoomId.value = String(value || '');
      await restoreKeyForRoom(selectedRoomId.value);
    };

    const openGuideDialog = () => {
      guideDialogVisible.value = true;
    };

    const generateBindingKey = async () => {
      if (!selectedRoom.value) {
        MessagePlugin.error('请选择房间');
        return;
      }
      const roomId = String(selectedRoom.value.id || '').trim();
      const roomName = selectedRoom.value.name || roomId;
      const dialog = DialogPlugin.confirm({
        header: '确认生成绑定码',
        body: `将为房间“${roomName}”生成新绑定码，旧的未使用绑定码将立即失效。是否继续？`,
        theme: 'warning',
        confirmBtn: '继续',
        cancelBtn: '取消',
        onConfirm: async () => {
          dialog.hide();
          dialog.destroy();
          generating.value = true;
          const loadingMsg = MessagePlugin.loading({ content: '正在生成绑定码...', duration: 0 });
          try {
            const res = await store.dispatch('createRoomPadBindingKey', { roomId });
            if (!res || !res.success) {
              MessagePlugin.error(res?.message || '生成绑定码失败');
              return;
            }
            const payload = res.data?.bindingKey || {};
            bindKey.value = String(payload.bindKey || '');
            expiresAt.value = String(payload.expiresAt || '');
            nowTs.value = Date.now();

            if (bindKey.value) {
              await updateCredentialsForRoom(roomId, bindKey.value);
              await store.dispatch('savePadBindingPreview', {
                roomId,
                bindKey: bindKey.value,
                expiresAt: expiresAt.value
              });
            }

            MessagePlugin.success('绑定码已生成并已同步到本机检测凭据');
          } finally {
            generating.value = false;
            MessagePlugin.close(loadingMsg);
          }
        },
        onClose: () => {
          dialog.destroy();
        }
      });
    };

    const copyBindKey = async () => {
      const text = String(currentBindKey.value || '').trim();
      if (!text) {
        MessagePlugin.warning('暂无可复制的绑定码');
        return;
      }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        MessagePlugin.success('绑定码已复制');
      } catch (_) {
        MessagePlugin.error('复制失败，请手动复制');
      }
    };

    onMounted(async () => {
      await loadRooms();
      timer = window.setInterval(() => {
        nowTs.value = Date.now();
      }, 1000);
    });

    onBeforeUnmount(() => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    });

    watch(roomsTree, async () => {
      syncSelection();
      await restoreKeyForRoom(selectedRoomId.value);
    });

    watch(nowTs, async () => {
      const rid = String(selectedRoomId.value || '').trim();
      if (!rid) return;
      const expTs = parseExpiresTs(expiresAt.value);
      if (!expTs) return;
      if (nowTs.value < expTs) return;
      await store.dispatch('clearPadBindingPreview', { roomId: rid });
      clearCurrentKey();
    });

    return {
      loadingRooms,
      generating,
      guideDialogVisible,
      selectedRoomId,
      roomSortOrder,
      roomsTree,
      selectedRoom,
      roomHintText,
      currentBindKey,
      expiresAtText,
      countdownText,
      isExpired,
      guideCurrent,
      guideSteps,
      handleRoomChange,
      openGuideDialog,
      generateBindingKey,
      copyBindKey
    };
  }
};
</script>

<style scoped>
.pad-binding-container {
  padding: 24px;
  height: 100%;
  overflow: hidden;
  background-color: var(--td-bg-color-page);
}

.content-layout {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: clamp(220px, 22vw, 280px) minmax(0, 1fr);
  gap: 16px;
}

.binding-panel {
  border: 1px solid var(--td-component-stroke);
  border-radius: 8px;
  background: var(--td-bg-color-container);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.binding-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--td-component-stroke);
}

.header-main {
  min-width: 0;
}

.binding-header .title {
  font-size: 14px;
  font-weight: 600;
}

.binding-header .meta {
  color: var(--td-text-color-secondary);
  font-size: 12px;
}

.header-actions {
  flex-shrink: 0;
}

.binding-panel :deep(.t-loading) {
  flex: 1;
  min-height: 0;
}

.binding-panel :deep(.t-loading__parent) {
  height: 100%;
}

.binding-panel :deep(.t-loading__content) {
  height: 100%;
}

.binding-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  height: 100%;
}

.guide-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}

.guide-steps {
  margin-top: 4px;
}

.guide-card p {
  margin: 0;
  font-size: 13px;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
}

.guide-card p + p {
  margin-top: 8px;
}

.key-actions {
  display: flex;
  gap: 10px;
}

.key-card {
  margin-top: 4px;
}

.key-row .label {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.key-meta {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.countdown.valid {
  color: var(--td-success-color);
}

.countdown.expired {
  color: var(--td-error-color);
}

.key-empty,
.binding-empty {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

@media (max-width: 1024px) {
  .pad-binding-container {
    padding: 12px;
  }

  .content-layout {
    grid-template-columns: 1fr;
  }
}
</style>
