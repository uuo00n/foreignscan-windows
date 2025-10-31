const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs');
const ip = require('ip');

// 导入数据库连接和模型
const connectDB = require('./models/db');
const Image = require('./models/Image');

const app = express();
const port = 3000;

// 连接数据库
connectDB();

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
app.get('/api/images', async (req, res) => {
  try {
    // 从数据库获取所有图片记录，按序号降序排列
    const images = await Image.find().sort({ sequenceNumber: -1 });
    
    res.json({ 
      success: true, 
      images: images.map(img => ({
        id: img._id,
        sequenceNumber: img.sequenceNumber,
        sceneId: img.sceneId,
        timestamp: img.timestamp,
        location: img.location,
        filename: img.filename,
        path: img.path,
        isDetected: img.isDetected,
        hasIssue: img.hasIssue,
        issueType: img.issueType,
        detectionResults: img.detectionResults
      }))
    });
  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({ success: false, message: '获取图片列表失败' });
  }
});

// 上传图片API
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  try {
    // 获取请求中的元数据
    const sceneId = req.body.sceneId || '未知场景';
    const location = req.body.location || '';
    
    // 获取下一个序列号
    const sequenceNumber = await Image.getNextSequence();
    
    // 创建新的图片记录
    const newImage = new Image({
      sequenceNumber,
      sceneId,
      timestamp: new Date(),
      location,
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      isDetected: false,
      hasIssue: false,
      issueType: ''
    });
    
    // 保存到数据库
    await newImage.save();
    
    res.json({
      success: true,
      file: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      imageId: newImage._id,
      sequenceNumber
    });
  } catch (error) {
    console.error('保存图片信息失败:', error);
    res.status(500).json({ error: '保存图片信息失败' });
  }
});

// 添加兼容客户端的上传图片API路由
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  try {
    // 获取请求中的元数据
    const sceneId = req.body.sceneId || '未知场景';
    const location = req.body.location || '';
    
    // 获取下一个序列号
    const sequenceNumber = await Image.getNextSequence();
    
    // 创建新的图片记录
    const newImage = new Image({
      sequenceNumber,
      sceneId,
      timestamp: new Date(),
      location,
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      isDetected: false,
      hasIssue: false,
      issueType: ''
    });
    
    // 保存到数据库
    await newImage.save();
    
    res.json({
      success: true,
      file: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      imageId: newImage._id,
      sequenceNumber
    });
  } catch (error) {
    console.error('保存图片信息失败:', error);
    res.status(500).json({ error: '保存图片信息失败' });
  }
});

// 这里删除了重复的/api/images接口定义
// 上面已经定义了更完善的/api/images接口

// 检测API（模拟）
app.post('/api/detect', async (req, res) => {
  const { imageId } = req.body;
  
  try {
    // 模拟检测结果
    const results = [
      { x: 200, y: 150, width: 50, height: 50, type: '裂缝', confidence: 0.92 },
      { x: 350, y: 150, width: 50, height: 50, type: '磨损', confidence: 0.87 },
      { x: 275, y: 250, width: 50, height: 50, type: '变形', confidence: 0.95 }
    ];
    
    // 更新数据库中的图片记录
    const hasIssue = results.length > 0;
    const issueType = hasIssue ? results.map(r => r.type).join(',') : '';
    
    await Image.findByIdAndUpdate(imageId, {
      isDetected: true,
      hasIssue,
      issueType,
      detectionResults: results
    });
    
    res.json({
      success: true,
      imageId,
      results
    });
  } catch (error) {
    console.error('更新检测结果失败:', error);
    res.status(500).json({ success: false, message: '更新检测结果失败' });
  }
});

// 按日期查询历史记录接口
app.get('/api/images/by-date', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 构建查询条件
    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // 查询数据库
    const images = await Image.find(query).sort({ timestamp: -1 });
    
    res.json({ 
      success: true, 
      images: images.map(img => ({
        id: img._id,
        sequenceNumber: img.sequenceNumber,
        sceneId: img.sceneId,
        timestamp: img.timestamp,
        location: img.location,
        filename: img.filename,
        path: img.path,
        isDetected: img.isDetected,
        hasIssue: img.hasIssue,
        issueType: img.issueType
      }))
    });
  } catch (error) {
    console.error('按日期查询图片失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

// 按场景ID查询历史记录接口
app.get('/api/images/by-scene', async (req, res) => {
  try {
    const { sceneId } = req.query;
    
    // 构建查询条件
    const query = {};
    if (sceneId) {
      query.sceneId = sceneId;
    }
    
    // 查询数据库
    const images = await Image.find(query).sort({ timestamp: -1 });
    
    res.json({ 
      success: true, 
      images: images.map(img => ({
        id: img._id,
        sequenceNumber: img.sequenceNumber,
        sceneId: img.sceneId,
        timestamp: img.timestamp,
        location: img.location,
        filename: img.filename,
        path: img.path,
        isDetected: img.isDetected,
        hasIssue: img.hasIssue,
        issueType: img.issueType
      }))
    });
  } catch (error) {
    console.error('按场景查询图片失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

// 提供上传的图片访问
app.use('/uploads', express.static('uploads'));

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`本地IP: http://${ip.address()}:${port}`);
});