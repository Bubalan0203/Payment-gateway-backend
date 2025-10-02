import { verify } from '../utils/jwt.js';

const authMiddleware = (role = 'user') => (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');

  try {
    const decoded = verify(token); // throws if invalid / expired

    if (decoded.type !== role)
      return res.status(403).json({ error: 'Forbidden' });

    req.user = { id: decoded.id, type: decoded.type };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthenticated', details: err.message });
  }
};

export default authMiddleware;
