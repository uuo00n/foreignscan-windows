/**
 * MongoDB数据库初始化脚本
 * 用于创建数据库、设置索引和添加测试数据
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 导入Image模型
const Image = require('../models/Image');

// 连接MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/foreignscan', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`MongoDB连接成功: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB连接失败: ${error.message}`);
    process.exit(1);
  }
};

// 创建索引
const createIndexes = async () => {
  console.log('创建索引...');
  
  try {
    // 在timestamp字段上创建索引，用于按日期查询
    await Image.collection.createIndex({ timestamp: -1 });
    console.log('timestamp索引创建成功');
    
    // 在sceneId字段上创建索引，用于按场景查询
    await Image.collection.createIndex({ sceneId: 1 });
    console.log('sceneId索引创建成功');
    
    // 在sequenceNumber字段上创建索引，用于排序
    await Image.collection.createIndex({ sequenceNumber: -1 });
    console.log('sequenceNumber索引创建成功');
    
    return true;
  } catch (error) {
    console.error('创建索引失败:', error);
    return false;
  }
};

// 清空现有数据
const clearExistingData = async () => {
  console.log('清空现有数据...');
  
  try {
    await Image.deleteMany({});
    console.log('现有数据已清空');
    return true;
  } catch (error) {
    console.error('清空数据失败:', error);
    return false;
  }
};

// 从uploads目录获取现有图片并添加到数据库
const importExistingImages = async () => {
  console.log('导入现有图片...');
  
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    // 确保uploads目录存在
    if (!fs.existsSync(uploadsDir)) {
      console.log('uploads目录不存在，跳过导入');
      return false;
    }
    
    const files = fs.readdirSync(uploadsDir);
    
    // 过滤出图片文件
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    });
    
    console.log(`找到${imageFiles.length}个图片文件`);
    
    // 导入每个图片
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      
      // 从文件名中提取日期和ID信息
      const fileNameWithoutExt = path.basename(file, path.extname(file));
      const parts = fileNameWithoutExt.split('_');
      const date = parts[0] || '';
      const id = parts[1] || '';
      
      // 创建新的图片记录
      const newImage = new Image({
        sequenceNumber: i + 1,
        sceneId: date || '未知场景',
        timestamp: new Date(),
        location: '导入的历史数据',
        filename: file,
        path: `/uploads/${file}`,
        isDetected: false,
        hasIssue: false,
        issueType: ''
      });
      
      await newImage.save();
      console.log(`导入图片 ${i+1}/${imageFiles.length}: ${file}`);
    }
    
    console.log('所有图片导入完成');
    return true;
  } catch (error) {
    console.error('导入图片失败:', error);
    return false;
  }
};

// 添加测试数据
const addTestData = async () => {
  console.log('添加测试数据...');
  
  try {
    // 创建一些测试数据
    const testData = [
      {
        sequenceNumber: 1001,
        sceneId: 'TEST001',
        timestamp: new Date('2023-10-01T10:00:00'),
        location: '测试位置1',
        filename: 'test_001.jpg',
        path: '/uploads/test_001.jpg',
        isDetected: true,
        hasIssue: true,
        issueType: '裂缝',
        detectionResults: [
          { x: 100, y: 100, width: 50, height: 50, type: '裂缝', confidence: 0.95 }
        ]
      },
      {
        sequenceNumber: 1002,
        sceneId: 'TEST002',
        timestamp: new Date('2023-10-02T11:00:00'),
        location: '测试位置2',
        filename: 'test_002.jpg',
        path: '/uploads/test_002.jpg',
        isDetected: true,
        hasIssue: false,
        issueType: '',
        detectionResults: []
      },
      {
        sequenceNumber: 1003,
        sceneId: 'TEST003',
        timestamp: new Date('2023-10-03T12:00:00'),
        location: '测试位置3',
        filename: 'test_003.jpg',
        path: '/uploads/test_003.jpg',
        isDetected: false,
        hasIssue: false,
        issueType: '',
        detectionResults: []
      }
    ];
    
    // 批量插入测试数据
    await Image.insertMany(testData);
    
    console.log(`已添加${testData.length}条测试数据`);
    return true;
  } catch (error) {
    console.error('添加测试数据失败:', error);
    return false;
  }
};

// 主函数
const initDatabase = async () => {
  console.log('开始初始化数据库...');
  
  // 连接数据库
  await connectDB();
  
  // 创建索引
  await createIndexes();
  
  // 询问用户是否要清空现有数据
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('是否要清空现有数据? (y/n) ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      await clearExistingData();
      
      // 询问用户是否要导入现有图片
      readline.question('是否要导入uploads目录中的现有图片? (y/n) ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          await importExistingImages();
        }
        
        // 询问用户是否要添加测试数据
        readline.question('是否要添加测试数据? (y/n) ', async (answer) => {
          if (answer.toLowerCase() === 'y') {
            await addTestData();
          }
          
          console.log('数据库初始化完成!');
          mongoose.disconnect();
          readline.close();
        });
      });
    } else {
      console.log('保留现有数据');
      
      // 询问用户是否要添加测试数据
      readline.question('是否要添加测试数据? (y/n) ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          await addTestData();
        }
        
        console.log('数据库初始化完成!');
        mongoose.disconnect();
        readline.close();
      });
    }
  });
};

// 执行初始化
initDatabase();