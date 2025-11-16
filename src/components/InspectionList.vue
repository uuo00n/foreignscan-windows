<template>
  <div class="inspection-list">
    <!-- 顶部筛选标签：使用 TDesign Tabs -->
    <!-- 关键：使用 v-model 双向绑定当前标签页 -->
    <t-tabs v-model="activeTab" placement="top">
      <t-tab-panel value="all" label="全部" />
      <t-tab-panel value="detected" label="已检测" />
      <t-tab-panel value="undetected" label="未检测" />
      <t-tab-panel value="qualified" label="合格" />
      <t-tab-panel value="exception" label="异常" />
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
              <!-- 场景名：仅展示场景名，不再展示ID -->
              <div class="record-scene">{{ getSceneName(record) }}</div>
              <!-- 检测日期：显示在检测时间上方 -->
              <div class="record-date">检测日期：{{ safeDateText(record) }}</div>
              <!-- 检测时间：保持原有格式化逻辑 -->
              <div class="record-time">检测时间：{{ record.time || formatTime(record.timestamp) }}</div>
              <!-- 状态标签：使用 TDesign Tag，并根据状态动态主题颜色 -->
              <t-tag :theme="record && record.isDetected === true ? 'success' : (record && record.isDetected === false ? 'warning' : 'default')" variant="light" size="small">
                {{ record && record.isDetected === true ? '已检测' : '未检测' }}
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

    <!-- 将选择按钮放在底部导出按钮的上方，视觉更贴近列表操作区域 -->
    <div class="list-toolbar">
      <t-space>
        <t-button theme="primary" @click="selectAllFiltered">全选</t-button>
        <t-button variant="outline" @click="clearSelectionFiltered">取消</t-button>
      </t-space>
    </div>

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
    // 引入场景名称映射，用于根据 sceneId 显示场景中文名
    ...mapState(['inspectionRecords', 'currentRecord', 'backendStatus', 'backendError', 'sceneNameMap']),
    hasBackendError() {
      return this.backendStatus === 'error';
    },
    filteredRecords() {
      const records = this.inspectionRecords || [];
      const tab = this.activeTab;
      if (tab === 'all') return records;
      const first = records.length > 0 ? records[0] : null;
      if (first) {
        const fDet = first.isDetected === true;
        const fIssue = first.hasIssue === true;
        if (tab === 'detected' && fDet) return records;
        if (tab === 'undetected' && first.isDetected === false) return records;
        if (tab === 'qualified' && fDet && !fIssue) return records;
        if (tab === 'exception' && fDet && fIssue) return records;
      }
      return records.filter(r => {
        const det = r && r.isDetected === true;
        const issue = r && r.hasIssue === true;
        if (tab === 'detected') return det;
        if (tab === 'undetected') return r && r.isDetected === false;
        if (tab === 'qualified') return det && !issue;
        if (tab === 'exception') return det && issue;
        return true;
      });
    }
  },
  methods: {
    ...mapActions(['setCurrentRecord', 'fetchImagesFromServer', 'fetchSceneNameMap', 'fetchImagesByFilter']),
    selectRecord(record) {
      this.setCurrentRecord(record);
    },
    selectAllFiltered() {
      (this.filteredRecords || []).forEach(r => { if (r) r.selected = true; });
    },
    clearSelectionFiltered() {
      (this.filteredRecords || []).forEach(r => { if (r) r.selected = false; });
    },
    async retryConnection() {
      // 重试时按当前标签重新加载，避免仅请求全部列表
      await this.loadByTab();
    },
    getStatusText() {},
    statusTheme() {},
    // 仅展示场景名：根据 sceneId 查映射，若无映射则使用 record.sceneName/scene，最后回退“未知场景”
    getSceneName(record) {
      if (!record) return '未知场景';
      const id = record.sceneId != null ? String(record.sceneId) : null;
      const byMap = id && this.sceneNameMap ? this.sceneNameMap[id] : null;
      return byMap || record.sceneName || record.scene || '未知场景';
    },
    // 检测日期显示：优先使用 record.date；其次从 timestamp 格式化；都没有则显示“未知日期”
    safeDateText(record) {
      if (record && record.date) return record.date;
      if (record && record.timestamp) return this.formatDate(record.timestamp);
      return '未知日期';
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
    // 根据当前标签页加载数据：
    // - 全部：沿用旧接口获取所有图片
    // - 其余状态：改用 /images/filter 接口按状态获取
    async loadByTab() {
      // 关键节点：减少分支嵌套，提前返回
      if (this.activeTab === 'all') {
        await this.fetchImagesFromServer();
        return;
      }
      await this.fetchImagesByFilter({ status: this.activeTab });
    }
  },
  async mounted() {
    // 首次进入：根据当前标签加载数据
    await this.loadByTab();
    // 并行获取场景名称映射（若后端支持），用于将 sceneId 显示为中文名称
    try {
      await this.fetchSceneNameMap();
    } catch (e) {
      // 后端未提供映射或请求失败时忽略，保持“未知场景”回退
      console.warn('场景名称映射获取失败，已使用回退显示:', e);
    }
    
    // 如果有记录但没有选中的记录，默认选中第一个
    if (this.inspectionRecords.length > 0 && !this.currentRecord) {
      this.selectRecord(this.inspectionRecords[0]);
    }
  },
  watch: {
    // 监听标签切换：每次切换都重新请求并刷新列表
    activeTab: {
      immediate: false,
      async handler() {
        await this.loadByTab();
        // 切换标签后，如有数据默认选中第一条（优先选当前过滤后的第一条）
        const first = (this.filteredRecords && this.filteredRecords[0]) || (this.inspectionRecords && this.inspectionRecords[0]) || null;
        if (first) {
          this.selectRecord(first);
        }
      }
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

/* 场景名：替代原来的ID显示 */
.record-scene {
  font-weight: bold;          /* 强调场景名 */
  margin-bottom: 4px;         /* 与日期之间保持紧凑间距 */
}

/* 检测日期：显示在时间上方 */
.record-date {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;         /* 与时间之间保持紧凑间距 */
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

.list-toolbar {
  padding: 8px;
  display: flex;
  justify-content: center;
  border-top: 1px solid #e0e0e0;
}
</style>