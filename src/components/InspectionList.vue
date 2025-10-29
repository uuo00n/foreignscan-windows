<template>
  <div class="inspection-list">
    <div class="tabs">
      <div class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部</div>
      <div class="tab" :class="{ active: activeTab === 'qualified' }" @click="activeTab = 'qualified'">合格</div>
      <div class="tab" :class="{ active: activeTab === 'defect' }" @click="activeTab = 'defect'">缺陷</div>
      <div class="tab" :class="{ active: activeTab === 'undetected' }" @click="activeTab = 'undetected'">未检测</div>
    </div>
    <div class="list-container">
      <div 
        v-for="record in filteredRecords" 
        :key="record.id" 
        class="record-item"
        :class="{ active: currentRecord && currentRecord.id === record.id }"
        @click="selectRecord(record)"
      >
        <div class="checkbox">
          <input type="checkbox" :id="'check-' + record.id" v-model="record.selected">
        </div>
        <div class="record-info">
          <div class="record-id">{{ record.id }}</div>
          <div class="record-time">检测时间：{{ record.time }}</div>
          <div class="record-status" :class="record.status">{{ getStatusText(record.status) }}</div>
        </div>
      </div>
      <div class="no-data" v-if="filteredRecords.length === 0">
        <p>暂无数据</p>
      </div>
    </div>
    <div class="action-buttons">
      <button class="export-btn">导出报告</button>
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
    ...mapState(['inspectionRecords', 'currentRecord']),
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
    getStatusText(status) {
      switch(status) {
        case 'qualified': return '合格';
        case 'defect': return '缺陷';
        case 'pending': return '待检';
        case 'undetected': return '未检测';
        default: return '未知';
      }
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

.tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  font-size: 14px;
}

.tab.active {
  font-weight: bold;
  border-bottom: 2px solid #4285f4;
}

.list-container {
  flex: 1;
  overflow-y: auto;
}

.record-item {
  display: flex;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.record-item:hover {
  background-color: #f9f9f9;
}

.record-item.active {
  background-color: #e8f0fe;
}

.checkbox {
  display: flex;
  align-items: center;
  margin-right: 10px;
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

.record-status {
  display: inline-block;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
}

.record-status.qualified {
  background-color: #e6f4ea;
  color: #137333;
}

.record-status.defect {
  background-color: #fce8e6;
  color: #c5221f;
}

.record-status.pending {
  background-color: #e8eaed;
  color: #5f6368;
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

.export-btn {
  width: 100%;
  padding: 8px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>