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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  background-color: #f5f5f5;
}
</style>