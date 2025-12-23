<template>
  <div class="scene-preview-container">
    <div class="toolbar">
      <h2>场景预览</h2>
      <t-button theme="primary" @click="showAddDialog">
        <template #icon><AddIcon /></template>
        添加场景
      </t-button>
    </div>
    
    <t-loading :loading="loading">
      <div class="scene-grid" v-if="scenes.length > 0">
        <t-card v-for="scene in scenes" :key="scene.id" class="scene-card" hover-shadow>
           <template #cover>
             <div class="card-cover">
               <img v-if="sceneCovers[scene.id]" :src="sceneCovers[scene.id]" alt="cover" class="cover-img" />
               <div v-else class="cover-placeholder">
                 <ImageIcon size="32" />
                 <span>暂无图片</span>
               </div>
             </div>
           </template>
           <div class="scene-info">
             <h3>{{ scene.name }}</h3>
             <p class="scene-id">ID: {{ scene.id }}</p>
           </div>
           <template #actions>
             <t-space size="small">
                <t-button variant="text" theme="default" @click="triggerUpload(scene)">
                   <template #icon><UploadIcon /></template>
                   上传图片
                </t-button>
             </t-space>
           </template>
        </t-card>
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
import { computed, ref, onMounted, reactive } from 'vue';
import { useStore } from 'vuex';
import { AddIcon, UploadIcon, ImageIcon } from 'tdesign-icons-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import apiConfig from '../config/api.json';

const API_BASE = apiConfig.API_BASE;

export default {
  name: 'ScenePreview',
  components: {
    AddIcon,
    UploadIcon,
    ImageIcon
  },
  setup() {
    const store = useStore();
    const loading = ref(false);
    const adding = ref(false);
    const addDialogVisible = ref(false);
    const formRef = ref(null);
    const fileInputRef = ref(null);
    
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
      handleFileChange
    };
  }
};
</script>

<style scoped>
.scene-preview-container {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: var(--td-bg-color-page);
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.scene-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.scene-card {
  /* cursor: pointer; removed to allow button clicks */
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
.scene-info h3 {
  margin-bottom: 4px;
  font-size: 16px;
  font-weight: 600;
}
.scene-id {
  color: var(--td-text-color-secondary);
  font-size: 12px;
}
.empty-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}
</style>
