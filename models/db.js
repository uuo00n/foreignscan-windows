const mongoose = require('mongoose');

// 连接MongoDB数据库
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

module.exports = connectDB;