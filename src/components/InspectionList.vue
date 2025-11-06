<template>
  <div class="inspection-list">
    <!-- 顶部筛选标签：使用 TDesign Tabs -->
    <!-- 关键：使用 v-model 双向绑定当前标签页 -->
    <t-tabs v-model="activeTab" placement="top">
      <t-tab-panel value="all" label="全部" />
      <t-tab-panel value="qualified" label="合格" />
      <t-tab-panel value="defect" label="缺陷" />
      <t-tab-panel value="undetected" label="未检测" />
    </t-tabs>

    <!-- 后端异常提示：使用 TDesign Alert -->
    <t-alert
      v-if="hasBackendError"
      theme="error"
      title="后端异常"
      :description="backendError || '请检查后端服务是否正常运行'"
      close
    >
      <template #operation>
        <t-button size="small" variant="base" @click="retryConnection">重试连接</t-button>
      </template>
    </t-alert>

    <!-- 列表容器与空态：后端正常时展示。根据筛选结果有无数据切换显示 -->
    <template v-else>
      <!-- 有数据：展示列表 -->
      <t-list v-if="filteredRecords.length > 0" class="list-container" split>
        <t-list-item
          v-for="record in filteredRecords"
          :key="record.id"
          @click="selectRecord(record)"
          :class="{ active: currentRecord && currentRecord.id === record.id }"
        >
          <div class="item-row">
            <!-- 选择框：使用 TDesign Checkbox -->
            <t-checkbox v-model="record.selected" :name="'check-' + record.id" />
            <div class="record-info">
              <div class="record-id">{{ formatDisplayId(record) }}</div>
              <div class="record-time">检测时间：{{ record.time || formatTime(record.timestamp) }}</div>
              <!-- 状态标签：使用 TDesign Tag，并根据状态动态主题颜色 -->
              <t-tag :theme="statusTheme(record.status)" variant="light" size="small">
                {{ getStatusText(record.status) }}
              </t-tag>
            </div>
          </div>
        </t-list-item>
      </t-list>
      <!-- 无数据：在列表区域居中显示空态 -->
      <div v-else class="list-empty">
        <!-- 使用 TDesign Empty 组件，容器通过 flex 居中 -->
        <t-empty description="暂无数据" />
      </div>
    </template>

    <!-- 底部操作按钮：使用 TDesign Button -->
    <div class="action-buttons">
      <t-button block type="primary" :disabled="filteredRecords.length === 0 || hasBackendError">导出报告</t-button>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'InspectionList',
  data() {
    return {
      activeTab: 'all'
    };
  },
  computed: {
    ...mapState(['inspectionRecords', 'currentRecord', 'backendStatus', 'backendError']),
    hasBackendError() {
      return this.backendStatus === 'error';
    },
    filteredRecords() {
      if (this.activeTab === 'all') {
        return this.inspectionRecords;
      } else if (this.activeTab === 'qualified') {
        return this.inspectionRecords.filter(record => record.status === 'qualified');
      } else if (this.activeTab === 'defect') {
        return this.inspectionRecords.filter(record => record.status === 'defect');
      } else if (this.activeTab === 'undetected') {
        return this.inspectionRecords.filter(record => record.status === 'undetected');
      }
      return this.inspectionRecords;
    }
  },
  methods: {
    ...mapActions(['setCurrentRecord', 'fetchImagesFromServer']),
    selectRecord(record) {
      this.setCurrentRecord(record);
    },
    async retryConnection() {
      await this.fetchImagesFromServer();
    },
    getStatusText(status) {
      switch(status) {
        case 'qualified': return '合格';
        case 'defect': return '缺陷';
        case 'pending': return '待检';
        case 'undetected': return '未检测';
        default: return '未知';
      }
    },
    // 根据状态返回 TDesign Tag 的主题颜色
    statusTheme(status) {
      switch (status) {
        case 'qualified': return 'success';
        case 'defect': return 'danger';
        case 'pending': return 'default';
        case 'undetected': return 'warning';
        default: return 'default';
      }
    },
    formatDisplayId(record) {
      // 如果没有timestamp或sceneId，则使用原始id
      if (!record.timestamp && !record.sceneId) {
        return record.id || '未知ID';
      }
      
      // 格式化日期和时间
      const date = this.formatDate(record.timestamp);
      const time = this.formatTime(record.timestamp);
      const sceneId = record.sceneId || '未知场景';
      
      // 返回格式化后的显示文本：日期-时间-场景id
      return `${date}-${time}-${sceneId}`;
    },
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    },
    async loadImages() {
      await this.fetchImagesFromServer();
    }
  },
  async mounted() {
    // 从服务器加载图片数据
    await this.loadImages();
    
    // 如果有记录但没有选中的记录，默认选中第一个
    if (this.inspectionRecords.length > 0 && !this.currentRecord) {
      this.selectRecord(this.inspectionRecords[0]);
    }
  }
}
</script>

<style scoped>
.inspection-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e0e0e0;
}

.list-container {
  flex: 1;
  overflow-y: auto;
}

/* 空态容器：填满列表区域，居中显示 */
.list-empty {
  flex: 1;
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
  padding: 16px;
}

.active {
  background-color: #f3f3f3;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.record-info {
  flex: 1;
}

.record-id {
  font-weight: bold;
  margin-bottom: 5px;
}

.record-time {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: #999;
  font-size: 14px;
  text-align: center;
}

.action-buttons {
  padding: 10px;
  display: flex;
  justify-content: center;
  border-top: 1px solid #e0e0e0;
}
</style>