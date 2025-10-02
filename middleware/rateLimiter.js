// middleware/rateLimiter.js
const rateLimitWindowMS = 1000; // 1 second window
const maxRequestsPerUserPerSec = 50;

const userRequestsMap = new Map(); // userId => [timestamps]

function rateLimiter(req, res, next) {
  const userId = req.cookies.userId || "guest";
  const now = Date.now();

  if (!userRequestsMap.has(userId)) {
    userRequestsMap.set(userId, []);
  }

  // Remove old timestamps outside the window
  const timestamps = userRequestsMap.get(userId).filter(ts => now - ts < rateLimitWindowMS);

  timestamps.push(now); // add current request
  userRequestsMap.set(userId, timestamps);

  req.userRequestsPerSecond = timestamps.length; // pass to logger
  req.userRequestsPerMinute = timestamps.length; // simple approximation, can enhance later

  if (timestamps.length > maxRequestsPerUserPerSec) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }

  next();
}

export default rateLimiter;
