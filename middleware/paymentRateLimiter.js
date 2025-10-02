const lastSuccessMap = new Map(); // userId => timestamp
const FIVE_MINUTES = 5 * 60 * 1000;

function paymentRateLimiter(req, res, next) {
  const userId = req.cookies.userId || req.ip; // identify user
  const lastSuccessTime = lastSuccessMap.get(userId);

  if (lastSuccessTime && Date.now() - lastSuccessTime < FIVE_MINUTES) {
    return res.status(429).json({
      error: `You can make a payment request only once every 5 minutes after success. Please wait.`
    });
  }

  // attach so controller can update on success
  req.lastSuccessMap = lastSuccessMap;
  req.userId = userId;
  next();
}

export default paymentRateLimiter;
