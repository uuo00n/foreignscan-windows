<template>
  <div class="home">
    <header class="app-header">
      <div class="header-left">
        <t-button theme="default" variant="text" shape="square" @click="toggleSidebar">
          <ViewListIcon size="20" />
        </t-button>
        <div class="logo">智能防务检测系统</div>
      </div>
      <div class="actions">
        <!-- 使用 TDesign 按钮组件替换原生按钮 -->
        <!-- 说明：后续可在 @click 里绑定筛选或启动逻辑 -->
        <t-space size="small">
          <t-button type="primary" @click="startSelectedDetect" v-if="activeMenu === 'home'">开始</t-button>
          <!-- <t-button theme="success">合格</t-button> -->
          <!-- <t-button theme="danger">缺陷</t-button> -->
          <t-button
            :theme="isBatchMode ? 'primary' : 'default'"
            variant="outline"
            @click="toggleBatchMode"
            v-if="activeMenu === 'home'"
          >
            {{ isBatchMode ? '退出批量' : '批量处理' }}
          </t-button>
          <t-button shape="circle" theme="primary" @click="refreshList" title="刷新列表" v-if="activeMenu === 'home'">
            <RefreshIcon size="16" />
          </t-button>
        </t-space>
      </div>
    </header>
    
    <main class="app-content">
      <SideMenu :value="activeMenu" @change="handleMenuChange" />
      
      <!-- Home View (Inspection) -->
      <div class="view-container home-view" v-show="activeMenu === 'home'">
        <div class="sidebar">
          <InspectionList ref="inspectionList" />
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
      </div>

      <!-- Scene Preview View -->
      <div class="view-container scene-view" v-if="activeMenu === 'scene-preview'">
        <ScenePreview />
      </div>

      <!-- Date List View (Embedded) -->
      <div class="view-container date-view" v-if="activeMenu === 'date-list'">
        <iframe 
          src="#/by-date" 
          style="width: 100%; height: 100%; border: none;"
          title="Date List"
        ></iframe>
      </div>

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
            <t-empty description="暂无任务" />
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
            <t-button theme="danger" variant="outline" :disabled="!hasDetectJobHistory" @click="clearJobsHistory">清空历史进度</t-button>
            <t-button variant="outline" @click="jobsDialogVisible=false">关闭</t-button>
          </t-space>
        </template>
      </t-dialog>

    </main>
    
    <footer class="app-footer">
      <div class="status-info">
        <template v-if="listActiveTab==='undetected'">
          <div class="status-item"><span class="label">未检测数量:</span><span class="value">{{ counts.undetected }}</span></div>
        </template>
        <template v-else-if="listActiveTab==='detected'">
          <div class="status-item"><span class="label">已检测总数:</span><span class="value">{{ counts.detected }}</span></div>
          <div class="status-item"><span class="label">合格数量:</span><span class="value">{{ counts.qualified }}</span></div>
          <div class="status-item"><span class="label">缺陷数量:</span><span class="value">{{ counts.defect }}</span></div>
        </template>
        <template v-else>
          <div class="status-item"><span class="label">全部总数:</span><span class="value">{{ counts.total }}</span></div>
          <div class="status-item"><span class="label">已检测总数:</span><span class="value">{{ counts.detected }}</span></div>
          <div class="status-item"><span class="label">未检测数量:</span><span class="value">{{ counts.undetected }}</span></div>
          <div class="status-item"><span class="label">合格数量:</span><span class="value">{{ counts.qualified }}</span></div>
          <div class="status-item"><span class="label">缺陷数量:</span><span class="value">{{ counts.defect }}</span></div>
        
        </template>
        <t-button class="progress-btn" variant="outline" size="small" theme="primary" shape="round" @click="openJobsDialog" title="查看识别任务进度">
          任务进度
        </t-button>
      </div>
    </footer>
  </div>
</template>

<script>
import InspectionList from '@/components/InspectionList.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import DetectionResults from '@/components/DetectionResults.vue';
import SideMenu from '@/components/SideMenu.vue';
import ScenePreview from '@/components/ScenePreview.vue';
import { mapState } from 'vuex';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
// 引入 TDesign 图标库中的日历图标
import { CalendarIcon, RefreshIcon, ViewListIcon } from 'tdesign-icons-vue-next';

export default {
  data() {
    return {
      // 控制识别进度弹窗显示/隐藏
      jobsDialogVisible: false,
      activeMenu: 'home'
    };
  },
  name: 'HomeView',
  components: {
    InspectionList,
    ImageViewer,
    DetectionResults,
    CalendarIcon,
    RefreshIcon,
    ViewListIcon,
    SideMenu,
    ScenePreview
  },
  computed: {
    // 控制右侧“检测结果”面板的显示与隐藏（默认隐藏）
    ...mapState(['showResultsPanel', 'detectJobs', 'backendStatus', 'detectionResults', 'inspectionRecords', 'listActiveTab', 'isBatchMode']),
    hasDetectJobHistory() {
      const terminal = new Set(['completed', 'failed', 'canceled']);
      return Object.values(this.detectJobs || {}).some((job) => job && terminal.has(job.Status));
    },
    counts() {
      const list = Array.isArray(this.inspectionRecords) ? this.inspectionRecords : [];
      const statusKey = (s) => {
        if (s === 'qualified' || s === '合格') return 'qualified';
        if (s === 'defect' || s === '缺陷' || s === '异常') return 'defect';
        if (s === 'undetected' || s === '未检测') return 'undetected';
        if (s === '已检测') return 'detected';
        return 'unknown';
      };
      let qualified = 0, defect = 0, undetected = 0;
      for (const r of list) {
        const detFlag = r && r.isDetected === true;
        const issueFlag = r && r.hasIssue === true;
        if (detFlag) {
          if (issueFlag) defect++; else qualified++;
          continue;
        }
        const k = statusKey(r && r.status);
        if (k === 'qualified') qualified++;
        else if (k === 'defect') defect++;
        else if (k === 'undetected') undetected++;
      }
      const detected = qualified + defect;
      const total = list.length;
      return { total, detected, qualified, defect, undetected };
    }
  },
  methods: {
    toggleSidebar() {
      this.$store.commit('TOGGLE_SIDEBAR');
    },
    handleMenuChange(value) {
      this.activeMenu = value;
    },
    refreshList() {
      const tab = this.$store.state.listActiveTab || 'all';
      if (tab === 'all') {
        this.$store.dispatch('fetchImagesFromServer');
        return;
      }
      if (tab === 'undetected') {
        this.$store.dispatch('fetchImagesByFilter', { status: 'undetected' });
        return;
      }
      if (tab === 'detected') {
        this.$store.dispatch('fetchImagesFromServer');
        return;
      }
      this.$store.dispatch('fetchImagesFromServer');
    },
    async startSelectedDetect() {
      const healthy = await this.$store.dispatch('checkBackendHealth');
      if (!healthy) {
        MessagePlugin.error('后端未连接，无法触发识别');
        return;
      }

      let ids = [];
      if (this.isBatchMode) {
        // 批量模式：优先使用批量选中的ID
        if (this.$store.getters.batchSelectedIds && this.$store.getters.batchSelectedIds.length > 0) {
          ids = this.$store.getters.batchSelectedIds;
        } else {
          // 批量模式但没选中：提示用户
          MessagePlugin.warning('批量模式下请先选择图片');
          return;
        }
      } else {
        // 非批量模式：直接检测当前查看的图片
        const current = this.$store.state.currentRecord;
        if (current && current.id) {
          ids = [current.id];
        } else {
          MessagePlugin.warning('请先选择一张图片查看');
          return;
        }
      }

      if (!ids.length) {
        MessagePlugin.warning('未找到可检测的图片');
        return;
      }

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
    // 切换批量模式
    toggleBatchMode() {
      const next = !this.isBatchMode;
      this.$store.commit('SET_IS_BATCH_MODE', next);
    },
    // 全选当前列表
    selectAll() {
      const list = this.$store.state.inspectionRecords || [];
      const ids = list.map(r => r.id);
      this.$store.commit('SET_BATCH_SELECTED_IDS', ids);
    },
    // 取消选择
    clearSelection() {
      this.$store.commit('SET_BATCH_SELECTED_IDS', []);
    },
    // 筛选合格（预留）
    filterQualified() {
      this.$store.dispatch('fetchImagesByFilter', { status: 'qualified' });
    },
    // 筛选缺陷（预留）
    filterDefect() {
      this.$store.dispatch('fetchImagesByFilter', { status: 'exception' });
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
    },
    openJobsDialog() {
      this.jobsDialogVisible = true;
    },
    clearJobsHistory() {
      const confirmDialog = DialogPlugin.confirm({
        header: '清空历史进度',
        body: '将清空已完成/失败/取消的任务记录，进行中的任务不会受影响。确认继续？',
        theme: 'warning',
        onConfirm: async () => {
          confirmDialog.hide();
          await this.$store.dispatch('clearDetectJobsHistory');
          MessagePlugin.success('已清空历史进度');
        }
      });
    }
  },
  // 移除所有本地模拟数据加载，数据将由组件挂载时通过网络获取
}
</script>

<style>
/* 移除全局 reset，已经在 App.vue 中定义 */

.home {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--app-bg-color);
}

.app-header {
  height: var(--app-header-height);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background-color: var(--td-bg-color-container); /* 改为亮色背景，符合 TDesign 风格 */
  color: var(--td-text-color-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* 更柔和的阴影 */
  border-bottom: 1px solid var(--td-component-stroke);
  z-index: 10;
}

.logo {
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--td-text-color-primary); /* 使用标准文字颜色 */
  /* 移除之前的渐变，使用更稳重的纯色或品牌色 */
}

.app-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.view-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  height: 100%;
}

.home-view {
  flex-direction: row;
}

.scene-view {
  flex-direction: column;
  background-color: var(--td-bg-color-page);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar {
  width: 320px;
  background-color: var(--td-bg-color-container);
  border-right: 1px solid var(--td-component-stroke);
  display: flex;
  flex-direction: column;
  z-index: 5;
}

.main-content {
  flex: 1;
  position: relative;
  background-color: var(--td-bg-color-page);
  display: flex;
  flex-direction: column;
}

.jobs-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 320px;
  background: var(--td-bg-color-container);
  padding: 16px;
  border-radius: 3px; /* TDesign 圆角较小 */
  box-shadow: 0 3px 14px 2px rgba(0, 0, 0, 0.05), 0 8px 10px 1px rgba(0, 0, 0, 0.06), 0 5px 5px -3px rgba(0, 0, 0, 0.1); /* TDesign 阴影 */
  z-index: 100;
  border: 1px solid var(--td-component-border);
}

.results-panel {
  width: 360px;
  background-color: var(--td-bg-color-container);
  border-left: 1px solid var(--td-component-stroke);
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 8px rgba(0,0,0,0.05);
  z-index: 8;
}

/* ... 动画部分保持不变 ... */
.results-slide-enter-active,
.results-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.results-slide-enter-from,
.results-slide-leave-to {
  transform: translateX(100%);
  opacity: 0.8;
}

.app-footer {
  height: var(--app-footer-height);
  background-color: var(--td-bg-color-container); /* 亮色底部 */
  color: var(--td-text-color-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  font-size: 12px;
  border-top: 1px solid var(--td-component-stroke);
}

.status-info {
  display: flex;
  gap: 24px;
  color: var(--td-text-color-secondary);
}

.status-item {
  display: flex;
  align-items: center;
}

.status-item .label {
  margin-right: 6px;
  color: var(--td-text-color-placeholder);
}

.status-item .value {
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.footer-action {
  display: flex;
  align-items: center;
}

/* 恢复默认按钮样式 */
.footer-action .t-button {
  /* color: ... ; */ 
}
.footer-action .t-button:hover {
  /* ... */
}

/* 调整弹窗内样式 */
.jobs-dialog {
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
}

.job-item {
  padding: 16px;
  border: 1px solid var(--td-component-border);
  border-radius: 3px;
  margin-bottom: 12px;
  background-color: var(--td-bg-color-container);
  transition: all 0.2s;
}

.job-item:hover {
  border-color: var(--td-brand-color);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.job-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.job-message {
  flex: 1;
  color: var(--td-text-color-secondary);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
