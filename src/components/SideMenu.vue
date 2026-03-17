<template>
  <div class="side-menu-wrapper">
    <t-menu
      theme="light"
      :value="activeValue"
      :collapsed="collapsed"
      @change="onChange"
      class="side-menu"
    >
      <t-menu-item value="home">
        <template #icon>
          <DashboardIcon />
        </template>
        首页
      </t-menu-item>
      <t-menu-item value="scene-preview">
        <template #icon>
          <AppIcon />
        </template>
        点位列表
      </t-menu-item>
      <t-menu-item value="date-list">
        <template #icon>
          <CalendarIcon />
        </template>
        日期列表
      </t-menu-item>
    </t-menu>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { DashboardIcon, AppIcon, CalendarIcon } from 'tdesign-icons-vue-next';

export default {
  name: 'SideMenu',
  components: {
    DashboardIcon,
    AppIcon,
    CalendarIcon
  },
  props: {
    value: {
      type: String,
      default: 'home'
    }
  },
  emits: ['change'],
  setup(props, { emit }) {
    const store = useStore();
    const collapsed = computed(() => store.state.sidebarCollapsed);
    const activeValue = computed(() => props.value);

    const onChange = (value) => {
      emit('change', value);
    };

    return {
      collapsed,
      activeValue,
      onChange
    };
  }
};
</script>

<style scoped>
.side-menu-wrapper {
  height: 100%;
  flex-shrink: 0;
  transition: all 0.2s;
  border-right: 1px solid var(--td-component-stroke);
}
/* Ensure menu takes full height */
.side-menu {
  height: 100%;
}
</style>
