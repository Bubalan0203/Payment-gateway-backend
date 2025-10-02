import mongoose from "mongoose";

const requestLogSchema = new mongoose.Schema({
  userId: { type: String },
  sessionId: { type: String },
  remoteIp: { type: String },
  userAgent: { type: String },
  requestUrl: { type: String },
  requestMethod: { type: String },
  requestTime: { type: Date, default: Date.now },
  responseTime: { type: Number }, // ms
  responseStatus: { type: Number },
  bandwidth: { type: Number }, // bytes
  concurrentUsers: { type: Number },
  memoryUsed: { type: Number }, // bytes
  requestsPerSecond: { type: Number },
  requestsPerMinute: { type: Number },
  cpuLoad: { type: Number } // 1-min load average
});

const RequestLog = mongoose.model("RequestLog", requestLogSchema);

export default RequestLog;
