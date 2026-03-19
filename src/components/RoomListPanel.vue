<template>
  <aside class="rooms-panel">
    <div class="rooms-head">
      <div class="rooms-title">{{ title }}</div>
      <t-radio-group
        class="rooms-sort"
        size="small"
        variant="default-filled"
        :value="normalizedSortOrder"
        @change="handleSortChange"
      >
        <t-radio-button value="asc">名称升序</t-radio-button>
        <t-radio-button value="desc">名称降序</t-radio-button>
      </t-radio-group>
    </div>
    <t-menu
      v-if="sortedRooms.length > 0"
      :value="menuValue"
      width="100%"
      class="rooms-menu"
      @change="handleChange"
    >
      <t-menu-item v-for="room in sortedRooms" :key="room.id" :value="String(room.id)">
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
    },
    sortOrder: {
      type: String,
      default: 'asc'
    }
  },
  emits: ['change', 'update:sortOrder'],
  computed: {
    menuValue() {
      return String(this.value || '');
    },
    normalizedSortOrder() {
      return this.sortOrder === 'desc' ? 'desc' : 'asc';
    },
    sortedRooms() {
      const rooms = Array.isArray(this.rooms) ? [...this.rooms] : [];
      const multiplier = this.normalizedSortOrder === 'desc' ? -1 : 1;
      return rooms.sort((a, b) => {
        const aName = String((a && (a.name || a.id)) || '');
        const bName = String((b && (b.name || b.id)) || '');
        const nameCompare = aName.localeCompare(bName, 'zh-CN', {
          numeric: true,
          sensitivity: 'base'
        });
        if (nameCompare !== 0) {
          return nameCompare * multiplier;
        }
        const aId = String((a && a.id) || '');
        const bId = String((b && b.id) || '');
        const idCompare = aId.localeCompare(bId, 'zh-CN', {
          numeric: true,
          sensitivity: 'base'
        });
        return idCompare * multiplier;
      });
    }
  },
  methods: {
    handleChange(value) {
      this.$emit('change', String(value || ''));
    },
    handleSortChange(value) {
      const next = value === 'desc' ? 'desc' : 'asc';
      this.$emit('update:sortOrder', next);
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

.rooms-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--td-component-stroke);
}

.rooms-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.rooms-sort {
  flex-shrink: 0;
}

.rooms-sort :deep(.t-radio-group) {
  flex-wrap: nowrap;
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
