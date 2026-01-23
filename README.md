# ForeignScan Desktop

![Private](https://img.shields.io/badge/Repository-Private-red)
![Vue](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=flat&logo=vue.js)
![Electron](https://img.shields.io/badge/Electron-16.x-47848F?style=flat&logo=electron)
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

- **Node.js**: 推荐 v18+
- **Go 后端**: 后端服务必须正在运行 (默认 `http://localhost:3000`)

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式运行

```bash
npm run electron:serve
```

### 3. 生产环境构建

```bash
npm run electron:build
```

## 配置说明

后端地址配置位于 `src/config/api.json`。如需修改后端地址，请编辑此文件：

```json
{
  "API_BASE": "http://localhost:3000/"
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

## 版权与许可

本项目为专有软件。**非开源**。

Copyright © 2026 uuo00n. 保留所有权利。

严禁通过任何媒介未经授权复制、修改、分发或使用本软件。
