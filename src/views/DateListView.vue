<template>
  <div class="date-list-page">
    <!-- 页面头部：桌面端缺少系统返回按钮，这里提供返回首页与标题 -->
    <header class="date-header" v-if="!isEmbedded">
      <div class="left">
        <!-- 返回首页按钮：改为主色填充的圆形按钮，增强可见性 -->
        <t-button class="back-btn" theme="primary" shape="circle" size="medium" @click="goBack" title="返回首页">
          <ChevronLeftIcon size="20" />
        </t-button>
        <span class="title">按日期查看检测列表</span>
      </div>
    </header>
    <!-- 顶部筛选：日期选择模式 + 日期选择 + 场景选择 + 刷新按钮 -->
    <t-card :bordered="false" :class="{ 'embedded-card': isEmbedded }">
      <div class="filters">
        <!-- 模式切换：单日 / 范围 -->
        <t-radio-group v-model="dateMode" variant="default-filled" @change="onModeChange">
          <t-radio-button value="single">单日</t-radio-button>
          <t-radio-button value="range">范围</t-radio-button>
        </t-radio-group>

        <!-- 日期选择区域动画 -->
        <transition name="fade" mode="out-in">
          <!-- 选择单日 -->
          <div v-if="dateMode === 'single'" key="single">
            <t-date-picker
              v-model="singleDate"
              placeholder="选择日期"
              clearable
              @change="onFilterChange"
              style="width: 180px"
            />
          </div>

          <!-- 选择日期范围 -->
          <div v-else key="range">
            <t-date-range-picker
              v-model="dateRange"
              placeholder="选择日期范围"
              clearable
              @change="onFilterChange"
              style="width: 260px"
            />
          </div>
        </transition>

        <!-- 选择场景 -->
        <t-select
          v-model="selectedScene"
          placeholder="选择场景"
          clearable
          filterable
          @change="onFilterChange"
          style="width: 200px"
        >
          <t-option
            v-for="(name, id) in sceneNameMap"
            :key="id"
            :value="id"
            :label="name"
          />
        </t-select>
        <t-button type="primary" @click="refresh">刷新</t-button>
        <t-button theme="default" @click="exportReport" style="margin-left: 8px">
          <template #icon><DownloadIcon /></template>
          导出异常报告
        </t-button>
      </div>
    </t-card>

    <!-- 列表区域：显示后端返回的数据 -->
    <div class="content">
      <t-loading :loading="isLoading" text="加载中..." show-overlay>
        <!-- 场景最新状态概览卡片 -->
        <t-card v-if="selectedScene && currentSceneLatestInfo" :bordered="false" class="scene-status-card">
          <div class="scene-status-row">
            <div class="status-left">
              <span class="label">当前场景状态：</span>
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

        <t-list v-if="inspectionRecords.length > 0" split>
          <transition-group name="list" tag="div">
            <t-list-item
              v-for="record in pagedRecords"
              :key="record.id"
              @click="selectRecord(record)"
            >
              <!-- 多行列表样式：顶部主信息（场景 + 状态），底部次级信息（日期与时间） -->
              <div class="item-col">
                <!-- 第一行：主信息（场景名称）与状态标签改为左对齐 -->
                <div class="line-top">
                  <div class="record-title">{{ getSceneName(record) }}</div>
                  <t-tag :theme="statusTheme(record)" variant="light" size="small">
                    {{ getStatusText(record) }}
                  </t-tag>
                </div>
                <!-- 第二行：次级信息（场景名称），单独一行 - 已移除，因为标题已显示场景名 -->
                <!-- <div class="record-scene">场景：{{ getSceneName(record) }}</div> -->
                <!-- 第三行：次级信息（日期 + 时间），单独一行 -->
                <div class="record-subtitle">{{ formatDateValue(record.timestamp) }} {{ formatTime(record.timestamp) }}</div>
              </div>
            </t-list-item>
          </transition-group>
        </t-list>

        <!-- 空态：居中显示该筛选条件下无数据 -->
        <div v-else class="empty">
          <t-empty description="暂无数据" />
        </div>

        <!-- 底部分页：仅在有数据时显示，支持切换页码与每页数量 -->
        <div v-if="inspectionRecords.length > 0" class="pagination-bar">
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
      </t-loading>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { getJson } from '../services/apiClient';
// 引入 TDesign 图标：左箭头图标用于返回
import { ChevronLeftIcon, DownloadIcon } from 'tdesign-icons-vue-next';

export default {
  name: 'DateListView',
  components: {
    // 注册图标组件，确保在模板中可用
    ChevronLeftIcon,
    DownloadIcon
  },
  computed: {
    ...mapState(['inspectionRecords', 'sceneNameMap', 'currentSceneLatestInfo']),
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
        
        // 添加场景参数
        if (this.selectedScene) {
          params.sceneId = this.selectedScene;
        }

        // 调用后端筛选接口
        await this.fetchImagesByFilter(params);
        await this.fetchSceneLatestInfo(this.selectedScene || null);
        // 刷新数据后重置为第一页
        this.currentPage = 1;
      } finally {
        this.isLoading = false;
      }
    },
    async exportReport() {
      // 导出异常报告：基于当前日期/场景筛选条件，强制状态为异常
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

      // 2. 场景参数
      if (this.selectedScene) {
        qs.set('sceneId', this.selectedScene);
      }

      try {
        this.$message.loading('正在导出报告...', 0);
        const { ok, data } = await getJson(`/api/images/filter?${qs.toString()}`);
        
        // 关闭 loading
        this.$message.closeAll();

        if (!ok) {
          this.$message.error((data && data.message) || '导出失败');
          return;
        }

        const records = Array.isArray(data.images) ? data.images : (Array.isArray(data.list) ? data.list : []);
        if (records.length === 0) {
          this.$message.warning('当前筛选条件下无异常记录');
          return;
        }

        // 3. 生成 CSV 内容
        // CSV Header
        let csvContent = '\uFEFF'; // BOM 防止乱码
        csvContent += "ID,场景,日期,时间,状态,缺陷详情\n";

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

        this.$message.success(`成功导出 ${records.length} 条异常记录`);

      } catch (error) {
        console.error('导出报告出错:', error);
        this.$message.closeAll();
        this.$message.error('导出报告出错');
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
      if (!record) return '未知场景';
      const id = record.sceneId != null ? String(record.sceneId) : null;
      const byMap = id && this.sceneNameMap ? this.sceneNameMap[id] : null;
      // 优先使用映射名称，其次记录中的名称，最后回退到'未知场景'（不再显示ID）
      return byMap || record.sceneName || record.scene || '未知场景';
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
      // 选中的场景ID
      selectedScene: '',
      // 分页相关：当前页与每页数量（默认 10 条）
      currentPage: 1,
      pageSize: 10,
      isEmbedded: false,
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
    // 判断是否在 iframe 中
    try {
      if (window.self !== window.top) {
        this.isEmbedded = true;
      }
    } catch (e) {
      this.isEmbedded = true;
    }

    // 加载场景映射
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
  height: 100%;
  padding: 12px;
  background-color: var(--td-bg-color-page);
}

.embedded-card {
  box-shadow: none !important;
  background: transparent !important;
}

.embedded-card :deep(.t-card__body) {
  padding: 0 !important;
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

.scene-status-card {
  margin-bottom: 12px;
  background-color: #fff;
  border-radius: 4px;
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
  color: #333;
}

.status-left .sub-label {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.content {
  margin-top: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 多行列表：容器为纵向排列，行间距适中 */
.item-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
}

.record-scene {
  font-size: 12px;
  color: #666;
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

/* 主标题：场景名称/ID，更醒目 */
.record-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* 次级信息：日期与时间，弱化处理提升层次感 */
.record-subtitle {
  font-size: 12px;
  color: #666;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 底部分页条：与列表保持适当间距，右对齐 */
.pagination-bar {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
<style scoped>
/* 修复：将返回按钮样式置于 <style> 内，避免 SFC 解析错误 */
.back-btn {
  /* 提高可见性与可点击性 */
  box-shadow: 0 4px 12px rgba(0, 82, 217, 0.2);
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
