const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs');
const ip = require('ip');

const app = express();
const port = 8080;

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
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

// 路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 健康检查路由
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
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

// 获取图片列表API
app.get('/api/images', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) {
      return res.status(500).json({ error: '无法读取图片目录' });
    }
    
    const images = files
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map(file => ({
        name: file,
        path: `/uploads/${file}`,
        url: `http://${ip.address()}:${port}/uploads/${file}`
      }));
    
    res.json(images);
  });
});

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