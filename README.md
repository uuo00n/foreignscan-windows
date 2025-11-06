# ForeignScan 异物检测系统

ForeignScan 是一个用于工业异物检测的桌面应用程序。前端使用 Electron + Vue 构建，后端使用 Go 独立部署提供服务。应用能够接收、处理和分析图像，检测可能存在的异物或缺陷，并以可视化形式展示结果。

## 功能特点

- 图像管理：通过后端服务获取并展示检测图像列表
- 异物检测：触发后端检测并展示检测结果（位置、类型、置信度等）
- 结果可视化：在图片上叠加标记框，直观展示检测区域
- 历史记录：保存和查看历史检测记录
- 跨平台支持：基于 Electron 构建，支持 Windows、macOS 和 Linux
- 友好错误提示：后端异常时展示清晰的错误信息

## 技术栈

- 前端：Vue 3, Vuex, Vue Router
- 桌面应用：Electron
- 后端：Go（独立部署）
- 通信：HTTP（由 Go 后端提供）

## 安装与运行

### 前提条件

- Node.js（推荐 v16 及以上）
- npm（通常随 Node.js 一起安装）
- 已部署并运行的 Go 后端服务（接口细节请参考后端文档）

### 安装步骤

1. 克隆仓库到本地
   ```
   git clone <仓库地址>
   cd foreignscan-windows
   ```
2. 安装依赖
   ```
   npm install
   ```
3. 启动 Electron 应用（开发模式）
   ```
   npm run electron:serve
   ```

### 构建桌面应用

```bash
npm run electron:build
```

## 后端说明（Go）

- 当前项目的后端由 Go 实现并独立部署，前端通过 HTTP 与后端交互。
- README 不再包含具体接口定义；请以后端团队提供的文档为准（包括地址、鉴权与数据格式）。
- 开发环境默认连接到 `http://localhost:3000`，如需修改后端地址，可在以下文件调整：
  - `src/store/index.js`（前端网络请求 baseURL）
  - `electron/main.js`（如有主进程网络相关逻辑）

## 错误处理

应用程序实现了完善的错误处理机制：

1. 后端连接失败：显示“后端异常”提示，并引导重试
2. 数据为空：列表区域显示“暂无数据”空态
3. 图片加载失败：显示友好的错误信息，避免应用崩溃

## 开发说明

### 环境地址配置

- 默认后端地址为 `http://localhost:3000`
- 建议后续将地址外置为环境变量或配置文件，统一管理（如 `.env` 或单独的 `config.ts`），当前版本可直接修改 `src/store/index.js`

### 调试

- 开发模式下，Electron 应用会自动打开开发者工具
- 可在控制台查看网络请求与错误日志，定位问题

## 项目结构

```
foreignscan-windows/
├── electron/           # Electron 应用相关文件
│   ├── main.js         # Electron 主进程
│   └── preload.js      # 预加载脚本
├── public/             # 静态资源
├── src/                # 前端源代码
│   ├── App.vue
│   ├── components/     # Vue 组件
│   │   ├── DetectionResults.vue
│   │   ├── ImageViewer.vue
│   │   └── InspectionList.vue
│   ├── router/         # 路由配置
│   │   └── index.js
│   ├── store/          # Vuex 状态管理
│   │   └── index.js
│   └── views/          # 页面视图
│       ├── DateListView.vue
│       └── HomeView.vue
├── package.json        # 项目配置
└── vue.config.js
```

## 许可证

[MIT](LICENSE)