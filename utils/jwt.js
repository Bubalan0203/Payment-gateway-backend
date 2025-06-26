const jwt  = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES } = process.env;

/* sign({ id, type })  →  token */
exports.sign = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES || '1h' });

/* verify(token) → decoded | throws */
exports.verify = (token) =>
  jwt.verify(token, JWT_SECRET);