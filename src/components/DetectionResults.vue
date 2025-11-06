<template>
  <div class="detection-results">
    <!-- 头部使用 TDesign Card，标题更规范 -->
    <t-card title="检测结果" bordered>
      <!-- 有结果时使用 TDesign List 展示 -->
      <div v-if="detectionResults.length > 0" class="results-content">
        <t-list split>
          <t-list-item v-for="(result, index) in detectionResults" :key="index">
            <div class="result-item">
              <div class="result-info">
                <div class="result-type">缺陷类型: {{ result.type }}</div>
                <div class="result-confidence">置信度: {{ (result.confidence * 100).toFixed(1) }}%</div>
              </div>
              <!-- 使用 TDesign Tag 做重要信息标识 -->
              <t-tag :theme="result.confidence >= 0.8 ? 'danger' : 'warning'" variant="light" size="small">
                {{ result.confidence >= 0.8 ? '高风险' : '需复检' }}
              </t-tag>
            </div>
          </t-list-item>
        </t-list>
      </div>
      <!-- 无结果时使用 TDesign Empty -->
      <div v-else class="no-results">
        <t-empty description="暂无检测结果，请点击“检测结果”按钮进行检测" />
      </div>
    </t-card>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'DetectionResults',
  computed: {
    ...mapState(['detectionResults'])
  }
}
</script>

<style scoped>
.detection-results {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e0e0e0;
}

.results-header {
  padding: 10px 15px;
  border-bottom: 1px solid #e0e0e0;
}

.results-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.results-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.result-item {
  display: flex;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
}

.result-icon {
  margin-right: 10px;
  width: 24px;
  height: 24px;
  background-color: #fce8e6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c5221f;
}

.icon-warning:before {
  content: "!";
  font-weight: bold;
}

.result-info {
  flex: 1;
}

.result-type {
  font-weight: bold;
  margin-bottom: 5px;
}

.result-confidence {
  font-size: 12px;
  color: #666;
}

.no-results {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  text-align: center;
  padding: 20px;
}
</style>