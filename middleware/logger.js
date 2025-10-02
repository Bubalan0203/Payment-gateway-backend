import RequestLog from "../models/RequestLog.js";
import { v4 as uuidv4 } from "uuid";

const requestLogger = async (req, res, next) => {
  const start = Date.now();

  // Get or create userId
  let userId = req.cookies.userId;
  if (!userId) {
    userId = uuidv4();
    res.cookie("userId", userId, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
  }

  res.on("finish", async () => {
    const log = new RequestLog({
      userId,
      sessionId: req.sessionID || null,
      remoteIp: req.ip,
      userAgent: req.headers["user-agent"],
      requestUrl: req.originalUrl,
      requestMethod: req.method,
      requestTime: new Date(),
      responseTime: Date.now() - start,
      responseStatus: res.statusCode,
      bandwidth: parseInt(res.get("Content-Length")) || 0,
      memoryUsed: process.memoryUsage().heapUsed,
      requestsPerSecond: req.requestsPerSecond,
      requestsPerMinute: req.requestsPerMinute,
      userRequestsPerSecond: req.userRequestsPerSecond,
      userRequestsPerMinute: req.userRequestsPerMinute,
      cpuLoad: req.cpuLoad
    });

    try {
      await log.save();
    } catch (err) {
      console.error("Error saving request log:", err);
    }
  });

  next();
};

export default requestLogger;
