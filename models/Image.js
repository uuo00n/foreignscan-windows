const mongoose = require('mongoose');

// 创建图片模型
const ImageSchema = new mongoose.Schema({
  // 序号 - 自动生成的唯一标识
  sequenceNumber: {
    type: Number,
    required: true
  },
  // 场景ID - 标识拍摄场景
  sceneId: {
    type: String,
    required: true
  },
  // 时间 - 拍摄或上传时间
  timestamp: {
    type: Date,
    default: Date.now
  },
  // 地址 - 拍摄地点
  location: {
    type: String,
    default: ''
  },
  // 文件名
  filename: {
    type: String,
    required: true
  },
  // 文件路径
  path: {
    type: String,
    required: true
  },
  // 是否已检测
  isDetected: {
    type: Boolean,
    default: false
  },
  // 是否存在问题
  hasIssue: {
    type: Boolean,
    default: false
  },
  // 问题类型
  issueType: {
    type: String,
    default: ''
  },
  // 检测结果详情
  detectionResults: {
    type: Array,
    default: []
  }
});

// 创建自增序号的静态方法
ImageSchema.statics.getNextSequence = async function() {
  // 查找最大序号
  const maxDoc = await this.findOne({}).sort('-sequenceNumber');
  if (maxDoc) {
    return maxDoc.sequenceNumber + 1;
  }
  return 1; // 如果没有记录，从1开始
};

module.exports = mongoose.model('Image', ImageSchema);