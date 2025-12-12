<template>
  <div class="detection-results">
    <t-card title="检测结果" :bordered="false" class="results-card">
      <template #actions>
        <t-tag v-if="detectionResults.length > 0" theme="primary" variant="light" size="small">
          共 {{ detectionResults.length }} 项
        </t-tag>
      </template>
      
      <!-- 对比图容器 -->
      <div v-if="processedImagePath" class="image-container">
        <img :src="processedImagePath" alt="识别对比图" class="processed-image" />
      </div>

      <!-- 结果列表 -->
      <div v-if="detectionResults.length > 0" class="results-content">
        <t-list :split="false">
          <t-list-item v-for="(result, index) in detectionResults" :key="index" class="custom-list-item">
            <div class="result-card">
              <!-- 左侧图标 -->
              <div class="result-icon-wrapper" :class="result.confidence >= 0.8 ? 'high-risk' : 'warning'">
                <ErrorCircleIcon v-if="result.confidence >= 0.8" size="20px" />
                <InfoCircleIcon v-else size="20px" />
              </div>
              
              <!-- 中间信息 -->
              <div class="result-info">
                <div class="result-header">
                  <span class="result-type">{{ result.type }}</span>
                </div>
                <!-- 补充显示检测记录的元数据，例如识别时间 -->
                <div class="result-meta" v-if="result.updatedAt || result.timestamp || result.time">
                  <TimeIcon size="12px" style="margin-right: 4px;" />
                  {{ formatTime(result.updatedAt || result.timestamp || result.time) }}
                </div>
              </div>

              <!-- 右侧标签 -->
              <div class="result-status">
                <t-tag :theme="result.confidence >= 0.8 ? 'danger' : 'warning'" variant="outline" size="small">
                  {{ result.confidence >= 0.8 ? '高风险' : '需复检' }}
                </t-tag>
              </div>
            </div>
          </t-list-item>
        </t-list>
      </div>

      <!-- 无结果时使用 TDesign Empty -->
      <div v-else class="no-results">
        <t-empty description="暂无检测结果" />
        <t-button variant="text" size="small" class="hint-btn">请点击列表上方“开始”按钮进行检测</t-button>
      </div>
    </t-card>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { TimeIcon, ErrorCircleIcon, InfoCircleIcon } from 'tdesign-icons-vue-next';

export default {
  name: 'DetectionResults',
  components: {
    TimeIcon,
    ErrorCircleIcon,
    InfoCircleIcon
  },
  computed: {
    ...mapState(['detectionResults', 'processedImagePath'])
  },
  methods: {
    formatTime(ts) {
      if (!ts) return '';
      // 如果是秒级时间戳（10位），转为毫秒
      const d = new Date(String(ts).length === 10 ? ts * 1000 : ts);
      if (isNaN(d.getTime())) return ts; // 可能是已经是格式化的字符串
      return d.toLocaleString();
    }
  }
}
</script>

<style scoped>
.detection-results {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-left: 1px solid #e7e7e7;
}

.results-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 覆盖 TDesign Card body 样式以适应 flex 布局 */
:deep(.t-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px !important;
}

.image-container {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  background-color: #f3f3f3;
  border: 1px solid #e7e7e7;
  flex-shrink: 0;
}

.processed-image {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: contain;
  display: block;
}

.image-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0.9;
}

.results-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px; /* 防止滚动条遮挡 */
}

/* 自定义滚动条 */
.results-content::-webkit-scrollbar {
  width: 6px;
}
.results-content::-webkit-scrollbar-thumb {
  background-color: #e0e0e0;
  border-radius: 3px;
}
.results-content::-webkit-scrollbar-track {
  background-color: transparent;
}

.custom-list-item {
  padding: 0 !important;
  margin-bottom: 12px;
}

.result-card {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.result-card:hover {
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: #e7e7e7;
}

.result-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.result-icon-wrapper.high-risk {
  background-color: #fcebe8; /* 浅红 */
  color: #d32029;
}

.result-icon-wrapper.warning {
  background-color: #fff3e8; /* 浅橙 */
  color: #ed7b2f;
}

.result-info {
  flex: 1;
  min-width: 0; /* 防止文本溢出 */
}

.result-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.result-type {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.result-meta {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.result-status {
  margin-left: 12px;
  flex-shrink: 0;
}

.no-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  text-align: center;
  padding: 20px;
}

.hint-btn {
  color: #0052d9;
  margin-top: -10px;
}
</style>
