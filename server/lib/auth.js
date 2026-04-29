const crypto = require('node:crypto');

const sessions = new Map();

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');

  return {
    salt,
    passwordHash,
  };
}

function verifyPassword(password, user) {
  const passwordHash = crypto.scryptSync(password, user.salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(passwordHash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    token,
    userId,
    createdAt: new Date().toISOString(),
  });
  return token;
}

function getSession(token) {
  return sessions.get(token);
}

function removeSession(token) {
  sessions.delete(token);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  createPasswordRecord,
  verifyPassword,
  createSession,
  getSession,
  removeSession,
  sanitizeUser,
};
