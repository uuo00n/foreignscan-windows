# ForeignScan Desktop

![Private](https://img.shields.io/badge/Repository-Private-red)
![Vue](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=flat&logo=vue.js)
![Electron](https://img.shields.io/badge/Electron-30.x-47848F?style=flat&logo=electron)
![Platform](https://img.shields.io/badge/Platform-Win%20|%20Mac%20|%20Linux-lightgrey)
![Copyright](https://img.shields.io/badge/Copyright-2026_uuo00n-blue)

**ForeignScan Desktop** 是一款专为工业质量检测设计的跨平台桌面应用程序。结合了 Electron 的跨平台能力与 Vue 3 的响应式体验，为异物检测操作提供了一个直观且高效的终端。

---

## 项目简介

作为 ForeignScan 系统的前端界面，本应用旨在简化复杂的检测流程。操作人员可以轻松查看实时检测画面、管理历史记录，并获得直观的视觉反馈（如缺陷边界框标注）。

## 主要功能

- **跨平台支持**：在 Windows、macOS 和 Linux 上完美运行。
- **可视化检测**：在图像上实时叠加检测结果（边界框）。
- **历史追踪**：强大的历史记录筛选与查询功能，支持按时间和场景查找。
- **高效交互**：基于 Vue 3 构建的现代 UI，确保流畅快速的响应。
- **异常处理**：完善的错误提示与状态反馈机制。

## 技术栈

- **核心框架**: Vue 3 + Vuex
- **桌面容器**: Electron
- **路由管理**: Vue Router
- **构建工具**: Vite / Webpack

## 快速开始

### 前置要求

- **Node.js**: `22.22.1`（见 `.nvmrc`，建议使用 nvm 固定版本）
- **Go 后端**: 本地接口服务可用（端口按你的后端配置）

### 1. 安装依赖

```bash
npm install
```

### 2. 配置后端地址（必须）

后端地址配置位于 `src/config/api.json`。请先改为你的后端实际地址，再启动前端。

示例（当前常用联调端口 `3000`）：

```json
{
  "API_BASE": "http://127.0.0.1:3000/"
}
```

### 3. 启动后端服务

确认后端接口服务已启动并可访问（例如健康检查接口 `/ping` 可返回）。

### 4. 开发模式运行

```bash
npm run electron:serve
```

该命令会并行启动：
- `dev:renderer`（Vue 开发服务器，`127.0.0.1:8080`）
- `dev:electron`（等待 8080 就绪后再启动 Electron）

### 5. 生产环境构建

```bash
npm run electron:build
```

### 6. 常用调试命令

```bash
# 仅启动前端开发服务器
npm run dev:renderer

# 仅启动 Electron（要求 8080 已可访问）
npm run dev:electron

# 单元测试
npm run test
```

### 7. 开发启动模式说明

- 一键启动：`npm run electron:serve`（推荐，自动编排 renderer + electron）
- 分离启动：先 `npm run dev:renderer`，再 `npm run dev:electron`

## 配置说明

后端地址配置位于 `src/config/api.json`。该值必须与后端服务实际监听地址一致。

```json
{
  "API_BASE": "http://127.0.0.1:3000/"
}
```

## 项目结构

```text
foreignscan-windows/
├── electron/            # Electron 主进程
├── src/
│   ├── components/      # Vue 组件
│   ├── views/           # 页面视图
│   ├── store/           # 状态管理
│   ├── router/          # 路由配置
│   └── config/          # 配置文件
├── public/              # 静态资源
└── package.json         # 项目依赖
```

## 常见问题排查

- `Electron exited with signal SIGABRT`
  - 先确认 Node 版本是否为 `22.22.1`。
  - 执行 `npm install` 重新安装依赖，确保使用 Electron 30.x。
- 窗口白屏或加载失败
  - 确认 `127.0.0.1:8080` 可访问（`dev:renderer` 已启动）。
  - 终端会输出 `[startup] 页面加载失败` 日志，可据此定位端口/服务问题。
- 接口请求失败
  - 检查 `src/config/api.json` 中 `API_BASE` 是否和后端实际端口一致（例如 `3000`）。
  - 当前前端开发服务固定使用 `8080`，不要与后端端口混用。
  - 确认后端健康检查可通过（`/ping`）。

## 版权与许可

本项目为专有软件。**非开源**。

Copyright © 2026 uuo00n. 保留所有权利。

严禁通过任何媒介未经授权复制、修改、分发或使用本软件。
