/**
 * backend/src/services/auth.service.js
 *
 * Authentication business logic: registration, login, password
 * hashing (bcrypt), and JWT issuance (req #15 security).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const env = require('../config/env');

/**
 * @param {{name:string, email:string, password:string, role?:string}} data
 * @returns {Promise<object>} the created user (without passwordHash)
 */
async function registerUser({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('A user with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role || 'OPERATOR',
    },
  });

  return sanitizeUser(user);
}

/**
 * @param {{email:string, password:string}} credentials
 * @returns {Promise<{user:object, token:string}>}
 */
async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const token = issueToken(user);

  return { user: sanitizeUser(user), token };
}

/**
 * @param {object} user - Prisma User record
 * @returns {string} signed JWT
 */
function issueToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/**
 * Strip sensitive fields before returning a user object to the client.
 * @param {object} user
 */
function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? sanitizeUser(user) : null;
}

module.exports = {
  registerUser,
  loginUser,
  issueToken,
  sanitizeUser,
  getUserById,
};
