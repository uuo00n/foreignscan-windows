# ForeignScan 异物检测系统

ForeignScan 是一个用于工业异物检测的桌面应用程序，它结合了后端服务器和 Electron 前端界面，能够接收、处理和分析图像，检测可能存在的异物或缺陷。

## 功能特点

- **图像上传**：支持通过 API 上传图像进行处理和分析
- **异物检测**：对上传的图像进行分析，检测可能存在的异物或缺陷
- **结果可视化**：直观地显示检测结果，包括异物位置、类型和置信度
- **历史记录**：保存和查看历史检测记录
- **跨平台支持**：基于 Electron 构建，支持 Windows、macOS 和 Linux 系统
- **错误处理**：当后端服务不可用时，显示友好的错误提示

## 技术栈

- **前端**：Vue.js, Vuex, Vue Router
- **桌面应用**：Electron
- **通信**：HTTP API

## 安装与运行

### 前提条件

- Node.js (推荐 v16.x 或更高版本)
- npm (通常随 Node.js 一起安装)
- 后端服务 (需单独部署)

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

3. 启动 Electron 应用
   ```
   npm run electron:serve
   ```

### 构建桌面应用

```
npm run electron:build
```

## 后端 API 接口

应用程序依赖于以下后端 API 接口，确保后端服务已正确部署并运行。

### 健康检查

```
GET /ping
```

用于检查后端服务是否正常运行。

### 获取图片列表

```
GET /api/images
```

获取所有已上传的图片列表。

### 上传图片

```
POST /api/upload
POST /api/upload-image
```

参数:
- `image`: 图片文件
- `sceneId`: 场景 ID
- `location`: 位置信息

### 检测图片

```
POST /api/detect
```

参数:
- `imageId`: 图片 ID

## 错误处理

应用程序实现了完善的错误处理机制：

1. **后端连接失败**：当无法连接到后端服务时，应用会显示"后端异常"提示
2. **数据为空**：当没有可显示的数据时，应用会显示"暂无数据"提示
3. **图片加载失败**：当图片无法加载时，应用会显示相应的错误信息

## 开发说明

### 环境变量

- 开发环境中，应用默认连接到 `http://localhost:3000` 的后端服务
- 如需修改后端服务地址，请编辑 `src/store/index.js` 和 `electron/main.js` 文件中的相关配置

### 调试

- 开发模式下，Electron 应用会自动打开开发者工具
- 可通过控制台查看网络请求和错误信息
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "imageId": "图像ID",
    "results": [
      {
        "x": 200,
        "y": 150,
        "width": 50,
        "height": 50,
        "type": "缺陷类型",
        "confidence": 0.92
      }
    ]
  }
  ```

## 项目结构

```
foreignscan-back/
├── electron/           # Electron应用相关文件
│   ├── main.js         # Electron主进程
│   └── preload.js      # 预加载脚本
├── public/             # 静态资源
├── src/                # 前端源代码
│   ├── components/     # Vue组件
│   ├── router/         # 路由配置
│   ├── store/          # Vuex状态管理
│   └── views/          # 页面视图
├── uploads/            # 上传的图像存储目录
├── server.js           # Express后端服务器
└── package.json        # 项目配置
```

## 许可证

[MIT](LICENSE)