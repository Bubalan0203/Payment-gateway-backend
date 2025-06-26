const bcrypt = require('bcryptjs');

exports.hash = (plain, rounds = 10) => bcrypt.hash(plain, rounds);
exports.compare = (plain, hash)        => bcrypt.compare(plain, hash);