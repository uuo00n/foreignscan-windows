const express = require('express');
const multer = require('multer');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const ip = require('ip');

const app = express();
const PORT = process.env.PORT || 8080;

// 创建上传目录
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 限制10MB
});

// 中间件
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// 健康检查端点
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 接收图片的API端点
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '没有接收到图片文件' });
    }

    const imageUrl = `http://${ip.address()}:${PORT}/uploads/${req.file.filename}`;
    
    console.log(`接收到图片: ${req.file.originalname}, 大小: ${req.file.size} 字节`);
    
    return res.status(200).json({
      success: true,
      message: '图片上传成功',
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('上传图片时出错:', error);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取所有已上传图片
app.get('/api/images', (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const images = files.map(filename => {
      return {
        filename,
        url: `http://${ip.address()}:${PORT}/uploads/${filename}`
      };
    });
    
    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    console.error('获取图片列表时出错:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://${ip.address()}:${PORT}`);
  console.log(`上传目录: ${uploadDir}`);
});