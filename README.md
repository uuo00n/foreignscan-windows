# ForeignScan 异物检测系统

ForeignScan是一个用于工业异物检测的桌面应用程序，它结合了Express后端服务器和Electron前端界面，能够接收、处理和分析图像，检测可能存在的异物或缺陷。

## 功能特点

- **图像上传**：支持通过API上传图像进行处理和分析
- **异物检测**：对上传的图像进行分析，检测可能存在的异物或缺陷
- **结果可视化**：直观地显示检测结果，包括异物位置、类型和置信度
- **历史记录**：保存和查看历史检测记录
- **跨平台支持**：基于Electron构建，支持Windows、macOS和Linux系统

## 技术栈

- **后端**：Node.js, Express
- **前端**：Vue.js, Vuex, Vue Router
- **桌面应用**：Electron
- **图像处理**：自定义算法

## 安装与运行

### 前提条件

- Node.js (推荐v16.x或更高版本)
- npm (通常随Node.js一起安装)

### 安装步骤

1. 克隆仓库到本地
   ```
   git clone <仓库地址>
   cd foreignscan-back
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 启动后端服务器
   ```
   npm run start
   ```
   或使用开发模式（支持热重载）
   ```
   npm run dev
   ```

4. 启动Electron应用
   ```
   npm run electron:serve
   ```

### 构建桌面应用

```
npm run electron:build
```

## API接口

### 上传图像

- **URL**: `/api/upload` 或 `/api/upload-image`
- **方法**: `POST`
- **参数**: 
  - `image`: 图像文件（multipart/form-data）
- **响应**: 
  ```json
  {
    "success": true,
    "file": "文件名",
    "path": "/uploads/文件名"
  }
  ```

### 获取图像列表

- **URL**: `/api/images`
- **方法**: `GET`
- **响应**: 
  ```json
  [
    {
      "name": "文件名",
      "path": "/uploads/文件名",
      "url": "完整URL"
    }
  ]
  ```

### 异物检测

- **URL**: `/api/detect`
- **方法**: `POST`
- **参数**: 
  ```json
  {
    "imageId": "图像ID"
  }
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