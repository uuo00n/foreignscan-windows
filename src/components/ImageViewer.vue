<template>
  <div class="image-viewer">
    <div class="image-container">
      <img :src="imageSrc" alt="检测图片" v-if="imageSrc" />
      <div class="no-image" v-else>请选择一个检测记录查看图片</div>
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
    <div class="controls">
      <button class="detection-btn" @click="runDetection">检测结果</button>
      <button class="export-btn">导出报告</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { ipcRenderer } from 'electron';

export default {
  name: 'ImageViewer',
  computed: {
    ...mapState(['currentImage', 'detectionResults']),
    imageSrc() {
      if (!this.currentImage) return null;
      // 在实际应用中，这里应该是从服务器或本地文件系统获取图片
      return this.currentImage.path || require('@/assets/hinge-example.jpg');
    }
  },
  methods: {
    ...mapActions(['setDetectionResults']),
    runDetection() {
      // 模拟检测过程
      const mockResults = [
        { x: 200, y: 150, width: 50, height: 50, type: 'defect', confidence: 0.92 },
        { x: 350, y: 150, width: 50, height: 50, type: 'defect', confidence: 0.87 },
        { x: 275, y: 250, width: 50, height: 50, type: 'defect', confidence: 0.95 }
      ];
      
      // 在实际应用中，这里应该调用后端API进行检测
      setTimeout(() => {
        this.setDetectionResults(mockResults);
      }, 500);
      
      // 也可以通过IPC与主进程通信
      // ipcRenderer.invoke('run-detection', this.currentImage.id)
      //   .then(results => {
      //     this.setDetectionResults(results);
      //   });
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

.controls button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.detection-btn {
  background-color: #4285f4;
  color: white;
}

.export-btn {
  background-color: #34a853;
  color: white;
}
</style>