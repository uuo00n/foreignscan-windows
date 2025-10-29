const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs');
const ip = require('ip');

const app = express();
const port = 3000;

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // 使用请求中的自定义文件名或默认使用时间戳
    const customFilename = req.query.filename;
    if (customFilename) {
      cb(null, customFilename);
    } else {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  }
});
const upload = multer({ storage: storage });

// 确保上传目录存在
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 中间件
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // 提供上传目录的静态访问

// 路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 健康检查路由
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 获取图片列表API
app.get('/api/images', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir);
    
    // 过滤出图片文件
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    });
    
    // 构建图片数据
    const images = imageFiles.map((file, index) => {
      // 从文件名中提取日期和ID信息
      const fileNameWithoutExt = path.basename(file, path.extname(file));
      const parts = fileNameWithoutExt.split('_');
      const date = parts[0] || '';
      const id = parts[1] || '';
      
      // 创建图片对象
      return {
        id: id || String(index + 1).padStart(3, '0'),
        filename: file,
        path: `/uploads/${file}`,
        date: date,
        time: new Date().toLocaleTimeString(),
        status: 'undetected' // 默认设置为未检测状态
      };
    });
    
    res.json({ success: true, images });
  } catch (error) {
    console.error('Error getting images:', error);
    res.status(500).json({ success: false, message: 'Failed to get images' });
  }
});

// 上传图片API
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  res.json({
    success: true,
    file: req.file.filename,
    path: `/uploads/${req.file.filename}`
  });
});

// 添加兼容客户端的上传图片API路由
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  res.json({
    success: true,
    file: req.file.filename,
    path: `/uploads/${req.file.filename}`
  });
});

// 这里删除了重复的/api/images接口定义
// 上面已经定义了更完善的/api/images接口

// 检测API（模拟）
app.post('/api/detect', (req, res) => {
  const { imageId } = req.body;
  
  // 模拟检测结果
  setTimeout(() => {
    const results = [
      { x: 200, y: 150, width: 50, height: 50, type: '裂缝', confidence: 0.92 },
      { x: 350, y: 150, width: 50, height: 50, type: '磨损', confidence: 0.87 },
      { x: 275, y: 250, width: 50, height: 50, type: '变形', confidence: 0.95 }
    ];
    
    res.json({
      success: true,
      imageId,
      results
    });
  }, 1000);
});

// 提供上传的图片访问
app.use('/uploads', express.static('uploads'));

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`本地IP: http://${ip.address()}:${port}`);
});