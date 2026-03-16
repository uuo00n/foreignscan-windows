<template>
  <!-- 使用 TDesign 的 ConfigProvider 统一全局配置（如语言/主题） -->
  <t-config-provider :global-config="globalConfig">
    <!-- 路由视图：保持项目结构不变 -->
    <router-view />
  </t-config-provider>
</template>

<script>
// 引入中文语言包（可选）
import zhCN from 'tdesign-vue-next/es/locale/zh_CN'
export default {
  name: 'App'
  ,data() {
    return {
      // 全局配置：目前仅设置中文语言，后续可扩展主题等
      globalConfig: {
        locale: zhCN
      }
    }
  }
}
</script>

<style>
:root {
  /* TDesign 默认品牌色 */
  --td-brand-color: #0052D9;
  --td-brand-color-hover: #266FE8;
  --td-brand-color-focus: #266FE8;
  --td-brand-color-active: #003CAB;
  --td-brand-color-disabled: #BBd3FB;
  --td-brand-color-light: #ECF2FE;

  /* TDesign 文本颜色 */
  --td-text-color-primary: rgba(0, 0, 0, 0.9);
  --td-text-color-secondary: rgba(0, 0, 0, 0.6);
  --td-text-color-placeholder: rgba(0, 0, 0, 0.4);
  --td-text-color-disabled: rgba(0, 0, 0, 0.26);

  /* TDesign 背景与边框 */
  --td-bg-color-page: #F2F3F5;
  --td-bg-color-container: #FFFFFF;
  --td-bg-color-secondarycontainer: #F3F3F3;
  --td-component-stroke: #E7E7E7;
  --td-component-border: #DCDCDC;

  /* 应用级变量映射 */
  --app-primary-color: var(--td-brand-color);
  --app-bg-color: var(--td-bg-color-page);
  --app-header-height: 56px;
  --app-footer-height: 48px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--app-bg-color);
  color: var(--td-text-color-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #999;
}
::-webkit-scrollbar-track {
  background: transparent;
}
</style>