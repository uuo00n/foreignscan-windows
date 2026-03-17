<template>
  <div class="date-list-page">
    <!-- 页面头部：桌面端缺少系统返回按钮，这里提供返回首页与标题 -->
    <header class="date-header" v-if="!embedded">
      <div class="left">
        <!-- 返回首页按钮：改为主色填充的圆形按钮，增强可见性 -->
        <t-button class="back-btn" theme="primary" shape="circle" size="medium" @click="goBack" title="返回首页">
          <ChevronLeftIcon size="20" />
        </t-button>
        <span class="title">按日期查看检测列表</span>
      </div>
    </header>
    <!-- 顶部筛选卡片 -->
    <t-card class="filters-card" :class="{ 'embedded-card': embedded }">
      <div class="filters">
        <div class="filters-left">
          <!-- 模式切换：单日 / 范围 -->
          <t-radio-group v-model="dateMode" variant="default-filled" @change="onModeChange">
            <t-radio-button value="single">单日</t-radio-button>
            <t-radio-button value="range">范围</t-radio-button>
          </t-radio-group>

          <!-- 日期选择区域动画 -->
          <transition name="fade" mode="out-in">
            <!-- 选择单日 -->
            <div v-if="dateMode === 'single'" key="single" class="date-picker-wrap">
              <t-date-picker
                v-model="singleDate"
                placeholder="选择日期"
                clearable
                @change="onFilterChange"
                style="width: 180px"
              />
            </div>

            <!-- 选择日期范围 -->
            <div v-else key="range" class="date-picker-wrap">
              <t-date-range-picker
                v-model="dateRange"
                placeholder="选择日期范围"
                clearable
                @change="onFilterChange"
                style="width: 260px"
              />
            </div>
          </transition>

          <!-- 选择房间 -->
          <t-select
            v-model="selectedRoom"
            placeholder="选择房间"
            clearable
            filterable
            @change="onRoomChange"
            style="width: 200px"
          >
            <t-option
              v-for="item in roomOptions"
              :key="item.id"
              :value="item.id"
              :label="item.name"
            />
          </t-select>

          <!-- 选择点位 -->
          <t-select
            v-model="selectedPoint"
            placeholder="选择点位"
            clearable
            filterable
            @change="onFilterChange"
            style="width: 200px"
          >
            <t-option
              v-for="item in pointOptions"
              :key="item.id"
              :value="item.id"
              :label="item.name"
            />
          </t-select>
        </div>

        <div class="filters-right">
          <t-button type="primary" @click="refresh">刷新</t-button>
          <t-button theme="default" @click="exportReport">
            <template #icon><DownloadIcon /></template>
            导出异常报告
          </t-button>
        </div>
      </div>
    </t-card>

    <!-- 列表内容卡片 -->
    <t-card class="content-card" :class="{ 'embedded-card': embedded }">
      <t-loading :loading="isLoading" text="加载中..." show-overlay>
        <div class="content-shell">
          <!-- 场景最新状态概览卡片 -->
          <t-card v-if="selectedPoint && currentSceneLatestInfo" :bordered="false" class="scene-status-card">
            <div class="scene-status-row">
              <div class="status-left">
                <span class="label">当前点位状态：</span>
                <t-tag :theme="sceneLatestTheme" variant="light" size="large">
                  {{ sceneLatestText }}
                </t-tag>
                <span class="sub-label" v-if="currentSceneLatestInfo.latestImage">
                  (最新更新: {{ formatTime(currentSceneLatestInfo.latestImage.createdAt) }})
                </span>
              </div>
              <div class="status-right" v-if="currentSceneLatestInfo.latestImage">
                <t-button variant="text" theme="primary" @click="viewLatestImage">查看最新图片</t-button>
              </div>
            </div>
          </t-card>

          <div v-if="inspectionRecords.length > 0" class="records-area">
            <div class="records-scroll">
              <t-list split>
                <transition-group name="list" tag="div">
                  <t-list-item
                    v-for="record in pagedRecords"
                    :key="record.id"
                    @click="selectRecord(record)"
                  >
                    <!-- 多行列表样式：顶部主信息（房间/点位 + 状态），底部次级信息（日期与时间） -->
                    <div class="item-col">
                      <div class="line-top">
                        <div class="record-title">{{ getSceneName(record) }}</div>
                        <t-tag :theme="statusTheme(record)" variant="light" size="small">
                          {{ getStatusText(record) }}
                        </t-tag>
                      </div>
                      <div class="record-subtitle">{{ formatDateValue(record.timestamp) }} {{ formatTime(record.timestamp) }}</div>
                    </div>
                  </t-list-item>
                </transition-group>
              </t-list>
            </div>

            <!-- 底部分页：仅在有数据时显示，支持切换页码与每页数量 -->
            <div class="pagination-bar">
              <!-- 使用 v-model 绑定当前页与每页数量；同时监听 change 以在部分版本中兼容 -->
              <t-pagination
                :total="inspectionRecords.length"
                v-model:current="currentPage"
                v-model:pageSize="pageSize"
                :pageSizeOptions="[10, 20, 50]"
                :showJumper="true"
                :showPageSize="true"
                @change="handlePaginationChange"
              />
            </div>
          </div>

          <!-- 空态：居中显示该筛选条件下无数据 -->
          <div v-else class="empty-state">
            <div class="empty-inner">
              <t-empty description="暂无数据" />
            </div>
          </div>
        </div>
      </t-loading>
    </t-card>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { getJson } from '../services/apiClient';
import { MessagePlugin } from 'tdesign-vue-next';
// 引入 TDesign 图标：左箭头图标用于返回
import { ChevronLeftIcon, DownloadIcon } from 'tdesign-icons-vue-next';

export default {
  name: 'DateListView',
  props: {
    embedded: {
      type: Boolean,
      default: false
    }
  },
  components: {
    // 注册图标组件，确保在模板中可用
    ChevronLeftIcon,
    DownloadIcon
  },
  computed: {
    ...mapState(['inspectionRecords', 'sceneNameMap', 'currentSceneLatestInfo', 'roomsTree', 'pointsByRoom']),
    roomOptions() {
      return Array.isArray(this.roomsTree) ? this.roomsTree.map((r) => ({ id: r.id, name: r.name || r.id })) : [];
    },
    pointOptions() {
      if (!this.selectedRoom) return [];
      return (this.pointsByRoom && this.pointsByRoom[this.selectedRoom]) || [];
    },
    // 分页后的记录：只渲染当前页应显示的数据
    pagedRecords() {
      const start = (this.currentPage - 1) * this.pageSize;
      return (this.inspectionRecords || []).slice(start, start + this.pageSize);
    },
    sceneLatestTheme() {
      if (!this.currentSceneLatestInfo) return 'default';
      if (this.currentSceneLatestInfo.hasIssue === true) return 'danger';
      if (this.currentSceneLatestInfo.latestStatus === '已检测') return 'success';
      if (this.currentSceneLatestInfo.latestStatus === '未检测') return 'warning';
      return 'default';
    },
    sceneLatestText() {
      if (!this.currentSceneLatestInfo) return '未知';
      if (this.currentSceneLatestInfo.hasIssue === true) return '异常';
      if (this.currentSceneLatestInfo.latestStatus === '已检测') return '合格';
      if (this.currentSceneLatestInfo.latestStatus === '未检测') return '未检测';
      return this.currentSceneLatestInfo.latestStatus || '未知';
    }
  },
  methods: {
    ...mapActions(['fetchImagesByFilter', 'fetchSceneNameMap', 'setCurrentRecord', 'fetchSceneLatestInfo']),
    // 返回首页：桌面端窗口无系统返回按钮，使用路由跳转到首页
    goBack() {
      this.$router.push({ name: 'home' });
    },
    async refresh() {
      this.isLoading = true;
      try {
        // 准备筛选参数
        const params = {
          status: 'all', // 默认获取全部状态
        };
        
        // 根据模式添加日期参数
        if (this.dateMode === 'single') {
          if (this.singleDate) {
            params.start = this.singleDate;
            params.end = this.singleDate; // 后端会自动扩展为当天的 00:00:00 - 23:59:59
          }
        } else {
          // 范围模式
          if (this.dateRange && this.dateRange.length === 2) {
            params.start = this.dateRange[0];
            params.end = this.dateRange[1];
          }
        }
        
        // 添加房间/点位参数
        if (this.selectedRoom) {
          params.roomId = this.selectedRoom;
        }
        if (this.selectedPoint) {
          params.pointId = this.selectedPoint;
        }

        // 调用后端筛选接口
        await this.fetchImagesByFilter(params);
        await this.fetchSceneLatestInfo(this.selectedPoint || null);
        // 刷新数据后重置为第一页
        this.currentPage = 1;
      } finally {
        this.isLoading = false;
      }
    },
    async exportReport() {
      // 导出异常报告：基于当前日期/房间点位筛选条件，强制状态为异常
      const qs = new URLSearchParams();
      // 强制只导出异常
      qs.set('status', '已检测');
      qs.set('hasIssue', 'true');
      // 请求包含检测详情（后端需要支持）
      qs.set('includeDetails', 'true');

      // 1. 日期参数
      if (this.dateMode === 'single') {
        if (this.singleDate) {
          qs.set('start', this.singleDate);
          qs.set('end', this.singleDate);
        }
      } else {
        if (this.dateRange && this.dateRange.length === 2) {
          qs.set('start', this.dateRange[0]);
          qs.set('end', this.dateRange[1]);
        }
      }

      // 2. 房间/点位参数
      if (this.selectedRoom) {
        qs.set('roomId', this.selectedRoom);
      }
      if (this.selectedPoint) {
        qs.set('pointId', this.selectedPoint);
      }

      try {
        const loadingMsg = MessagePlugin.loading({ content: '正在导出报告...', duration: 0 });
        const { ok, data } = await getJson(`/api/images/filter?${qs.toString()}`);
        MessagePlugin.close(loadingMsg);

        if (!ok) {
          MessagePlugin.error((data && data.message) || '导出失败');
          return;
        }

        const records = Array.isArray(data.images) ? data.images : (Array.isArray(data.list) ? data.list : []);
        if (records.length === 0) {
          MessagePlugin.warning('当前筛选条件下无异常记录');
          return;
        }

        // 3. 生成 CSV 内容
        // CSV Header
        let csvContent = '\uFEFF'; // BOM 防止乱码
        csvContent += "ID,房间点位,日期,时间,状态,缺陷详情\n";

        records.forEach(r => {
          // 处理字段
          const id = r.id || r._id || '';
          const scene = this.getSceneName(r); // 复用现有方法
          // timestamp: "2025-12-14T17:42:54.000Z"
          let dateStr = '';
          let timeStr = '';
          if (r.timestamp) {
            try {
              const d = new Date(r.timestamp);
              // 简单的格式化，或者复用 formatDateValue / formatTime
              // 这里手动格式化确保导出格式统一
              const pad = n => n < 10 ? '0' + n : n;
              dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
              timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            } catch (_) {}
          }
          const status = '缺陷'; // 既然是异常报告，状态统一为缺陷

          // 缺陷详情：拼接 detections 中的 label/class
          let details = '';
          const detList = r.detectionResults || r.detections || r.results;
          if (Array.isArray(detList)) {
            const types = detList.map(d => d.class || d.label || d.type || '未知缺陷');
            details = types.join('; ');
          }

          // CSV 转义处理：双引号转为两个双引号，整个字段包在双引号内
          const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

          const row = [
            escape(id),
            escape(scene),
            escape(dateStr),
            escape(timeStr),
            escape(status),
            escape(details)
          ].join(",");
          csvContent += row + "\n";
        });

        // 4. 触发下载
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const downloadUrl = URL.createObjectURL(blob);
        link.setAttribute("href", downloadUrl);
        const fileName = `abnormal_report_${new Date().toISOString().slice(0,10)}.csv`;
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        MessagePlugin.success(`成功导出 ${records.length} 条异常记录`);

      } catch (error) {
        console.error('导出报告出错:', error);
        MessagePlugin.closeAll();
        MessagePlugin.error('导出报告出错');
      }
    },
    viewLatestImage() {
      const image = this.currentSceneLatestInfo && this.currentSceneLatestInfo.latestImage;
      if (!image) return;
      this.setCurrentRecord(image);
      this.$router.push({ name: 'home' });
    },
    selectRecord(record) {
      // 选中记录后，便于右侧查看详情
      this.setCurrentRecord(record);
    },
    onFilterChange() {
      // 筛选条件变化时自动刷新
      this.refresh();
    },
    onRoomChange() {
      this.selectedPoint = '';
      this.onFilterChange();
    },
    onModeChange() {
      // 切换模式时，如果不希望自动刷新，可以不调用 refresh()
      // 但为了体验一致，这里也可以调用 refresh()，或者清空另一个模式的数据
      // 例如：切换到单日，清空范围；切换到范围，清空单日
      // 这里暂不自动清空，保留用户之前的输入习惯
      this.refresh();
    },
    // 分页变化兼容处理
    handlePaginationChange({ current, pageSize }) {
      // 只有当 pageSize 真正发生变化时才重置为第一页
      if (typeof pageSize === 'number' && pageSize !== this.pageSize) {
        this.pageSize = pageSize;
        this.currentPage = 1;
      } else if (typeof current === 'number') {
        // 仅切换页码
        this.currentPage = current;
      }
    },
    getSceneName(record) {
      if (!record) return '未知点位';
      const pointId = record.pointId != null ? String(record.pointId) : null;
      const byMap = pointId && this.sceneNameMap ? this.sceneNameMap[pointId] : null;
      // 优先使用映射名称，其次记录中的名称，最后回退到'未知点位'
      if (byMap) return byMap;
      const room = record.roomName || record.room || record.roomId || '';
      const point = record.pointName || record.point || record.pointId || '';
      if (room && point) return `${room} / ${point}`;
      if (room) return room;
      return '未知点位';
    },
    getStatusText(record) {
      const det = record && record.isDetected === true;
      const issue = record && record.hasIssue === true;
      if (det) return issue ? '缺陷' : '合格';
      const s = record && record.status;
      if (s === 'qualified' || s === '合格') return '合格';
      if (s === 'defect' || s === '缺陷' || s === '异常') return '缺陷';
      if (s === 'undetected' || s === '未检测') return '未检测';
      return '未知';
    },
    statusTheme(record) {
      const det = record && record.isDetected === true;
      const issue = record && record.hasIssue === true;
      if (det) return issue ? 'danger' : 'success';
      const s = record && record.status;
      if (s === 'undetected' || s === '未检测') return 'warning';
      if (s === 'qualified' || s === '合格') return 'success';
      if (s === 'defect' || s === '缺陷' || s === '异常') return 'danger';
      return 'default';
    },
    formatDateValue(ts) {
      if (!ts) return null;
      const date = new Date(ts);
      if (isNaN(date.getTime())) return null;
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  },
  data() {
    return {
      // 日期模式：'single' | 'range'
      dateMode: 'single',
      // 单日日期，默认不选中
      singleDate: '',
      // 日期范围，默认不选中
      dateRange: [],
      // 选中的房间/点位
      selectedRoom: '',
      selectedPoint: '',
      // 分页相关：当前页与每页数量（默认 10 条）
      currentPage: 1,
      pageSize: 10,
      isLoading: false
    };
  },
  watch: {
    // 监听记录列表变化，处理分页越界
    inspectionRecords(newList) {
      const totalPages = Math.max(1, Math.ceil(newList.length / this.pageSize));
      if (this.currentPage > totalPages) {
        this.currentPage = 1;
      }
    }
  },
  async mounted() {
    // 加载点位映射
    await this.fetchSceneNameMap();
    // 进入页面时加载数据
    await this.refresh();
  }
}
</script>

<style scoped>
.date-list-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 12px;
  gap: 12px;
  background-color: var(--td-bg-color-page);
}

.embedded-card {
  box-shadow: none;
}

.embedded-card :deep(.t-card__body) {
  height: 100%;
}

.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  border-radius: 6px;
  margin-bottom: 0;
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

.back-btn {
  box-shadow: 0 4px 12px rgba(0, 82, 217, 0.2);
}

.filters-card :deep(.t-card__body) {
  padding: 12px 16px;
}

.filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.filters-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.filters-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.date-picker-wrap {
  display: flex;
  align-items: center;
}

.scene-status-card {
  margin-bottom: 16px;
  background-color: var(--td-bg-color-container);
  border-radius: 6px;
  border: 1px solid var(--td-component-stroke);
}

.scene-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-left .label {
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.status-left .sub-label {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-left: 8px;
}

.content-card {
  flex: 1;
  min-height: 0;
}

.content-card :deep(.t-card__body) {
  height: 100%;
  padding: 16px;
}

.content-card :deep(.t-loading) {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.content-card :deep(.t-loading__content) {
  height: 100%;
}

.content-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.records-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.records-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* 多行列表：容器为纵向排列，行间距适中 */
.item-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
}

/* 第一行顶部：主信息与状态标签改为左对齐，去除中间大片留白 */
.line-top {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

/* 第二行底部：次级信息（日期时间）- 已弃用，直接使用 flex-column 布局 */
/*.line-bottom {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}*/

/* 主标题：房间/点位，更醒目 */
.record-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

/* 次级信息：日期与时间，弱化处理提升层次感 */
.record-subtitle {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.empty-state {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
}

.empty-inner {
  width: 100%;
  max-width: 420px;
  padding: 24px 12px;
  text-align: center;
}

.empty-inner :deep(.t-empty__description) {
  color: var(--td-text-color-secondary);
  margin-top: 8px;
}

/* 底部分页条：与列表保持适当间距，右对齐 */
.pagination-bar {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid var(--td-component-stroke);
}

@media (max-width: 1080px) {
  .filters-right {
    margin-left: 0;
    width: 100%;
    justify-content: flex-start;
  }
}

/* 动画样式 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
