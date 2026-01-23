<template>
  <div class="scene-preview-container">
    <div class="toolbar">
      <template v-if="!isSelectionMode">
        <t-button theme="primary" @click="showAddDialog">
          <template #icon><AddIcon /></template>
          添加场景
        </t-button>
        <t-button variant="outline" @click="toggleSelectionMode">
            批量管理
        </t-button>
      </template>
      <template v-else>
         <div class="toolbar-left"></div>
         <t-space>
           <t-button variant="outline" @click="toggleSelectionMode">取消</t-button>
           <t-button variant="outline" @click="toggleSelectAll">
             {{ isAllSelected ? '取消全选' : '全选' }}
           </t-button>
           <t-button theme="danger" :disabled="selectedSceneIds.length === 0" @click="handleBatchDelete">
             <template #icon><DeleteIcon /></template>
             删除选中 ({{ selectedSceneIds.length }})
           </t-button>
         </t-space>
      </template>
    </div>
    
    <t-loading :loading="loading">
      <div class="scene-grid" v-if="scenes.length > 0">
        <template v-for="scene in scenes" :key="scene.id">
          <t-image-viewer v-if="sceneCovers[scene.id] && !isSelectionMode" :images="[sceneCovers[scene.id]]">
            <template #trigger="{ open }">
              <t-card
                class="scene-card"
                :class="{ 'is-selected': selectedSceneIds.includes(scene.id), 'is-selection-mode': isSelectionMode }"
                hover-shadow
                @click="open"
              >
                <template #cover>
                  <div class="card-cover">
                    <img :src="sceneCovers[scene.id]" alt="cover" class="cover-img" />
                  </div>
                </template>
                <div class="scene-info">
                  <div class="scene-text">
                    <h3>{{ scene.name }}</h3>
                    <p class="scene-id">ID: {{ scene.id }}</p>
                  </div>
                  <div class="scene-actions">
                    <t-dropdown
                      :options="getDropdownOptions(scene)"
                      :min-column-width="160"
                      :popup-props="{ overlayStyle: { width: '180px' } }"
                      @click="(data) => handleAction(data, scene)"
                    >
                      <t-button variant="text" shape="circle" @click.stop>
                        <template #icon><MoreIcon /></template>
                      </t-button>
                    </t-dropdown>
                  </div>
                </div>
              </t-card>
            </template>
          </t-image-viewer>

          <t-card
            v-else
            class="scene-card"
            :class="{ 'is-selected': selectedSceneIds.includes(scene.id), 'is-selection-mode': isSelectionMode }"
            hover-shadow
            @click="handleCardClick(scene)"
          >
            <template #cover>
              <div class="card-cover">
                <div v-if="isSelectionMode" class="selection-overlay">
                  <CheckCircleFilledIcon v-if="selectedSceneIds.includes(scene.id)" class="check-icon checked" />
                  <CircleIcon v-else class="check-icon unchecked" />
                </div>

                <img v-if="sceneCovers[scene.id]" :src="sceneCovers[scene.id]" alt="cover" class="cover-img" />
                <div v-else class="cover-placeholder">
                  <ImageIcon size="32" />
                  <span>暂无图片</span>
                </div>
              </div>
            </template>
            <div class="scene-info">
              <div class="scene-text">
                <h3>{{ scene.name }}</h3>
                <p class="scene-id">ID: {{ scene.id }}</p>
              </div>
              <div class="scene-actions" v-if="!isSelectionMode">
                <t-dropdown
                  :options="getDropdownOptions(scene)"
                  :min-column-width="160"
                  :popup-props="{ overlayStyle: { width: '180px' } }"
                  @click="(data) => handleAction(data, scene)"
                >
                  <t-button variant="text" shape="circle" @click.stop>
                    <template #icon><MoreIcon /></template>
                  </t-button>
                </t-dropdown>
              </div>
            </div>
          </t-card>
        </template>
      </div>
      <div v-else class="empty-state">
           <t-empty description="暂无场景数据" />
      </div>
    </t-loading>

    <!-- Hidden File Input -->
    <input
      type="file"
      ref="fileInputRef"
      style="display: none"
      accept="image/*"
      @change="handleFileChange"
    />

    <!-- Add Scene Dialog -->
    <t-dialog
      v-model:visible="addDialogVisible"
      header="添加场景"
      @confirm="confirmAddScene"
      :confirm-btn="{ loading: adding }"
    >
      <t-form ref="formRef" :data="formData" :rules="rules" label-width="80px">
        <!-- 移除手动输入 ID，改为由后端生成 -->
        <!-- <t-form-item label="场景ID" name="id">
          <t-input v-model="formData.id" placeholder="请输入场景ID (如: hinge)" />
        </t-form-item> -->
        <t-form-item label="场景名称" name="name">
          <t-input v-model="formData.name" placeholder="请输入场景名称" />
        </t-form-item>
         <t-form-item label="描述" name="description">
          <t-textarea v-model="formData.description" placeholder="可选描述" />
        </t-form-item>
      </t-form>
    </t-dialog>

  </div>
</template>

<script>
import { computed, ref, onMounted, reactive, h } from 'vue';
import { useStore } from 'vuex';
import { AddIcon, UploadIcon, ImageIcon, DeleteIcon, CheckCircleFilledIcon, CircleIcon, MoreIcon } from 'tdesign-icons-vue-next';
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next';
import apiConfig from '../config/api.json';

const API_BASE = apiConfig.API_BASE;

export default {
  name: 'ScenePreview',
  components: {
    AddIcon,
    UploadIcon,
    ImageIcon,
    DeleteIcon,
    CheckCircleFilledIcon,
    CircleIcon,
    MoreIcon
  },
  setup() {
    const store = useStore();
    const loading = ref(false);
    const adding = ref(false);
    const addDialogVisible = ref(false);
    const formRef = ref(null);
    const fileInputRef = ref(null);
    
    // 批量选择模式
    const isSelectionMode = ref(false);
    const selectedSceneIds = ref([]);

    // 存储场景ID对应的封面图片URL
    const sceneCovers = reactive({});
    // 当前正在上传图片的场景ID
    const uploadSceneId = ref(null);


    const scenes = computed(() => store.getters.scenes || []);
    
    const formData = ref({
      name: '',
      description: ''
    });
    
    const rules = {
      name: [{ required: true, message: '请输入场景名称', trigger: 'blur' }]
    };

    // 辅助函数：解析图片完整路径
    const resolveImagePath = (img) => {
      if (!img) return null;
      let path = img.path || img.url || '';
      
      // 如果没有 path，尝试构造
      if (!path && img.sceneId && img.filename) {
        path = `uploads/images/${img.sceneId}/${img.filename}`;
      }
      
      if (!path) return null;

      // 如果已经是完整 URL
      if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
        return path;
      }

      // 规范化斜杠：将 Windows 反斜杠转换为正斜杠
      path = path.replace(/\\/g, '/');
      
      // 处理开头的 /，避免双斜杠
      if (path.startsWith('/')) {
        path = path.slice(1);
      }
      
      // 处理 API_BASE 结尾的 /
      let base = API_BASE;
      if (base.endsWith('/')) {
        base = base.slice(0, -1);
      }
      
      return `${base}/${path}`;
    };

    const fetchSceneCover = async (sceneId) => {
      // 使用 fetchStyleImagesByScene 获取该场景的样式图片
      const images = await store.dispatch('fetchStyleImagesByScene', sceneId);
      if (images && images.length > 0) {
        // 后端返回按时间倒序排列，取第一个即为最新
        const img = images[0];
        const fullPath = resolveImagePath(img);
        if (fullPath) {
          sceneCovers[sceneId] = fullPath;
        }
      } else {
        // 如果没有图片，确保清除旧封面
        delete sceneCovers[sceneId];
      }
    };

    const fetchScenes = async () => {
      loading.value = true;
      // 1. 获取所有场景（确保空场景也能显示）
      await store.dispatch('fetchSceneNameMap');
      
      // 2. 获取所有样式图片（用于封面）
      const styleImages = await store.dispatch('fetchStyleImages');
      
      // 清除旧封面数据，防止残留
      for (const key in sceneCovers) {
        delete sceneCovers[key];
      }

      // 3. 匹配封面
      // 后端返回的 styleImages 按创建时间倒序排列（最新在前）
      if (styleImages && styleImages.length > 0) {
        styleImages.forEach(img => {
          const sId = img.sceneId || img.SceneID || img.scene_id;
          if (sId) {
             // 仅当该场景尚未设置封面时才设置（确保使用最新的第一张）
             if (!sceneCovers[sId]) {
               const fullPath = resolveImagePath(img);
               if (fullPath) {
                 sceneCovers[sId] = fullPath;
               }
             }
          }
        });
      }
      
      loading.value = false;
    };

    onMounted(() => {
      fetchScenes();
    });

    const showAddDialog = () => {
      formData.value = { name: '', description: '' };
      addDialogVisible.value = true;
    };

    const confirmAddScene = async () => {
      const validateResult = await formRef.value.validate();
      if (validateResult === true) {
        adding.value = true;
        const res = await store.dispatch('addScene', formData.value);
        adding.value = false;
        
        if (res.success) {
          MessagePlugin.success('添加成功');
          addDialogVisible.value = false;
          fetchScenes(); // Refresh list
        } else {
          MessagePlugin.error(res.message);
        }
      }
    };

    const triggerUpload = (scene) => {
      uploadSceneId.value = scene.id;
      if (fileInputRef.value) {
        fileInputRef.value.value = ''; // Reset
        fileInputRef.value.click();
      }
    };

    const handleFileChange = async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      const file = files[0];
      const sceneId = uploadSceneId.value;
      
      if (!sceneId) return;

      const loadingMsg = MessagePlugin.loading('正在上传...');
      const res = await store.dispatch('uploadImage', { file, sceneId });
      MessagePlugin.close(loadingMsg);

      if (res.success) {
        MessagePlugin.success('上传成功');
        // 刷新该场景的封面
        await fetchSceneCover(sceneId);
      } else {
        MessagePlugin.error(res.message || '上传失败');
      }
      
      uploadSceneId.value = null;
    };

    // 批量操作逻辑
    const toggleSelectionMode = () => {
      isSelectionMode.value = !isSelectionMode.value;
      if (!isSelectionMode.value) {
        selectedSceneIds.value = [];
      }
    };

    const toggleSelectScene = (sceneId) => {
      if (!isSelectionMode.value) return;
      const idx = selectedSceneIds.value.indexOf(sceneId);
      if (idx >= 0) {
        selectedSceneIds.value.splice(idx, 1);
      } else {
        selectedSceneIds.value.push(sceneId);
      }
    };

    const handleCardClick = (scene) => {
      if (isSelectionMode.value) {
        toggleSelectScene(scene.id);
      }
    };
    
    const isAllSelected = computed(() => {
      return scenes.value.length > 0 && selectedSceneIds.value.length === scenes.value.length;
    });

    const toggleSelectAll = () => {
      if (isAllSelected.value) {
        selectedSceneIds.value = [];
      } else {
        selectedSceneIds.value = scenes.value.map(s => s.id);
      }
    };

    const handleBatchDelete = () => {
      if (selectedSceneIds.value.length === 0) return;
      
      const confirmDialog = DialogPlugin.confirm({
        header: '确认删除',
        body: `确定要删除选中的 ${selectedSceneIds.value.length} 个场景吗？此操作不可恢复。`,
        theme: 'danger',
        onConfirm: async () => {
          loading.value = true;
          confirmDialog.hide();
          
          const res = await store.dispatch('batchDeleteScenes', selectedSceneIds.value);
          
          loading.value = false;
          if (res.success) {
            MessagePlugin.success(`成功删除 ${res.successCount} 个场景`);
            if (res.failCount > 0) {
               MessagePlugin.warning(`${res.failCount} 个场景删除失败`);
            }
            // 退出选择模式并刷新
            isSelectionMode.value = false;
            selectedSceneIds.value = [];
            fetchScenes();
          } else {
            MessagePlugin.error('批量删除失败');
          }
        }
      });
    };

    const handleDeleteScene = (scene) => {
      const confirmDialog = DialogPlugin.confirm({
        header: '确认删除',
        body: `确定要删除场景 "${scene.name}" 吗？此操作不可恢复。`,
        theme: 'danger',
        onConfirm: async () => {
          loading.value = true;
          confirmDialog.hide();
          
          // Use batchDeleteScenes for single deletion as well, or implement a single delete action
          // Since we have batchDeleteScenes, we can reuse it by passing an array with one ID
          const res = await store.dispatch('batchDeleteScenes', [scene.id]);
          
          loading.value = false;
          if (res.success) {
            MessagePlugin.success('删除成功');
            fetchScenes();
          } else {
            MessagePlugin.error('删除失败');
          }
        }
      });
    };

    const handleAction = (data, scene) => {
      if (data.value === 'upload') {
        triggerUpload(scene);
      } else if (data.value === 'delete') {
        handleDeleteScene(scene);
      }
    };

    const getDropdownOptions = (scene) => {
      const hasImage = !!sceneCovers[scene.id];
      return [
        { 
          content: hasImage ? '重新上传场景图' : '上传图片', 
          value: 'upload', 
          prefixIcon: () => h(UploadIcon) 
        },
        {
          content: '删除场景',
          value: 'delete',
          theme: 'error',
          prefixIcon: () => h(DeleteIcon)
        }
      ];
    };

    return {
      scenes,
      loading,
      adding,
      addDialogVisible,
      formData,
      rules,
      formRef,
      sceneCovers,
      fileInputRef,
      showAddDialog,
      confirmAddScene,
      triggerUpload,
      handleFileChange,
      // 批量操作
      isSelectionMode,
      selectedSceneIds,
      toggleSelectionMode,
      toggleSelectScene,
      isAllSelected,
      toggleSelectAll,
      handleBatchDelete,
      handleDeleteScene,
      handleAction,
      getDropdownOptions,
      handleCardClick,
    };
  }
};
</script>

<style scoped>
.scene-preview-container {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
  background-color: var(--td-bg-color-page);
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.scene-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.scene-card {
  position: relative;
  transition: all 0.2s;
}
.scene-card.is-selection-mode {
  cursor: pointer;
}
.scene-card.is-selected {
  border-color: var(--td-brand-color);
  box-shadow: 0 0 0 2px var(--td-brand-color-light);
}

.selection-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}
.check-icon {
  font-size: 24px;
  border-radius: 50%;
  background-color: #fff; /* White background for better contrast */
  display: block;
}
.check-icon.checked {
  color: var(--td-brand-color);
}
.check-icon.unchecked {
  color: var(--td-text-color-secondary); /* Grey outline */
}

.card-actions {
  transition: opacity 0.2s;
  /* Maintain height to prevent layout shift */
  height: 32px; 
  display: flex;
  align-items: center;
}
.card-actions.hidden {
  opacity: 0;
  pointer-events: none;
}

.card-cover {
  height: 160px;
  background-color: #f3f3f3;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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
.scene-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
}
.scene-text {
  flex: 1;
  min-width: 0; /* Enable truncation in flex item */
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
.scene-actions {
  flex-shrink: 0;
  margin-left: 8px;
}
.empty-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}
</style>
