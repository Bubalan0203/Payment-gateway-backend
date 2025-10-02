// middleware/trafficMonitor.js
import os from "os";

const trafficData = {
  requests: [], // global timestamps
  spikeThreshold: 50 // global spike threshold
};

// Map to track per-user requests
const userTraffic = new Map(); // userId => [timestamps]

function trafficMonitor(req, res, next) {
  const now = Date.now();
  const userId = req.cookies.userId || "guest";

  // --- GLOBAL REQUESTS ---
  trafficData.requests = trafficData.requests.filter(ts => now - ts < 60000);
  trafficData.requests.push(now);
  const requestsLastMinute = trafficData.requests.length;
  const requestsLastSecond = trafficData.requests.filter(ts => now - ts < 1000).length;

  // --- PER-USER REQUESTS ---
  if (!userTraffic.has(userId)) {
    userTraffic.set(userId, []);
  }
  const userRequests = userTraffic.get(userId).filter(ts => now - ts < 60000);
  userRequests.push(now);
  userTraffic.set(userId, userRequests);
  const userReqLastMinute = userRequests.length;
  const userReqLastSecond = userRequests.filter(ts => now - ts < 1000).length;

  // Attach stats to req
  req.requestsPerSecond = requestsLastSecond;
  req.requestsPerMinute = requestsLastMinute;
  req.userRequestsPerSecond = userReqLastSecond;
  req.userRequestsPerMinute = userReqLastMinute;
  req.cpuLoad = os.loadavg()[0]; // 1-min CPU load

  // Spike warning
  if (requestsLastSecond > trafficData.spikeThreshold) {
    console.warn(`⚠️ Global traffic spike! ${requestsLastSecond} req/sec`);
  }
  if (userReqLastSecond > 20) {
    console.warn(`⚠️ User ${userId} spike! ${userReqLastSecond} req/sec`);
  }

  next();
}

export default trafficMonitor;
