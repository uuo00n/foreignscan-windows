<template>
  <div class="detection-results">
    <t-card title="检测结果" :bordered="false" class="results-card">
      <template #actions>
        <t-tag v-if="detectionResults.length > 0" theme="primary" variant="light" size="small">
          共 {{ detectionResults.length }} 项
        </t-tag>
      </template>
      
      <!-- 对比图容器 -->
      <div v-if="processedImagePath" class="image-container" @click="openImagePreview">
        <img :src="processedImagePath" alt="识别对比图" class="processed-image" />
      </div>
      
      <!-- 图片预览组件 (隐藏触发元素，仅使用弹窗功能) -->
      <div style="display: none;">
        <t-image-viewer v-model:visible="showImagePreview" :images="[processedImagePath]" />
      </div>

      <!-- 结果列表 -->
      <div v-if="groupedResults.length > 0" class="results-content">
        <t-list :split="false">
          <!-- 遍历分组后的数据 -->
          <div v-for="(group, gIndex) in groupedResults" :key="gIndex" class="result-group">
            <!-- 分组时间标题 -->
            <div class="group-header" v-if="group.time">
              <TimeIcon size="12px" style="margin-right: 4px;" />
              {{ group.time }}
            </div>
            
            <t-list-item v-for="(result, index) in group.items" :key="index" class="custom-list-item">
              <div class="result-card">
                <!-- 左侧图标 -->
                <div class="result-icon-wrapper" :class="getStatusTheme(getResultStatus(result))">
                  <CheckCircleIcon v-if="getResultStatus(result) === 'qualified'" size="20px" />
                  <ErrorCircleIcon v-else-if="getResultStatus(result) === 'risk'" size="20px" />
                  <InfoCircleIcon v-else size="20px" />
                </div>
                
                <!-- 中间信息 -->
                <div class="result-info">
                  <div class="result-header">
                    <span class="result-type">{{ result.type }}</span>
                  </div>
                  <!-- 单项中不再重复显示时间，除非没有分组时间 -->
                  <div class="result-meta" v-if="!group.time && (result.updatedAt || result.timestamp || result.time)">
                    <TimeIcon size="12px" style="margin-right: 4px;" />
                    {{ formatTime(result.updatedAt || result.timestamp || result.time) }}
                  </div>
                </div>

                <!-- 右侧标签 -->
                <div class="result-status">
                  <t-tag :theme="getStatusTheme(getResultStatus(result))" variant="outline" size="small">
                    {{ getStatusText(getResultStatus(result)) }}
                  </t-tag>
                </div>
              </div>
            </t-list-item>
          </div>
        </t-list>
      </div>

      <!-- 无结果时使用 TDesign Empty -->
      <div v-else class="no-results">
        <t-empty>
          <template #description>
            <div class="empty-content">
              <div class="empty-title">暂无检测结果</div>
              <div class="empty-hint">请点击列表上方“开始”按钮进行检测</div>
            </div>
          </template>
        </t-empty>
      </div>
    </t-card>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { TimeIcon, ErrorCircleIcon, InfoCircleIcon, CheckCircleIcon } from 'tdesign-icons-vue-next';

export default {
  name: 'DetectionResults',
  components: {
    TimeIcon,
    ErrorCircleIcon,
    InfoCircleIcon,
    CheckCircleIcon
  },
  data() {
    return {
      showImagePreview: false
    };
  },
  computed: {
    ...mapState(['detectionResults', 'processedImagePath']),
    // 根据时间戳对检测结果进行分组
    groupedResults() {
      const results = this.detectionResults || [];
      if (results.length === 0) return [];

      const groups = {};
      const noTimeGroup = [];

      results.forEach(item => {
        const ts = item.updatedAt || item.timestamp || item.time;
        if (ts) {
          const timeStr = this.formatTime(ts);
          if (!groups[timeStr]) {
            groups[timeStr] = [];
          }
          groups[timeStr].push(item);
        } else {
          noTimeGroup.push(item);
        }
      });

      // 将分组转换为数组，按时间倒序排列（如果需要）
      const groupArray = Object.keys(groups).map(time => ({
        time,
        items: groups[time]
      }));

      // 如果有无时间戳的数据，作为单独一组放在最后
      if (noTimeGroup.length > 0) {
        groupArray.push({
          time: '', // 空时间表示不显示标题
          items: noTimeGroup
        });
      }

      return groupArray;
    }
  },
  methods: {
    openImagePreview() {
      if (this.processedImagePath) {
        this.showImagePreview = true;
      }
    },
    // 获取检测结果状态：qualified(合格) | review(需复检) | risk(异常/高风险)
    getResultStatus(result) {
      if (!result || !result.type) return 'risk';
      const type = String(result.type).toLowerCase();
      // Bolts -> 合格
      if (type.includes('bolts')) return 'qualified';
      // hole -> 需复检
      if (type.includes('hole')) return 'review';
      
      // 既不是 bolts 也不是 hole -> 异常 (risk)
      return 'risk';
    },
    // 获取状态对应的显示文本
    getStatusText(status) {
      const map = {
        qualified: '合格',
        review: '需复检',
        risk: '异常'
      };
      return map[status] || '异常';
    },
    // 获取状态对应的主题色
    getStatusTheme(status) {
      const map = {
        qualified: 'success',
        review: 'warning',
        risk: 'danger'
      };
      return map[status] || 'warning';
    },
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
  cursor: pointer;
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

.result-group {
  margin-bottom: 16px;
}

.group-header {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-bottom: 8px;
  padding-left: 4px;
  display: flex;
  align-items: center;
  font-weight: 500;
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

.result-icon-wrapper.success {
  background-color: #e6f7ff; /* 浅蓝/浅绿，视TDesign success色而定，这里使用浅绿更合适 */
  background-color: var(--td-brand-color-light); /* 或使用 success 对应的浅色变量 */
  background-color: #E3F9E9; /* TDesign success light */
  color: #2BA471; /* TDesign success */
}

.result-icon-wrapper.danger {
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
  padding: 20px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-title {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
