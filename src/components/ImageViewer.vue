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

        <!-- 检测标记框：保持现有绘制逻辑，绝对定位于舞台内 -->
        <div class="detection-markers" v-if="detectionResults.length > 0">
          <div 
            v-for="(result, index) in detectionResults" 
            :key="index" 
            class="marker"
            :style="{
              left: `${result.x}px`,
              top: `${result.y}px`,
              width: `${result.width}px`,
              height: `${result.height}px`
            }"
          ></div>
        </div>
      </div>
    </div>
    <div class="controls">
      <!-- 操作按钮：使用 TDesign Button -->
      <t-button type="primary" @click="runDetection" :disabled="!imageSrc || hasBackendError">检测结果</t-button>
      <!-- 删除“检测结果”右侧的“导出报告”按钮，保留单一操作以简化界面 -->
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

// 条件导入 Electron，避免在浏览器环境中报错
const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export default {
  name: 'ImageViewer',
  computed: {
    // 读取当前图片、检测结果以及右侧面板显隐状态
    ...mapState(['currentImage', 'detectionResults', 'backendStatus', 'showResultsPanel']),
    imageSrc() {
      // 只通过网络数据获取：无当前记录或无有效服务器路径则返回 null
      if (!this.currentImage || !this.currentImage.path) return null;
      // 返回后端提供的图片地址
      return this.currentImage.path;
    },
    hasBackendError() {
      return this.backendStatus === 'error';
    }
  },
  methods: {
    // 引入设置结果与显隐状态的动作
    ...mapActions(['setDetectionResults', 'setShowResultsPanel']),
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

      // 3) 无结果时才发起检测请求
      if (!this.currentImage || !this.currentImage.id) {
        return;
      }
      
      try {
        // 通过IPC与主进程通信，调用后端API进行检测
        if (ipcRenderer) {
          // 使用正确的API格式
          const results = await ipcRenderer.invoke('run-detection', {
            imageId: this.currentImage.id
          });
          this.setDetectionResults(results || []);
        } else {
          // 浏览器环境下，直接调用API
          try {
            // 使用POST方法和正确的API路径
            const response = await fetch('http://localhost:3000/api/detect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                imageId: this.currentImage.id
              })
            });
            
            const data = await response.json();
            if (response.ok && data.results) {
              this.setDetectionResults(data.results || []);
            } else {
              this.setDetectionResults([]);
              console.error('检测失败:', data.message || '未知错误');
            }
          } catch (error) {
            this.setDetectionResults([]);
            console.error('检测请求失败:', error);
          }
        }
      } catch (error) {
        this.setDetectionResults([]);
        console.error('检测过程出错:', error);
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
  border: 2px solid red;
  background-color: rgba(255, 0, 0, 0.2);
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