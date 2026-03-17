<template>
  <div class="scene-preview-container">
    <t-card :bordered="false" class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <t-space :break-line="true" :size="12">
            <t-button theme="primary" :disabled="roomsTree.length === 0" @click="openCreateDialog">
              新增点位
            </t-button>
            <t-button
              :theme="multiSelectMode ? 'primary' : 'default'"
              variant="outline"
              :disabled="filteredPoints.length === 0"
              @click="toggleMultiSelectMode"
            >
              {{ multiSelectMode ? '退出批量删除' : '批量删除' }}
            </t-button>
            <t-button theme="default" @click="openImportDialog">
              <template #icon><UploadIcon /></template>
              配置导入
            </t-button>
            <t-button theme="default" @click="downloadTemplate">
              <template #icon><DownloadIcon /></template>
              下载模板
            </t-button>
            <t-button variant="outline" @click="fetchScenes">
              <template #icon><RefreshIcon /></template>
              刷新
            </t-button>
          </t-space>
        </div>

        <div class="toolbar-right">
          <t-radio-group v-model="viewMode" variant="default-filled">
            <t-radio-button value="grid">宫格</t-radio-button>
            <t-radio-button value="list">列表</t-radio-button>
          </t-radio-group>
        </div>
      </div>
    </t-card>

    <div class="content-layout">
      <aside class="rooms-panel">
        <div class="rooms-title">房间列表</div>
        <t-menu
          v-if="roomsTree.length > 0"
          :value="menuActiveRoomId"
          width="100%"
          class="rooms-menu"
          @change="handleRoomChange"
        >
          <t-menu-item v-for="room in roomsTree" :key="room.id" :value="String(room.id)">
            {{ room.name || room.id }}
          </t-menu-item>
        </t-menu>
        <div v-else class="rooms-empty">
          <t-empty description="暂无房间数据" />
        </div>
      </aside>

      <section class="points-panel">
        <div class="points-header" v-if="roomsTree.length > 0">
          <div class="title">{{ pointsHeaderTitle }}</div>
          <div class="meta">显示 {{ filteredPoints.length }} / {{ basePoints.length }}</div>
        </div>
        <div class="points-search" v-if="roomsTree.length > 0">
          <t-space :break-line="true" align="center" :size="12">
            <t-input
              v-model="searchKeyword"
              clearable
              class="search-input"
              placeholder="搜索点位ID/名称/编码/位置/房间"
            />
            <t-radio-group v-model="searchScope" variant="default-filled">
              <t-radio-button value="room">当前房间</t-radio-button>
              <t-radio-button value="all">全房间</t-radio-button>
            </t-radio-group>
          </t-space>
        </div>
        <div class="bulk-actions" v-if="roomsTree.length > 0 && multiSelectMode">
          <t-space :break-line="true" align="center" :size="10">
            <span class="bulk-selected">已选 {{ selectedCount }} 项</span>
            <t-button size="small" variant="outline" :disabled="pagedRoomPoints.length === 0" @click="selectCurrentPage">
              全选当前页
            </t-button>
            <t-button size="small" variant="outline" :disabled="filteredPoints.length === 0" @click="selectFiltered">
              全选筛选结果
            </t-button>
            <t-button size="small" variant="outline" :disabled="selectedCount === 0" @click="clearSelection">
              清空选择
            </t-button>
            <t-button size="small" theme="danger" :disabled="selectedCount === 0" @click="openBulkDeleteDialog">
              批量删除（选中{{ selectedCount }}）
            </t-button>
          </t-space>
        </div>

        <t-loading :loading="loading">
          <div class="points-content">
            <template v-if="filteredPoints.length > 0">
              <template v-if="viewMode === 'grid'">
                <div class="scene-grid" ref="gridScrollRef">
                  <t-card class="scene-card" hover-shadow v-for="point in pagedRoomPoints" :key="point.id">
                <template #cover>
                  <t-image-viewer v-if="sceneCovers[point.id]" :images="[sceneCovers[point.id]]">
                    <template #trigger="{ open }">
                      <div class="card-cover clickable" @click="open">
                        <img :src="sceneCovers[point.id]" alt="cover" class="cover-img" loading="lazy" />
                      </div>
                    </template>
                  </t-image-viewer>
                  <div v-else class="card-cover">
                    <div class="cover-placeholder">
                      <ImageIcon size="32" />
                      <span>暂无对照图</span>
                    </div>
                  </div>
                </template>

                  <div class="scene-info">
                    <div class="scene-select" v-if="multiSelectMode">
                      <t-checkbox
                        :checked="isPointSelected(point.id)"
                        @change="(checked) => togglePointSelection(point.id, checked)"
                      />
                    </div>
                    <div class="scene-text">
                      <h3>{{ point.name || point.id }}</h3>
                      <p class="scene-id">点位ID: {{ point.id }}</p>
                      <p class="scene-room" v-if="searchScope === 'all'">房间: {{ point.roomName || point.roomId }}</p>
                    </div>
                    <div class="scene-actions">
                      <t-button size="small" variant="outline" @click="triggerUpload(point)">
                        {{ sceneCovers[point.id] ? '更新对照图' : '上传对照图' }}
                      </t-button>
                    </div>
                  </div>
                </t-card>
              </div>
              <div class="points-pagination" v-if="showGridPagination">
                <t-pagination
                  :total="filteredPoints.length"
                  v-model:current="gridCurrentPage"
                  v-model:pageSize="gridPageSize"
                  :pageSizeOptions="[24, 48, 96]"
                  :showJumper="true"
                  :showPageSize="true"
                  @change="handleGridPageChange"
                />
              </div>
            </template>

              <t-list
                v-else
                ref="listScrollRef"
                class="point-list"
                split
              >
                <t-list-item v-for="point in filteredPoints" :key="point.id">
                  <div class="point-row">
                    <div class="point-select" v-if="multiSelectMode">
                      <t-checkbox
                        :checked="isPointSelected(point.id)"
                        @change="(checked) => togglePointSelection(point.id, checked)"
                      />
                    </div>
                    <div class="point-thumb">
                      <t-image-viewer v-if="sceneCovers[point.id]" :images="[sceneCovers[point.id]]">
                        <template #trigger="{ open }">
                          <div class="point-thumb-box clickable" @click="open">
                            <img :src="sceneCovers[point.id]" alt="cover" class="cover-img" loading="lazy" />
                          </div>
                        </template>
                      </t-image-viewer>
                      <div v-else class="point-thumb-box">
                        <div class="cover-placeholder small">
                          <ImageIcon size="20" />
                          <span>无图</span>
                        </div>
                      </div>
                    </div>

                    <div class="point-main">
                      <div class="point-title">{{ point.name || point.id }}</div>
                      <div class="point-id">点位ID: {{ point.id }}</div>
                      <div class="point-room" v-if="searchScope === 'all'">房间: {{ point.roomName || point.roomId }}</div>
                    </div>

                    <div class="point-actions">
                      <t-button size="small" variant="outline" @click="triggerUpload(point)">
                        {{ sceneCovers[point.id] ? '更新对照图' : '上传对照图' }}
                      </t-button>
                    </div>
                  </div>
                </t-list-item>
              </t-list>
            </template>

            <div v-else class="empty-state">
              <t-empty :description="emptyDescription" />
            </div>
          </div>
        </t-loading>
        <t-button
          v-if="showBackToTop"
          class="back-top-btn"
          shape="circle"
          size="large"
          theme="primary"
          :style="backTopStyle"
          @click="scrollToTop"
        >
          <template #icon><BacktopIcon /></template>
        </t-button>
      </section>
    </div>

    <input
      type="file"
      ref="fileInputRef"
      style="display: none"
      accept="image/*"
      @change="handleFileChange"
    />

    <t-dialog
      v-model:visible="createDialogVisible"
      header="新增点位"
      width="560px"
      :close-on-overlay-click="false"
      :close-btn="!creating"
    >
      <div class="create-point-body">
        <t-select v-model="createForm.roomId" placeholder="请选择所属房间">
          <t-option v-for="room in roomsTree" :key="room.id" :label="room.name || room.id" :value="String(room.id)" />
        </t-select>
        <t-input v-model="createForm.name" placeholder="点位名称（必填）" />
        <t-input v-model="createForm.code" placeholder="点位编码（可选）" />
        <t-input v-model="createForm.location" placeholder="点位位置（可选）" />
      </div>
      <template #footer>
        <t-space>
          <t-button variant="outline" :disabled="creating" @click="closeCreateDialog">取消</t-button>
          <t-button theme="primary" :loading="creating" @click="executeCreatePoint">确认新增</t-button>
        </t-space>
      </template>
    </t-dialog>

    <t-dialog
      v-model:visible="bulkDeleteDialogVisible"
      header="批量删除点位"
      width="520px"
      :close-on-overlay-click="false"
      :close-btn="!deleting"
    >
      <div class="confirm-body">
        <p>确认删除已选中的 <b>{{ selectedCount }}</b> 个点位吗？</p>
        <p>仅无关联样式图/图片/检测记录的点位允许删除。</p>
        <p>删除将逐条执行，失败项会在完成后统一汇总提示。</p>
      </div>
      <template #footer>
        <t-space>
          <t-button variant="outline" :disabled="deleting" @click="closeBulkDeleteDialog">取消</t-button>
          <t-button theme="danger" :loading="deleting" :disabled="selectedCount === 0" @click="executeBulkDelete">
            确认批量删除
          </t-button>
        </t-space>
      </template>
    </t-dialog>

    <t-dialog
      v-model:visible="importDialogVisible"
      header="配置导入中心"
      width="760px"
      :close-on-overlay-click="false"
    >
      <div class="import-dialog-body">
        <t-alert
          theme="warning"
          title="导入会重建 rooms/points 并清空历史检测数据"
          description="请先下载模板并校验配置，再执行导入。"
        />

        <t-upload
          accept=".json,application/json"
          :auto-upload="false"
          :multiple="false"
          :max="1"
          @select-change="handleImportSelectChange"
          @remove="handleImportRemove"
        >
          <t-button variant="outline">
            <template #icon><UploadIcon /></template>
            选择 JSON 配置
          </t-button>
        </t-upload>

        <div class="import-file" v-if="importFileName">
          <span class="label">已选择文件：</span>
          <span class="value">{{ importFileName }}</span>
        </div>

        <div class="import-summary" v-if="hasImportPayload">
          <div>房间数：{{ importSummary.roomCount }}</div>
          <div>点位数：{{ importSummary.pointCount }}</div>
        </div>

        <div class="import-tip">
          模板字段：rooms[].id/name/model_path/points[].id/name
        </div>
      </div>

      <template #footer>
        <t-space>
          <t-button variant="outline" @click="closeImportDialog">取消</t-button>
          <t-button theme="danger" :disabled="!hasImportPayload" @click="beginImportFlow">
            开始导入
          </t-button>
        </t-space>
      </template>
    </t-dialog>

    <t-dialog
      v-model:visible="confirmDialogVisible"
      header="二次确认"
      width="520px"
      :close-on-overlay-click="false"
      :close-btn="!importing"
    >
      <div class="confirm-body">
        <p>该操作将清空历史检测数据并重建房间与点位配置。</p>
        <p>请输入确认词 <b>IMPORT</b> 继续：</p>
        <t-input v-model="confirmKeyword" placeholder="请输入 IMPORT" />
      </div>

      <template #footer>
        <t-space>
          <t-button variant="outline" :disabled="importing" @click="confirmDialogVisible = false">取消</t-button>
          <t-button
            theme="danger"
            :loading="importing"
            :disabled="confirmKeyword !== 'IMPORT'"
            @click="executeImport"
          >
            确认导入
          </t-button>
        </t-space>
      </template>
    </t-dialog>
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { UploadIcon, ImageIcon, DownloadIcon, RefreshIcon, BacktopIcon } from 'tdesign-icons-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { apiBaseUrl } from '../services/apiClient';

const TEMPLATE = {
  rooms: [
    {
      id: 'room1',
      name: 'Room 1',
      description: '示例房间',
      model_path: 'models/room1_model.pt',
      status: 'enabled',
      points: [
        { id: 'point1', name: 'Point 1', code: 'P1', location: 'A-1' },
        { id: 'point2', name: 'Point 2', code: 'P2', location: 'A-2' }
      ]
    }
  ]
};

const normalizeImportPayload = (raw) => {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.rooms) || raw.rooms.length === 0) {
    throw new Error('JSON 结构无效：rooms 不能为空');
  }

  const rooms = raw.rooms.map((room, roomIndex) => {
    const id = String(room?.id || '').trim();
    const name = String(room?.name || '').trim();
    const modelPath = String(room?.model_path || room?.modelPath || '').trim();
    const status = String(room?.status || 'enabled').trim();
    const description = String(room?.description || '').trim();

    if (!id) throw new Error(`第 ${roomIndex + 1} 个房间缺少 id`);
    if (!name) throw new Error(`房间 ${id} 缺少 name`);
    if (!modelPath) throw new Error(`房间 ${id} 缺少 model_path`);

    const rawPoints = Array.isArray(room?.points) ? room.points : [];
    const points = rawPoints.map((point, pointIndex) => {
      const pointId = String(point?.id || '').trim();
      const pointName = String(point?.name || '').trim();
      if (!pointId) throw new Error(`房间 ${id} 的第 ${pointIndex + 1} 个点位缺少 id`);
      if (!pointName) throw new Error(`点位 ${pointId} 缺少 name`);
      return {
        id: pointId,
        name: pointName,
        code: String(point?.code || '').trim(),
        location: String(point?.location || '').trim()
      };
    });

    return {
      id,
      name,
      description,
      model_path: modelPath,
      status,
      points
    };
  });

  return { rooms };
};

export default {
  name: 'ScenePreview',
  components: {
    UploadIcon,
    ImageIcon,
    DownloadIcon,
    RefreshIcon,
    BacktopIcon
  },
  setup() {
    const store = useStore();

    const loading = ref(false);
    const importing = ref(false);
    const importDialogVisible = ref(false);
    const confirmDialogVisible = ref(false);
    const confirmKeyword = ref('');

    const importFileName = ref('');
    const importPayload = ref(null);
    const importSummary = reactive({ roomCount: 0, pointCount: 0 });
    const creating = ref(false);
    const deleting = ref(false);
    const createDialogVisible = ref(false);
    const bulkDeleteDialogVisible = ref(false);
    const multiSelectMode = ref(false);
    const selectedPointIds = ref([]);
    const createForm = reactive({
      roomId: '',
      name: '',
      code: '',
      location: ''
    });

    const sceneCovers = reactive({});
    const fileInputRef = ref(null);
    const gridScrollRef = ref(null);
    const listScrollRef = ref(null);
    const showBackToTop = ref(false);
    const uploadPointId = ref(null);
    const selectedRoomId = ref('');
    const viewMode = ref('grid');
    const gridCurrentPage = ref(1);
    const gridPageSize = ref(24);
    const searchKeyword = ref('');
    const searchScope = ref('room');

    const scenes = computed(() => store.getters.scenes || []);
    const roomsTree = computed(() => store.getters.roomsTree || []);
    const firstRoomId = computed(() => {
      const room = Array.isArray(roomsTree.value) ? roomsTree.value[0] : null;
      return room ? String(room.id || '') : '';
    });

    const currentRoomPoints = computed(() => {
      if (!selectedRoomId.value) return [];
      return scenes.value.filter((p) => String(p.roomId || '') === String(selectedRoomId.value));
    });

    const currentRoomName = computed(() => {
      const room = roomsTree.value.find((item) => String(item.id || '') === String(selectedRoomId.value));
      return room ? (room.name || room.id) : '未选择房间';
    });
    const menuActiveRoomId = computed(() => {
      return searchScope.value === 'all' ? '' : selectedRoomId.value;
    });
    const basePoints = computed(() => {
      if (searchScope.value === 'all') return scenes.value;
      return currentRoomPoints.value;
    });
    const filteredPoints = computed(() => {
      const keyword = String(searchKeyword.value || '').trim().toLowerCase();
      if (!keyword) return basePoints.value;
      return basePoints.value.filter((point) => {
        const fields = [
          point.id,
          point.name,
          point.code,
          point.location,
          point.roomName
        ];
        return fields.some((field) => String(field || '').toLowerCase().includes(keyword));
      });
    });
    const pointsHeaderTitle = computed(() => {
      return searchScope.value === 'all' ? '全房间点位列表' : currentRoomName.value;
    });
    const emptyDescription = computed(() => {
      const keyword = String(searchKeyword.value || '').trim();
      if (keyword) return '未找到匹配点位';
      if (roomsTree.value.length === 0) return '暂无点位数据';
      return searchScope.value === 'all' ? '暂无点位数据' : '当前房间暂无点位数据';
    });
    const pagedRoomPoints = computed(() => {
      const start = (gridCurrentPage.value - 1) * gridPageSize.value;
      return filteredPoints.value.slice(start, start + gridPageSize.value);
    });
    const showGridPagination = computed(() => {
      return viewMode.value === 'grid' && filteredPoints.value.length > gridPageSize.value;
    });
    const backTopStyle = computed(() => ({
      bottom: showGridPagination.value ? '76px' : '18px'
    }));
    const selectedCount = computed(() => selectedPointIds.value.length);
    const selectedPointIdSet = computed(() => new Set(selectedPointIds.value));
    const selectedPoints = computed(() => {
      if (selectedPointIds.value.length === 0) return [];
      const map = new Map(filteredPoints.value.map((point) => [String(point.id), point]));
      return selectedPointIds.value.map((id) => map.get(String(id))).filter(Boolean);
    });

    const hasImportPayload = computed(() => {
      return !!(importPayload.value && Array.isArray(importPayload.value.rooms) && importPayload.value.rooms.length > 0);
    });

    const clearImportState = () => {
      importFileName.value = '';
      importPayload.value = null;
      importSummary.roomCount = 0;
      importSummary.pointCount = 0;
      confirmKeyword.value = '';
    };

    const resolveImagePath = (img) => {
      if (!img) return null;
      let path = img.path || img.url || '';

      if (!path && img.pointId && img.filename) {
        path = `uploads/styles/${img.roomId || ''}/${img.pointId}/${img.filename}`;
      }
      if (!path) return null;
      if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
        return path;
      }

      path = path.replace(/\\/g, '/');
      if (path.startsWith('/')) path = path.slice(1);

      let base = apiBaseUrl;
      if (base.endsWith('/')) base = base.slice(0, -1);
      return `${base}/${path}`;
    };

    const fetchPointCover = async (pointId) => {
      const images = await store.dispatch('fetchStyleImagesByScene', pointId);
      if (images && images.length > 0) {
        const fullPath = resolveImagePath(images[0]);
        if (fullPath) sceneCovers[pointId] = fullPath;
      } else {
        delete sceneCovers[pointId];
      }
    };

    const fetchScenes = async () => {
      loading.value = true;
      try {
        await store.dispatch('fetchSceneNameMap');
        const styleImages = await store.dispatch('fetchStyleImages');

        Object.keys(sceneCovers).forEach((key) => delete sceneCovers[key]);

        if (Array.isArray(styleImages)) {
          styleImages.forEach((img) => {
            const pointId = img.pointId || img.PointID || img.point_id;
            if (!pointId || sceneCovers[pointId]) return;
            const fullPath = resolveImagePath(img);
            if (fullPath) sceneCovers[pointId] = fullPath;
          });
        }

        const rooms = Array.isArray(roomsTree.value) ? roomsTree.value : [];
        if (rooms.length === 0) {
          selectedRoomId.value = '';
        } else {
          const exists = rooms.some((room) => String(room.id || '') === String(selectedRoomId.value));
          if (!exists) {
            selectedRoomId.value = String(rooms[0].id || '');
          }
        }
        gridCurrentPage.value = 1;
        await nextTick();
        updateBackToTopVisible();
      } finally {
        loading.value = false;
      }
    };

    let removeActiveScrollListener = null;
    const unbindActiveScrollListener = () => {
      if (typeof removeActiveScrollListener === 'function') {
        removeActiveScrollListener();
      }
      removeActiveScrollListener = null;
    };
    const resolveScrollEl = (candidate) => {
      if (!candidate) return null;
      if (typeof HTMLElement !== 'undefined' && candidate instanceof HTMLElement) return candidate;
      if (candidate.$el && (typeof HTMLElement === 'undefined' || candidate.$el instanceof HTMLElement)) {
        return candidate.$el;
      }
      return null;
    };
    const getActiveScrollEl = () => {
      if (viewMode.value === 'grid') return resolveScrollEl(gridScrollRef.value);
      return resolveScrollEl(listScrollRef.value);
    };
    const updateBackToTopVisible = () => {
      const el = getActiveScrollEl();
      showBackToTop.value = !!(el && el.scrollTop > 240);
    };
    const bindActiveScrollListener = () => {
      unbindActiveScrollListener();
      const el = getActiveScrollEl();
      if (!el) {
        showBackToTop.value = false;
        return;
      }

      const onScroll = () => {
        showBackToTop.value = el.scrollTop > 240;
      };
      el.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      removeActiveScrollListener = () => {
        el.removeEventListener('scroll', onScroll);
      };
    };
    const scrollToTop = () => {
      const el = getActiveScrollEl();
      if (!el) return;
      el.scrollTo({ top: 0, behavior: 'smooth' });
      showBackToTop.value = false;
    };

    onMounted(async () => {
      await fetchScenes();
      await nextTick();
      bindActiveScrollListener();
    });
    onBeforeUnmount(() => {
      unbindActiveScrollListener();
    });
    const resetGridPage = () => {
      gridCurrentPage.value = 1;
    };
    const ensureGridPageInRange = () => {
      const maxPage = Math.max(1, Math.ceil(filteredPoints.value.length / gridPageSize.value));
      if (gridCurrentPage.value > maxPage) gridCurrentPage.value = 1;
    };

    watch([searchKeyword, searchScope], () => {
      resetGridPage();
    });
    watch(filteredPoints, (points) => {
      const visibleSet = new Set(points.map((item) => String(item.id)));
      selectedPointIds.value = selectedPointIds.value.filter((id) => visibleSet.has(String(id)));
      nextTick(() => {
        bindActiveScrollListener();
      });
    });
    watch(viewMode, async () => {
      await nextTick();
      bindActiveScrollListener();
    });

    const handleRoomChange = (value) => {
      if (searchScope.value === 'all') {
        searchScope.value = 'room';
      }
      selectedRoomId.value = String(value || '');
      resetGridPage();
    };
    const handleGridPageChange = ({ current, pageSize }) => {
      if (typeof pageSize === 'number' && pageSize !== gridPageSize.value) {
        gridPageSize.value = pageSize;
        gridCurrentPage.value = 1;
        ensureGridPageInRange();
        return;
      }
      if (typeof current === 'number') {
        gridCurrentPage.value = current;
      }
    };

    const isPointSelected = (pointId) => selectedPointIdSet.value.has(String(pointId));

    const togglePointSelection = (pointId, checked) => {
      const id = String(pointId || '');
      if (!id) return;
      const set = new Set(selectedPointIds.value.map((item) => String(item)));
      let nextChecked = !set.has(id);
      if (typeof checked === 'boolean') {
        nextChecked = checked;
      } else if (checked && typeof checked.checked === 'boolean') {
        nextChecked = checked.checked;
      }
      if (nextChecked) {
        set.add(id);
      } else {
        set.delete(id);
      }
      selectedPointIds.value = Array.from(set);
    };

    const clearSelection = () => {
      selectedPointIds.value = [];
    };

    const selectCurrentPage = () => {
      const set = new Set(selectedPointIds.value.map((item) => String(item)));
      pagedRoomPoints.value.forEach((point) => set.add(String(point.id)));
      selectedPointIds.value = Array.from(set);
    };

    const selectFiltered = () => {
      selectedPointIds.value = filteredPoints.value.map((point) => String(point.id));
    };

    const toggleMultiSelectMode = () => {
      multiSelectMode.value = !multiSelectMode.value;
      if (!multiSelectMode.value) {
        clearSelection();
        bulkDeleteDialogVisible.value = false;
      }
    };

    const triggerUpload = (point) => {
      uploadPointId.value = point.id;
      if (fileInputRef.value) {
        fileInputRef.value.value = '';
        fileInputRef.value.click();
      }
    };

    const handleFileChange = async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const pointId = uploadPointId.value;
      if (!pointId) return;

      const loadingMsg = MessagePlugin.loading({ content: '正在上传...', duration: 0 });
      try {
        const res = await store.dispatch('uploadImage', { file, pointId });
        if (res.success) {
          MessagePlugin.success('上传成功');
          await fetchPointCover(pointId);
        } else {
          MessagePlugin.error(res.message || '上传失败');
        }
      } finally {
        MessagePlugin.close(loadingMsg);
      }

      uploadPointId.value = null;
    };

    const resetCreateForm = () => {
      const currentRoom = String(selectedRoomId.value || '');
      if (!currentRoom) {
        createForm.roomId = firstRoomId.value;
      } else {
        createForm.roomId = currentRoom;
      }
      createForm.name = '';
      createForm.code = '';
      createForm.location = '';
    };

    const openCreateDialog = () => {
      if (!selectedRoomId.value && roomsTree.value.length > 0) {
        selectedRoomId.value = String(roomsTree.value[0].id || '');
      }
      resetCreateForm();
      createDialogVisible.value = true;
    };

    const closeCreateDialog = () => {
      createDialogVisible.value = false;
      resetCreateForm();
    };

    const executeCreatePoint = async () => {
      const roomId = String(createForm.roomId || '').trim();
      const name = String(createForm.name || '').trim();
      if (!roomId) {
        MessagePlugin.error('请选择所属房间');
        return;
      }
      if (!name) {
        MessagePlugin.error('点位名称不能为空');
        return;
      }

      creating.value = true;
      const loadingMsg = MessagePlugin.loading({ content: '正在新增点位...', duration: 0 });
      try {
        const res = await store.dispatch('createPoint', {
          roomId,
          name,
          code: createForm.code,
          location: createForm.location
        });
        if (!res.success) {
          MessagePlugin.error(res.message || '新增点位失败');
          return;
        }
        MessagePlugin.success('新增点位成功');
        selectedRoomId.value = roomId;
        closeCreateDialog();
        await fetchScenes();
      } finally {
        creating.value = false;
        MessagePlugin.close(loadingMsg);
      }
    };

    const openBulkDeleteDialog = () => {
      if (selectedCount.value === 0) {
        MessagePlugin.warning('请先选择需要删除的点位');
        return;
      }
      bulkDeleteDialogVisible.value = true;
    };

    const closeBulkDeleteDialog = () => {
      bulkDeleteDialogVisible.value = false;
    };

    const executeBulkDelete = async () => {
      if (selectedPoints.value.length === 0) {
        MessagePlugin.warning('请选择需要删除的点位');
        return;
      }

      deleting.value = true;
      const loadingMsg = MessagePlugin.loading({ content: '正在批量删除点位...', duration: 0 });
      try {
        const payload = selectedPoints.value.map((point) => ({
          roomId: point.roomId,
          pointId: point.id,
          name: point.name || point.id
        }));
        const result = await store.dispatch('deletePointsBatch', { points: payload });
        const successCount = Number(result?.successCount || 0);
        const failCount = Number(result?.failCount || 0);
        const failItems = Array.isArray(result?.failItems) ? result.failItems : [];

        if (failCount === 0) {
          MessagePlugin.success(`批量删除完成：成功 ${successCount} 项`);
        } else if (successCount === 0) {
          const first = failItems[0];
          MessagePlugin.error(`批量删除失败：共 ${failCount} 项失败${first?.message ? `（示例：${first.message}）` : ''}`);
        } else {
          const first = failItems[0];
          MessagePlugin.warning(`批量删除完成：成功 ${successCount} 项，失败 ${failCount} 项${first?.message ? `（示例：${first.message}）` : ''}`);
        }

        clearSelection();
        closeBulkDeleteDialog();
        await fetchScenes();
      } finally {
        deleting.value = false;
        MessagePlugin.close(loadingMsg);
      }
    };

    const downloadTemplate = () => {
      const blob = new Blob([`${JSON.stringify(TEMPLATE, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rooms-import-template.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      MessagePlugin.success('模板已下载');
    };

    const handleImportSelectChange = async (files) => {
      const file = Array.isArray(files) && files.length > 0 ? files[0] : null;
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const normalized = normalizeImportPayload(parsed);

        let pointCount = 0;
        normalized.rooms.forEach((room) => {
          pointCount += Array.isArray(room.points) ? room.points.length : 0;
        });

        importFileName.value = file.name || 'import.json';
        importPayload.value = normalized;
        importSummary.roomCount = normalized.rooms.length;
        importSummary.pointCount = pointCount;
        MessagePlugin.success('配置解析成功');
      } catch (error) {
        clearImportState();
        MessagePlugin.error(error.message || 'JSON 解析失败');
      }
    };

    const handleImportRemove = () => {
      clearImportState();
    };

    const openImportDialog = () => {
      clearImportState();
      importDialogVisible.value = true;
    };

    const closeImportDialog = () => {
      importDialogVisible.value = false;
      confirmDialogVisible.value = false;
      clearImportState();
    };

    const beginImportFlow = () => {
      if (!hasImportPayload.value) {
        MessagePlugin.error('请先选择并解析有效的 JSON 配置');
        return;
      }

      const confirmDialog = DialogPlugin.confirm({
        header: '危险操作确认',
        body: '导入将清空历史检测数据并重建房间/点位配置，是否继续？',
        theme: 'warning',
        confirmBtn: '继续',
        cancelBtn: '取消',
        onConfirm: () => {
          confirmKeyword.value = '';
          confirmDialog.hide();
          confirmDialogVisible.value = true;
        },
        onClose: () => {
          confirmDialog.destroy();
        }
      });
    };

    const executeImport = async () => {
      if (confirmKeyword.value !== 'IMPORT') {
        MessagePlugin.error('确认词不正确');
        return;
      }
      if (!hasImportPayload.value) {
        MessagePlugin.error('缺少可导入配置');
        return;
      }

      importing.value = true;
      const loadingMsg = MessagePlugin.loading({ content: '正在导入配置...', duration: 0 });
      try {
        const res = await store.dispatch('importRoomsConfig', importPayload.value);
        if (!res.success) {
          MessagePlugin.error(res.message || '导入失败');
          return;
        }

        MessagePlugin.success('导入成功，房间/点位已重建');
        confirmDialogVisible.value = false;
        importDialogVisible.value = false;
        clearImportState();
        await fetchScenes();
      } finally {
        importing.value = false;
        MessagePlugin.close(loadingMsg);
      }
    };

    return {
      scenes,
      roomsTree,
      currentRoomPoints,
      currentRoomName,
      basePoints,
      filteredPoints,
      pointsHeaderTitle,
      emptyDescription,
      pagedRoomPoints,
      showGridPagination,
      backTopStyle,
      menuActiveRoomId,
      selectedRoomId,
      viewMode,
      gridCurrentPage,
      gridPageSize,
      searchKeyword,
      searchScope,
      multiSelectMode,
      selectedCount,
      showBackToTop,
      loading,
      importing,
      creating,
      deleting,
      sceneCovers,
      fileInputRef,
      gridScrollRef,
      listScrollRef,

      createDialogVisible,
      bulkDeleteDialogVisible,
      createForm,
      importDialogVisible,
      confirmDialogVisible,
      confirmKeyword,
      importFileName,
      importSummary,
      hasImportPayload,

      fetchScenes,
      handleGridPageChange,
      handleRoomChange,
      isPointSelected,
      togglePointSelection,
      clearSelection,
      selectCurrentPage,
      selectFiltered,
      toggleMultiSelectMode,
      scrollToTop,
      triggerUpload,
      handleFileChange,
      openCreateDialog,
      closeCreateDialog,
      executeCreatePoint,
      openBulkDeleteDialog,
      closeBulkDeleteDialog,
      executeBulkDelete,
      downloadTemplate,
      handleImportSelectChange,
      handleImportRemove,
      openImportDialog,
      closeImportDialog,
      beginImportFlow,
      executeImport
    };
  }
};
</script>

<style scoped>
.scene-preview-container {
  padding: 24px;
  height: 100%;
  overflow: hidden;
  background-color: var(--td-bg-color-page);
  display: flex;
  flex-direction: column;
}

.toolbar-card {
  margin-bottom: 16px;
  border: 1px solid var(--td-component-stroke);
  border-radius: 8px;
  background: var(--td-bg-color-container);
}

.toolbar-card :deep(.t-card__body) {
  padding: 12px 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-left {
  min-width: 0;
  flex: 1;
}

.toolbar-right {
  margin-left: auto;
  flex-shrink: 0;
}

.content-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: clamp(220px, 22vw, 280px) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

.rooms-panel {
  width: auto;
  min-width: 0;
  max-width: 340px;
  border: 1px solid var(--td-component-stroke);
  border-radius: 8px;
  background: var(--td-bg-color-container);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.rooms-title {
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 700;
  border-bottom: 1px solid var(--td-component-stroke);
  color: var(--td-text-color-primary);
}

.rooms-menu {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.rooms-menu::-webkit-scrollbar {
  width: 6px;
}

.rooms-menu::-webkit-scrollbar-thumb {
  background: var(--td-component-border);
  border-radius: 999px;
}

.rooms-menu:deep(.t-default-menu),
.rooms-menu:deep(.t-menu) {
  width: 100% !important;
  max-width: 100% !important;
  display: block;
  background: transparent;
}

.rooms-menu :deep(.t-menu__item) {
  min-height: 44px;
  margin: 2px 10px;
  padding: 0 14px;
  border-radius: 8px;
  color: var(--td-text-color-secondary);
  transition: all 0.2s ease;
}

.rooms-menu :deep(.t-menu__item .t-menu__content) {
  font-weight: 500;
  font-size: 15px;
}

.rooms-menu :deep(.t-menu__item:hover:not(.t-is-active):not(.t-is-opened):not(.t-is-disabled)) {
  background-color: var(--td-bg-color-container-hover);
}

.rooms-menu :deep(.t-menu__item.t-is-active:not(.t-is-opened)) {
  position: relative;
  color: var(--td-brand-color);
  background-color: var(--td-brand-color-light);
}

.rooms-menu :deep(.t-menu__item.t-is-active:not(.t-is-opened)::before) {
  content: '';
  position: absolute;
  left: 8px;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background-color: var(--td-brand-color);
}

.rooms-menu :deep(.t-menu__item.t-is-active:not(.t-is-opened) .t-menu__content) {
  padding-left: 10px;
  font-weight: 600;
}

.rooms-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.points-panel {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--td-component-stroke);
  border-radius: 8px;
  background: var(--td-bg-color-container);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.points-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--td-component-stroke);
}

.points-header .title {
  font-size: 14px;
  font-weight: 600;
}

.points-header .meta {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.points-search {
  padding: 12px 14px;
  border-bottom: 1px solid var(--td-component-stroke);
}

.bulk-actions {
  padding: 10px 14px;
  border-bottom: 1px solid var(--td-component-stroke);
  background: var(--td-bg-color-secondarycontainer);
}

.bulk-selected {
  color: var(--td-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}

.search-input {
  width: min(480px, 100%);
}

.points-panel :deep(.t-loading) {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.points-panel :deep(.t-loading__parent) {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.points-panel :deep(.t-loading__content) {
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.points-content {
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scene-grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  align-content: start;
}

.scene-card {
  position: relative;
  transition: all 0.2s;
}

.card-cover {
  height: 160px;
  background-color: var(--td-bg-color-secondarycontainer);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-cover.clickable {
  cursor: pointer;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--td-text-color-placeholder);
  gap: 8px;
}

.cover-placeholder.small {
  gap: 4px;
  font-size: 12px;
}

.scene-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
}

.scene-select {
  flex-shrink: 0;
  margin-right: 8px;
  padding-top: 2px;
}

.scene-text {
  flex: 1;
  min-width: 0;
}

.scene-info h3 {
  margin-bottom: 4px;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scene-id {
  color: var(--td-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scene-room {
  color: var(--td-text-color-secondary);
  font-size: 12px;
  margin-top: 2px;
}

.scene-actions {
  flex-shrink: 0;
  margin-left: 8px;
}

.point-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.point-list :deep(.t-list) {
  min-height: 100%;
}

.point-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.point-select {
  flex-shrink: 0;
}

.point-thumb {
  flex-shrink: 0;
}

.point-thumb-box {
  width: 84px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--td-bg-color-secondarycontainer);
  display: flex;
  align-items: center;
  justify-content: center;
}

.point-thumb-box.clickable {
  cursor: pointer;
}

.point-main {
  flex: 1;
  min-width: 0;
}

.point-title {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.point-id {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 2px;
}

.point-room {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: 2px;
}

.point-actions {
  flex-shrink: 0;
}

.empty-state {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.points-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 8px 14px 14px;
  border-top: 1px solid var(--td-component-stroke);
  background: var(--td-bg-color-container);
}

.back-top-btn {
  position: absolute;
  right: 16px;
  z-index: 5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.create-point-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-file {
  font-size: 13px;
  color: var(--td-text-color-primary);
}

.import-file .label {
  color: var(--td-text-color-secondary);
}

.import-file .value {
  font-weight: 500;
}

.import-summary {
  display: flex;
  gap: 24px;
  padding: 8px 12px;
  background: var(--td-bg-color-secondarycontainer);
  border-radius: 6px;
}

.import-tip {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}

.confirm-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.confirm-body p {
  margin: 0;
  color: var(--td-text-color-primary);
}

@media (max-width: 1366px) {
  .scene-preview-container {
    padding: 16px;
  }

  .toolbar-card :deep(.t-card__body) {
    padding: 10px 12px;
  }

  .content-layout {
    grid-template-columns: clamp(210px, 22vw, 260px) minmax(0, 1fr);
  }

  .scene-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (max-width: 1024px) {
  .scene-preview-container {
    padding: 12px;
  }

  .toolbar {
    flex-wrap: wrap;
  }

  .toolbar-right {
    margin-left: 0;
  }

  .content-layout {
    display: flex;
    flex-direction: column;
  }

  .rooms-panel {
    max-width: none;
    width: 100%;
    max-height: min(30vh, 240px);
    overflow: hidden;
  }

  .scene-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (max-height: 780px) {
  .scene-preview-container {
    padding: 12px;
  }

  .rooms-panel {
    max-height: min(28vh, 200px);
  }
}
</style>
