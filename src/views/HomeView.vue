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
      <div class="results-panel">
        <DetectionResults />
      </div>
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