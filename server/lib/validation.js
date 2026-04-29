const { AppError } = require('./http');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set(['LIBRARIAN', 'STUDENT']);

function requireText(field, value, { min = 2, max = 120 } = {}) {
  if (typeof value !== 'string') {
    throw new AppError(422, `${field} must be a text value.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new AppError(422, `${field} is required.`);
  }

  if (normalized.length < min) {
    throw new AppError(422, `${field} must be at least ${min} characters long.`);
  }

  if (normalized.length > max) {
    throw new AppError(422, `${field} must be ${max} characters or fewer.`);
  }

  return normalized;
}

function validateEmail(email) {
  const normalized = requireText('Email', email, { min: 5, max: 160 }).toLowerCase();

  if (!EMAIL_REGEX.test(normalized)) {
    throw new AppError(422, 'Email address is invalid.');
  }

  return normalized;
}

function validatePassword(password, allowEmpty = false) {
  if (allowEmpty && (password === undefined || password === null || password === '')) {
    return null;
  }

  const normalized = requireText('Password', password, { min: 8, max: 128 });

  if (!/[A-Z]/.test(normalized) || !/[a-z]/.test(normalized) || !/\d/.test(normalized)) {
    throw new AppError(422, 'Password must include uppercase, lowercase, and a number.');
  }

  return normalized;
}

function validateRole(role) {
  if (!ROLES.has(role)) {
    throw new AppError(422, 'Role must be either LIBRARIAN or STUDENT.');
  }

  return role;
}

function validateQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new AppError(422, 'Quantity must be a whole number greater than or equal to 0.');
  }

  return quantity;
}

function validateBookPayload(payload) {
  return {
    title: requireText('Title', payload.title),
    author: requireText('Author', payload.author),
    category: requireText('Category', payload.category),
    cabinet: requireText('Cabinet', payload.cabinet, { min: 1, max: 40 }),
    rack: requireText('Rack', payload.rack, { min: 1, max: 40 }),
    row: requireText('Row', payload.row, { min: 1, max: 40 }),
    quantity: validateQuantity(payload.quantity),
  };
}

function validateRegistrationPayload(payload) {
  return {
    fullName: requireText('Full name', payload.fullName),
    email: validateEmail(payload.email),
    password: validatePassword(payload.password),
  };
}

function validateAdminUserPayload(payload, allowEmptyPassword = false) {
  return {
    fullName: requireText('Full name', payload.fullName),
    email: validateEmail(payload.email),
    password: validatePassword(payload.password, allowEmptyPassword),
    role: validateRole(payload.role),
  };
}

function validateLoginPayload(payload) {
  return {
    email: validateEmail(payload.email),
    password: requireText('Password', payload.password, { min: 8, max: 128 }),
  };
}

function validateBorrowPayload(payload) {
  return {
    bookId: requireText('Book ID', payload.bookId, { min: 6, max: 80 }),
  };
}

module.exports = {
  validateBookPayload,
  validateRegistrationPayload,
  validateAdminUserPayload,
  validateLoginPayload,
  validateBorrowPayload,
};
