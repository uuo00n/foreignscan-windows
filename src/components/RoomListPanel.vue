<template>
  <aside class="rooms-panel">
    <div class="rooms-title">{{ title }}</div>
    <t-menu
      v-if="rooms.length > 0"
      :value="menuValue"
      width="100%"
      class="rooms-menu"
      @change="handleChange"
    >
      <t-menu-item v-for="room in rooms" :key="room.id" :value="String(room.id)">
        <div class="room-item">
          <span class="room-item-name">{{ room.name || room.id }}</span>
          <span class="room-item-pad" v-if="showPad && room.padId">Pad: {{ room.padId }}</span>
        </div>
      </t-menu-item>
    </t-menu>
    <div v-else class="rooms-empty">
      <t-empty :description="emptyText" />
    </div>
  </aside>
</template>

<script>
export default {
  name: 'RoomListPanel',
  props: {
    rooms: {
      type: Array,
      default: () => []
    },
    value: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: '房间列表'
    },
    emptyText: {
      type: String,
      default: '暂无房间数据'
    },
    showPad: {
      type: Boolean,
      default: true
    }
  },
  emits: ['change'],
  computed: {
    menuValue() {
      return String(this.value || '');
    }
  },
  methods: {
    handleChange(value) {
      this.$emit('change', String(value || ''));
    }
  }
};
</script>

<style scoped>
.rooms-panel {
  width: auto;
  min-width: 0;
  max-width: 340px;
  border: 1px solid var(--td-component-stroke);
  border-radius: 8px;
  background: var(--td-bg-color-container);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.rooms-title {
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 700;
  border-bottom: 1px solid var(--td-component-stroke);
  color: var(--td-text-color-primary);
}

.rooms-menu {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.rooms-menu::-webkit-scrollbar {
  width: 6px;
}

.rooms-menu::-webkit-scrollbar-thumb {
  background: var(--td-component-border);
  border-radius: 999px;
}

.rooms-menu:deep(.t-default-menu),
.rooms-menu:deep(.t-menu) {
  width: 100% !important;
  max-width: 100% !important;
  display: block;
  background: transparent;
}

.rooms-menu :deep(.t-menu__item) {
  min-height: 44px;
  margin: 2px 10px;
  padding: 0 14px;
  border-radius: 8px;
  color: var(--td-text-color-secondary);
  transition: all 0.2s ease;
}

.rooms-menu :deep(.t-menu__item .t-menu__content) {
  font-weight: 500;
  font-size: 15px;
}

.room-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.room-item-name {
  line-height: 20px;
}

.room-item-pad {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  line-height: 16px;
}

.rooms-menu :deep(.t-menu__item:hover:not(.t-is-active):not(.t-is-opened):not(.t-is-disabled)) {
  background-color: var(--td-bg-color-container-hover);
}

.rooms-menu :deep(.t-menu__item.t-is-active:not(.t-is-opened)) {
  position: relative;
  color: var(--td-brand-color);
  background-color: var(--td-brand-color-light);
}

.rooms-menu :deep(.t-menu__item.t-is-active:not(.t-is-opened)::before) {
  content: '';
  position: absolute;
  left: 8px;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background-color: var(--td-brand-color);
}

.rooms-menu :deep(.t-menu__item.t-is-active:not(.t-is-opened) .t-menu__content) {
  padding-left: 10px;
  font-weight: 600;
}

.rooms-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

@media (max-width: 1024px) {
  .rooms-panel {
    max-width: none;
    width: 100%;
    max-height: min(30vh, 240px);
    overflow: hidden;
  }
}

@media (max-height: 780px) {
  .rooms-panel {
    max-height: min(28vh, 200px);
  }
}
</style>
