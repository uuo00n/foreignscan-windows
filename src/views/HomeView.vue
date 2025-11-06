<template>
  <div class="home">
    <header class="app-header">
      <div class="logo">智能防务检测系统</div>
      <div class="actions">
        <!-- 使用 TDesign 按钮组件替换原生按钮 -->
        <!-- 说明：后续可在 @click 里绑定筛选或启动逻辑 -->
        <t-space size="small">
          <t-button type="primary">开始</t-button>
          <t-button theme="success">合格</t-button>
          <t-button theme="danger">缺陷</t-button>
        </t-space>
      </div>
    </header>
    
    <main class="app-content">
      <div class="sidebar">
        <InspectionList />
      </div>
      <div class="main-content">
        <ImageViewer />
      </div>
      <!-- 右侧检测结果面板：默认隐藏，点击“检测结果”后以动画滑入展示 -->
      <transition name="results-slide">
        <div class="results-panel" v-if="showResultsPanel">
          <DetectionResults />
        </div>
      </transition>
    </main>
    
    <footer class="app-footer">
      <div class="status-info">
        <div class="status-item">
          <span class="label">当前状态:</span>
          <span class="value">已连接</span>
        </div>
        <div class="status-item">
          <span class="label">检测结果:</span>
          <span class="value">3</span>
        </div>
        <div class="status-item">
          <span class="label">缺陷数量:</span>
          <span class="value">20</span>
        </div>
      </div>
      <!-- 底部右侧的操作区域：放置日期跳转按钮 -->
      <div class="footer-action">
        <t-button
          class="calendar-btn"
          shape="circle"
          size="medium"
          theme="primary"
          @click="goToDateView"
          title="按日期查看检测列表"
        >
          <!-- 使用 TDesign 图标库的日历图标 -->
          <CalendarIcon size="20" />
        </t-button>
      </div>
    </footer>
  </div>
</template>

<script>
import InspectionList from '@/components/InspectionList.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import DetectionResults from '@/components/DetectionResults.vue';
import { mapState } from 'vuex'; // 读取全局状态
// 引入 TDesign 图标库中的日历图标
import { CalendarIcon } from 'tdesign-icons-vue-next';

export default {
  name: 'HomeView',
  components: {
    InspectionList,
    ImageViewer,
    DetectionResults,
    CalendarIcon
  },
  computed: {
    // 控制右侧“检测结果”面板的显示与隐藏（默认隐藏）
    ...mapState(['showResultsPanel'])
  },
  methods: {
    // 跳转到按日期查看检测列表的页面
    goToDateView() {
      // 使用命名路由，便于维护
      this.$router.push({ name: 'dateList' });
    }
  },
  // 移除所有本地模拟数据加载，数据将由组件挂载时通过网络获取
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #333;
}

.home {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.logo {
  font-size: 18px;
  font-weight: bold;
}

.actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: #4285f4;
  color: white;
  cursor: pointer;
}

.app-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  overflow: hidden;
}

.results-panel {
  width: 250px;
  overflow-y: auto;
}

/* 右侧面板入场/退场动画：保持两者“速度一致”，统一时长与缓动 */
.results-slide-enter-active,
.results-slide-leave-active {
  transition: transform 240ms ease-in-out, /* 统一 240ms，缓动一致 */
              opacity 240ms ease-in-out;
  will-change: transform, opacity; /* 提升动画流畅度 */
}
/* 入场起点与退场终点：位移更明显，且透明度更低，视觉更自然 */
.results-slide-enter-from,
.results-slide-leave-to {
  transform: translateX(24px); /* 从右侧更明显的位移进入/离开 */
  opacity: 0.01;               /* 减少闪烁 */
}
.results-slide-enter-to,
.results-slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}

/* 无障碍：尊重系统“减少动态效果”设置，若开启则禁用动画 */
@media (prefers-reduced-motion: reduce) {
  .results-slide-enter-active,
  .results-slide-leave-active {
    transition: none;
  }
}

.app-footer {
  padding: 10px 20px;
  background-color: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  display: flex;               /* 使底部为左右布局 */
  justify-content: space-between; /* 左侧状态信息，右侧按钮 */
  align-items: center;         /* 垂直居中 */
}

.status-info {
  display: flex;                 /* 使用 Flex 布局 */
  align-items: center;           /* 垂直居中 */
  gap: 24px;                     /* 三个状态块之间的固定间距 */
}

.status-item {
  display: flex;
  align-items: center;
}

.label {
  margin-right: 5px;
  color: #666;
}

.value {
  font-weight: bold;
}

/* 右下角浮动圆形按钮样式 */
.footer-action {
  display: flex;
  align-items: center;
}

.calendar-btn {
  /* 放置于底部栏右侧，避免越界 */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}
</style>