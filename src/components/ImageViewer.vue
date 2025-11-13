<template>
  <div class="image-viewer">
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
import apiConfig from '../config/api.json';
const API_BASE = apiConfig.API_BASE;

// 条件导入 Electron，避免在浏览器环境中报错
const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export default {
  name: 'ImageViewer',
  computed: {
    // 读取当前图片、当前记录、检测结果以及右侧面板显隐状态
    ...mapState(['currentImage', 'currentRecord', 'detectionResults', 'backendStatus', 'showResultsPanel']),
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
    }
  },
  methods: {
    // 引入设置结果与显隐状态的动作
    ...mapActions(['setDetectionResults', 'setShowResultsPanel', 'fetchDetectionsByImage']),
    async runDetection() {
      // 点击同一个按钮实现“显示/隐藏”切换：
      // 1) 若面板已显示，则本次点击仅隐藏面板，不重复请求
      if (this.showResultsPanel) {
        this.setShowResultsPanel(false);
        return;
      }

      // 2) 若已有检测结果但面板未显示，直接显示结果（避免重复请求）
      if (this.detectionResults && this.detectionResults.length > 0) {
        this.setShowResultsPanel(true);
        return;
      }

      // 3) 无结果时，按新接口规范从后端读取检测结果：GET /api/images/{id}/detections
      if (!this.currentImage || !this.currentImage.id) {
        return;
      }

      try {
        // 直接调用 Vuex Action，通过统一的 API_BASE 和新路径获取检测结果
        const list = await this.$store.dispatch('fetchDetectionsByImage', { imageId: this.currentImage.id });
        // 注：store 会在成功获取后自动 setDetectionResults 并打开右侧面板
        // 若需要在此强制打开，可再调用 setShowResultsPanel(true)
        if (!Array.isArray(list) || list.length === 0) {
          // 如果后端暂时没有结果，清空并保持面板关闭
          this.setDetectionResults([]);
          this.setShowResultsPanel(false);
        }
      } catch (error) {
        // 出错时清空结果并关闭面板
        this.setDetectionResults([]);
        this.setShowResultsPanel(false);
        console.error('读取检测结果失败:', error);
      }
    }
  }
}
</script>

<style scoped>
.image-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.image-container {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  overflow: hidden;
}

/* 舞台区域：在图片显示部分设置内边距，确保图片与容器边缘有合理留白 */
.image-stage {
  position: relative;              /* 作为标记层的定位参考 */
  width: 100%;
  height: 100%;
  box-sizing: border-box;         /* 让 padding 不影响计算宽高 */
  padding: 12px;                  /* 适度留白，可按需调整（如 8px/16px） */
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-image {
  color: #999;
  font-size: 16px;
}

.detection-markers .marker {
  position: absolute;
  border: 2px solid #0052d9; /* 移除红色块，仅保留边框（TDesign 主色） */
  background: transparent;    /* 不再覆盖图片内容，避免“红一块” */
  pointer-events: none;
}

.controls {
  display: flex;
  justify-content: center;
  padding: 10px;
  gap: 10px;
  background-color: #f5f5f5;
}
</style>
