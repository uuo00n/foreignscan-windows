<template>
  <div class="date-list-page">
    <!-- 页面头部：桌面端缺少系统返回按钮，这里提供返回首页与标题 -->
    <header class="date-header">
      <div class="left">
        <!-- 返回首页按钮：改为主色填充的圆形按钮，增强可见性 -->
        <t-button class="back-btn" theme="primary" shape="circle" size="medium" @click="goBack" title="返回首页">
          <ChevronLeftIcon size="20" />
        </t-button>
        <span class="title">按日期查看检测列表</span>
      </div>
    </header>
    <!-- 顶部筛选：日期选择器 + 刷新按钮 -->
    <t-card>
      <div class="filters">
        <!-- 选择日期：使用 TDesign DatePicker -->
        <t-date-picker
          v-model="selectedDate"
          mode="date"
          placeholder="选择日期"
          clearable
          @change="onDateChange"
        />
        <t-button type="primary" @click="refresh">刷新</t-button>
      </div>
    </t-card>

    <!-- 列表区域：按选择的日期过滤显示 -->
    <div class="content">
      <t-list v-if="filteredRecords.length > 0" split>
        <t-list-item
          v-for="record in filteredRecords"
          :key="record.id"
          @click="selectRecord(record)"
        >
          <div class="item-row">
            <div class="record-id">{{ formatDisplayId(record) }}</div>
            <div class="record-time">检测时间：{{ formatTime(record.timestamp) }}</div>
            <t-tag :theme="statusTheme(record.status)" variant="light" size="small">
              {{ getStatusText(record.status) }}
            </t-tag>
          </div>
        </t-list-item>
      </t-list>

      <!-- 空态：居中显示该日期暂无数据 -->
      <div v-else class="empty">
        <t-empty description="该日期暂无数据" />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
// 引入 TDesign 图标：左箭头图标用于返回
import { ChevronLeftIcon } from 'tdesign-icons-vue-next';

export default {
  name: 'DateListView',
  components: {
    // 注册图标组件，确保在模板中可用
    ChevronLeftIcon
  },
  data() {
    return {
      // 选中的日期，默认设为今天
      selectedDate: this.formatDateValue(new Date())
    };
  },
  computed: {
    ...mapState(['inspectionRecords']),
    // 根据选中日期过滤记录
    filteredRecords() {
      if (!this.selectedDate) return [];
      const selected = this.selectedDate; // YYYY-MM-DD
      return (this.inspectionRecords || []).filter(rec => {
        const d = this.formatDateValue(rec.timestamp);
        return d === selected;
      });
    }
  },
  methods: {
    ...mapActions(['fetchImagesFromServer', 'setCurrentRecord']),
    // 返回首页：桌面端窗口无系统返回按钮，使用路由跳转到首页
    goBack() {
      this.$router.push({ name: 'home' });
    },
    async refresh() {
      // 刷新后端数据
      await this.fetchImagesFromServer();
    },
    selectRecord(record) {
      // 选中记录后，便于右侧查看详情（返回首页或维持本页逻辑均可）
      this.setCurrentRecord(record);
    },
    onDateChange(val) {
      // 日期选择变化时更新列表
      this.selectedDate = val;
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
    statusTheme(status) {
      switch (status) {
        case 'qualified': return 'success';
        case 'defect': return 'danger';
        case 'pending': return 'default';
        case 'undetected': return 'warning';
        default: return 'default';
      }
    },
    formatDateValue(ts) {
      // 将时间戳或 ISO 字符串转为 YYYY-MM-DD 字符串
      // 若无有效时间戳，返回 null，避免错误匹配
      if (!ts) return null;
      const date = new Date(ts);
      if (isNaN(date.getTime())) return null;
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    },
    formatDisplayId(record) {
      if (!record.timestamp && !record.sceneId) {
        return record.id || '未知ID';
      }
      const date = this.formatDateValue(record.timestamp);
      const time = this.formatTime(record.timestamp);
      const sceneId = record.sceneId || '未知场景';
      return `${date} ${time} - ${sceneId}`;
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  },
  async mounted() {
    // 进入页面时加载后端数据
    await this.refresh();
  }
}
</script>

<style scoped>
.date-list-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
}

.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.date-header .left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-header .title {
  font-size: 16px;
  font-weight: 600;
}

.filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.content {
  margin-top: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
.back-btn {
  /* 提高可见性与可点击性 */
  box-shadow: 0 4px 12px rgba(0, 82, 217, 0.2);
}