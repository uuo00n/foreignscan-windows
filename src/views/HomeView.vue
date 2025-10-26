<template>
  <div class="home">
    <header class="app-header">
      <div class="logo">智能防务检测系统</div>
      <div class="actions">
        <button class="action-btn">开始</button>
        <button class="action-btn">合格</button>
        <button class="action-btn">缺陷</button>
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
    </footer>
  </div>
</template>

<script>
import InspectionList from '@/components/InspectionList.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import DetectionResults from '@/components/DetectionResults.vue';
import { mapActions } from 'vuex';

export default {
  name: 'HomeView',
  components: {
    InspectionList,
    ImageViewer,
    DetectionResults
  },
  methods: {
    ...mapActions(['loadInspectionRecords'])
  },
  mounted() {
    // 加载模拟数据
    const mockRecords = [
      { id: '001', time: '07/13 14:25', status: 'qualified', selected: false },
      { id: '002', time: '07/13 14:25', status: 'defect', selected: false },
      { id: '003', time: '07/13 14:25', status: 'pending', selected: false, progress: '80%' },
      { id: '004', time: '07/13 14:15', status: 'qualified', selected: false },
      { id: '005', time: '07/13 14:15', status: 'qualified', selected: false },
      { id: '006', time: '07/13 14:15', status: 'qualified', selected: false },
      { id: '007', time: '07/13 14:15', status: 'qualified', selected: false },
      { id: '008', time: '07/13 14:15', status: 'qualified', selected: false },
      { id: '009', time: '07/13 14:15', status: 'qualified', selected: false },
      { id: '010', time: '07/13 14:15', status: 'qualified', selected: false }
    ];
    this.loadInspectionRecords(mockRecords);
  }
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
}

.status-info {
  display: flex;
  justify-content: space-around;
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
</style>