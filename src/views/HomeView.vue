<template>
  <div class="home">
    <header class="app-header">
      <div class="logo">智能防务检测系统</div>
      <div class="actions">
        <!-- 使用 TDesign 按钮组件替换原生按钮 -->
        <!-- 说明：后续可在 @click 里绑定筛选或启动逻辑 -->
        <t-space size="small">
          <t-button type="primary" @click="startSelectedDetect">开始</t-button>
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
        <div class="jobs-panel" v-if="false && Object.keys(detectJobs || {}).length > 0">
          <h4 class="jobs-title">识别任务进度</h4>
          <div class="job-item" v-for="job in Object.values(detectJobs)" :key="job.ID">
            <div class="job-row">
              <div class="job-id">{{ job.ID }}</div>
              <div class="job-status">{{ job.Status }}</div>
              <div class="job-message">{{ job.Message }}</div>
              <t-button size="small" theme="danger" variant="outline" @click="cancelJob(job.ID)" v-if="!['completed','failed','canceled'].includes(job.Status)">取消</t-button>
            </div>
            <t-progress :percentage="calcProgress(job)" :status="progressStatus(job)" />
          </div>
        </div>
      </div>
      <!-- 右侧检测结果面板：默认隐藏，点击“检测结果”后以动画滑入展示 -->
      <transition name="results-slide">
        <div class="results-panel" v-if="showResultsPanel">
          <DetectionResults />
        </div>
      </transition>

      <!-- 识别任务进度弹窗：使用 TDesign Dialog 美化显示 -->
      <t-dialog
        v-model:visible="jobsDialogVisible"
        header="识别任务进度"
        placement="center"
        width="720px"
        destroyOnClose
        closeOnOverlayClick
      >
        <div class="jobs-dialog">
          <template v-if="Object.keys(detectJobs || {}).length === 0">
            <t-empty description="暂无正在进行的任务" />
          </template>
          <template v-else>
            <div class="job-item" v-for="job in Object.values(detectJobs)" :key="job.ID">
              <div class="job-row">
                <!-- 任务 ID 与状态标签 -->
                <t-tag shape="round" theme="default">{{ job.ID }}</t-tag>
                <t-tag v-if="job.Status==='completed'" theme="success">已完成</t-tag>
                <t-tag v-else-if="job.Status==='failed'" theme="danger">失败</t-tag>
                <t-tag v-else-if="job.Status==='canceled'" theme="warning">已取消</t-tag>
                <t-tag v-else theme="primary">进行中</t-tag>
                <!-- 后端返回的提示信息 -->
                <span class="job-message">{{ job.Message }}</span>
                <!-- 支持取消未完成的任务 -->
                <t-button
                  size="small"
                  theme="danger"
                  variant="outline"
                  @click="cancelJob(job.ID)"
                  v-if="!['completed','failed','canceled'].includes(job.Status)"
                >取消</t-button>
              </div>
              <!-- 进度条：百分比与状态映射来自现有方法 -->
              <t-progress :percentage="calcProgress(job)" :status="progressStatus(job)" />
            </div>
          </template>
        </div>
        <template #footer>
          <t-space>
            <t-button variant="outline" @click="jobsDialogVisible=false">关闭</t-button>
          </t-space>
        </template>
      </t-dialog>

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
import { mapState } from 'vuex';
import { MessagePlugin } from 'tdesign-vue-next';
// 引入 TDesign 图标库中的日历图标
import { CalendarIcon } from 'tdesign-icons-vue-next';

export default {
  data() {
    return {
      // 控制识别进度弹窗显示/隐藏
      jobsDialogVisible: false,
    };
  },
  name: 'HomeView',
  components: {
    InspectionList,
    ImageViewer,
    DetectionResults,
    CalendarIcon
  },
  computed: {
    // 控制右侧“检测结果”面板的显示与隐藏（默认隐藏）
    ...mapState(['showResultsPanel', 'detectJobs'])
  },
  methods: {
    // 跳转到按日期查看检测列表的页面
    goToDateView() {
      // 使用命名路由，便于维护
      this.$router.push({ name: 'dateList' });
    },
    async startSelectedDetect() {
      const healthy = await this.$store.dispatch('checkBackendHealth');
      if (!healthy) {
        MessagePlugin.error('后端未连接，无法触发识别');
        return;
      }
      const records = (this.$store.state.inspectionRecords || []).filter(r => r && r.selected);
      if (!records.length) {
        MessagePlugin.warning('请先在列表勾选需要识别的图片');
        return;
      }
      const ids = records.map(r => r.id);
      try {
        const result = await this.$store.dispatch('startYOLOForSelected', { ids });
        const total = result.length;
        if (total === 0) {
          MessagePlugin.warning('未提交任何识别任务');
          return;
        }
        const ok = result.filter(x => x.ok).length;
        const fail = total - ok;
        if (ok > 0 && fail === 0) {
          MessagePlugin.success(`已提交 ${total} 个识别任务，等待进度更新`);
        } else if (ok > 0 && fail > 0) {
          MessagePlugin.warning(`已提交 ${total} 个识别任务，成功 ${ok}，失败 ${fail}`);
        } else {
          MessagePlugin.error('提交失败，未成功提交任何识别任务');
        }
        if (fail > 0) {
          console.warn('触发失败详情:', result.filter(x => !x.ok));
        }
        const okJobs = result.filter(x => x.ok && x.jobId);
        if (ok > 0 && okJobs.length === 0) {
          MessagePlugin.warning('后端未返回任务ID，无法显示进度');
        }
        if (okJobs.length > 0) {
          await this.$store.dispatch('initDetectJobs', okJobs);
          await this.$store.dispatch('subscribeJobs', okJobs);
          // 打开弹窗显示任务进度
          this.jobsDialogVisible = true;
        }
      } catch (e) {
        console.error('批量触发失败:', e);
        MessagePlugin.error('触发失败，请检查后端服务');
      }
    },
    calcProgress(job) {
      const total = job.Total || 0;
      const prog = job.Progress || 0;
      if (!total) return job.Status === 'completed' ? 100 : 0;
      const pct = Math.floor((prog / total) * 100);
      return Math.max(0, Math.min(100, pct));
    },
    progressStatus(job) {
      if (job.Status === 'failed') return 'error';
      if (job.Status === 'canceled') return 'warning';
      if (job.Status === 'completed') return 'success';
      return 'active';
    },
    async cancelJob(jobId) {
      const ok = await this.$store.dispatch('cancelDetectJob', { jobId });
      if (ok) {
        MessagePlugin.success('任务已取消');
      } else {
        MessagePlugin.error('取消任务失败');
      }
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
  width: 480px;
  max-width: 50vw;
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

/* 识别任务弹窗样式优化 */
.jobs-dialog {
  max-height: 60vh; /* 弹窗内部滚动区域，避免过长 */
  overflow-y: auto;
}
.jobs-dialog .job-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.jobs-dialog .job-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap; /* 保证在窄屏下不拥挤 */
}
.jobs-dialog .job-message {
  color: #666;
  flex: 1;
  min-width: 160px;
}

</style>
