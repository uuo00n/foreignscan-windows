<template>
  <div class="image-viewer">
    <!-- 图片信息头部 -->
    <div class="viewer-header" v-if="currentRecord">
      <div class="header-left">
        <t-tag theme="primary" variant="light" class="scene-tag">{{ sceneName }}</t-tag>
        <span class="filename" :title="currentRecord.id">
          {{ currentRecord.id }}
        </span>
      </div>
      <div class="header-right">
        <t-tag v-if="currentRecord.status" :theme="statusTheme" variant="outline" size="small" style="margin-right: 12px;">
          {{ statusText }}
        </t-tag>
        <div class="time-info">
          <span class="label">上传时间：</span>
          <span class="value">{{ formattedTime }}</span>
        </div>
      </div>
    </div>

    <div class="image-container">
      <!-- 内层舞台区域：在图片显示部分添加适当的内边距，以增加留白 -->
      <div class="image-stage">
        <!-- 图片显示：优先使用后端路径 -->
        <img :src="imageSrc" alt="检测图片" v-if="imageSrc" />

        <!-- 后端异常提示：使用 TDesign Alert，更友好的错误展示 -->
        <t-alert v-else-if="hasBackendError" theme="error" title="后端异常" description="无法获取图片，请检查服务状态" />

        <!-- 无图提示：使用 TDesign Empty -->
        <t-empty v-else description="请选择一个检测记录查看图片" />

      </div>
    </div>
    <div class="controls">
      <!-- 操作按钮：使用 TDesign Button -->
      <!-- 当当前记录状态为未检测时不可点击，并显示“未检测”文案 -->
      <t-button
        type="primary"
        @click="runDetection"
        :disabled="!imageSrc || hasBackendError || isUndetected"
      >
        {{ isUndetected ? '未检测' : '检测结果' }}
      </t-button>
      <!-- 删除“检测结果”右侧的“导出报告”按钮，保留单一操作以简化界面 -->
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'ImageViewer',
  computed: {
    // 读取当前图片、当前记录、检测结果以及右侧面板显隐状态
    ...mapState(['currentImage', 'currentRecord', 'detectionResults', 'backendStatus', 'showResultsPanel', 'sceneNameMap']),
    imageSrc() {
      if (!this.currentImage || !this.currentImage.path) return null;
      return this.currentImage.path;
    },
    isUndetected() {
      const s = this.currentRecord && this.currentRecord.status;
      return s === 'undetected' || s === '未检测';
    },
    hasBackendError() {
      return this.backendStatus === 'error';
    },
    sceneName() {
      if (!this.currentRecord) return '未知点位';
      const pointId = this.currentRecord.pointId != null ? String(this.currentRecord.pointId) : null;
      if (pointId && this.sceneNameMap[pointId]) return this.sceneNameMap[pointId];
      const room = this.currentRecord.roomName || this.currentRecord.room || this.currentRecord.roomId || '';
      const point = this.currentRecord.pointName || this.currentRecord.point || this.currentRecord.pointId || '';
      if (room && point) return `${room} / ${point}`;
      if (room) return room;
      return '未知点位';
    },
    formattedTime() {
      if (!this.currentRecord) return '--';
      const ts = this.currentRecord.timestamp || this.currentRecord.time || this.currentRecord.createdAt;
      if (!ts) return '--';
      const d = new Date(String(ts).length === 10 ? ts * 1000 : ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleString();
    },
    statusText() {
      const s = this.currentRecord && this.currentRecord.status;
      const map = {
        'qualified': '合格',
        'defect': '异常',
        'exception': '异常',
        'undetected': '未检测',
        'detected': '已检测',
        '已检测': '已检测',
        '未检测': '未检测'
      };
      return map[s] || s || '未知状态';
    },
    statusTheme() {
      const s = this.currentRecord && this.currentRecord.status;
      if (s === 'qualified' || s === '合格') return 'success';
      if (s === 'defect' || s === 'exception' || s === '缺陷' || s === '异常') return 'danger';
      if (s === 'undetected' || s === '未检测') return 'default';
      return 'primary';
    }
  },
  methods: {
    // 引入设置结果与显隐状态的动作
    ...mapActions(['setDetectionResults', 'setShowResultsPanel', 'fetchDetectionsByImage']),
    
    // 执行检测（或获取结果）
    async runDetection() {
      // 点击同一个按钮实现“显示/隐藏”切换：
      // 1) 若面板已显示，则本次点击仅隐藏面板，不重复请求
      if (this.showResultsPanel) {
        this.setShowResultsPanel(false);
        return;
      }
      
      // 否则加载数据并显示
      await this.loadAndShowResults();
    },

    // 加载并显示结果的通用方法
    async loadAndShowResults() {
      // 2) 若已有检测结果但面板未显示，直接显示结果（避免重复请求）
      // 注意：切换图片时 detectionResults 会被清空，所以这里只在同一图片多次点击时有效
      if (this.detectionResults && this.detectionResults.length > 0) {
        this.setShowResultsPanel(true);
        return;
      }

      // 3) 无结果时，按新接口规范从后端读取检测结果
      if (!this.currentImage || !this.currentImage.id) {
        return;
      }

      try {
        const list = await this.$store.dispatch('fetchDetectionsByImage', { imageId: this.currentImage.id });
        
        // 如果获取到结果，或者虽然没结果但后端返回正常（空数组），都保持面板打开状态
        // store 中的 fetchDetectionsByImage 成功后会自动 SET_SHOW_RESULTS_PANEL(true)
        
        if (!Array.isArray(list) || list.length === 0) {
           // 如果确实没结果，是否要保持面板打开？
           // 用户希望“保持一直显示的状态”，所以即使是空结果也应该显示面板（显示暂无数据）
           // 这里手动强制显示一下，以防 store 里只有在有结果时才显示
           this.setShowResultsPanel(true);
        }
      } catch (error) {
        this.setDetectionResults([]);
        // 出错时是否保持面板？通常出错可以关闭或者显示错误提示
        // 这里暂时保持关闭以免干扰
        this.setShowResultsPanel(false);
        console.error('读取检测结果失败:', error);
      }
    }
  },
  watch: {
    // 监听 currentImage 变化，如果面板是打开状态，则自动加载新图片的结果
    currentImage: {
      handler(newVal, oldVal) {
        // 如果面板当前是打开的，且切换到了新图片（ID不同）
        if (this.showResultsPanel && newVal && newVal.id) {
          // 自动加载新图片的结果
          this.loadAndShowResults();
        }
      },
      immediate: false
    }
  }
}
</script>

<style scoped>
.image-viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--td-bg-color-page);
  height: 100%;
  overflow: hidden;
}

.viewer-header {
  height: 56px;
  padding: 0 24px;
  background-color: var(--td-bg-color-container);
  border-bottom: 1px solid var(--td-component-stroke);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.scene-tag {
  flex-shrink: 0;
}

.filename {
  font-size: 16px;
  font-weight: 500;
  color: var(--td-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.time-info {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  display: flex;
  align-items: center;
}

.time-info .value {
  color: var(--td-text-color-primary);
  font-weight: 500;
  margin-left: 4px;
}

.image-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  overflow: hidden;
  position: relative;
}

.image-stage {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--td-bg-color-container);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  position: relative;
}

.image-stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.controls {
  padding: 16px;
  display: flex;
  justify-content: center;
  background-color: var(--td-bg-color-container);
  border-top: 1px solid var(--td-component-stroke);
  flex-shrink: 0;
}
</style>
