const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { createPasswordRecord } = require('./auth');

const DATA_FILE = path.join(__dirname, '..', 'data', 'library.json');

const BORROW_WINDOW_DAYS = 14;

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString();
}

function createSeedData() {
  const createdAt = new Date().toISOString();
  const adminId = createId('usr');
  const studentId = createId('usr');
  const secondStudentId = createId('usr');
  const bookA = createId('bk');
  const bookB = createId('bk');
  const bookC = createId('bk');
  const bookD = createId('bk');
  const bookE = createId('bk');
  const bookF = createId('bk');
  const now = new Date();

  const borrowedAt = new Date(now);
  borrowedAt.setDate(now.getDate() - 5);

  const overdueBorrowedAt = new Date(now);
  overdueBorrowedAt.setDate(now.getDate() - 18);

  const returnedBorrowedAt = new Date(now);
  returnedBorrowedAt.setDate(now.getDate() - 20);

  const returnedAt = new Date(now);
  returnedAt.setDate(now.getDate() - 2);

  return {
    users: [
      {
        id: adminId,
        fullName: 'Maya Librarian',
        email: 'admin@libraryapp.local',
        role: 'LIBRARIAN',
        ...createPasswordRecord('Admin123!'),
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: studentId,
        fullName: 'Elliot Reyes',
        email: 'student@libraryapp.local',
        role: 'STUDENT',
        ...createPasswordRecord('Student123!'),
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: secondStudentId,
        fullName: 'Talia Brooks',
        email: 'talia@libraryapp.local',
        role: 'STUDENT',
        ...createPasswordRecord('Student123!'),
        createdAt,
        updatedAt: createdAt,
      },
    ],
    books: [
      {
        id: bookA,
        title: 'The Midnight Library',
        author: 'Matt Haig',
        category: 'Fiction',
        quantity: 6,
        availableQuantity: 5,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: bookB,
        title: 'Atomic Habits',
        author: 'James Clear',
        category: 'Productivity',
        quantity: 4,
        availableQuantity: 3,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: bookC,
        title: 'Clean Code',
        author: 'Robert C. Martin',
        category: 'Technology',
        quantity: 3,
        availableQuantity: 3,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: bookD,
        title: 'Educated',
        author: 'Tara Westover',
        category: 'Memoir',
        quantity: 5,
        availableQuantity: 5,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: bookE,
        title: 'Sapiens',
        author: 'Yuval Noah Harari',
        category: 'History',
        quantity: 5,
        availableQuantity: 5,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: bookF,
        title: 'The Design of Everyday Things',
        author: 'Don Norman',
        category: 'Design',
        quantity: 2,
        availableQuantity: 2,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    transactions: [
      {
        id: createId('txn'),
        bookId: bookA,
        userId: studentId,
        borrowDate: borrowedAt.toISOString(),
        dueDate: addDays(borrowedAt, BORROW_WINDOW_DAYS),
        returnDate: null,
      },
      {
        id: createId('txn'),
        bookId: bookB,
        userId: secondStudentId,
        borrowDate: overdueBorrowedAt.toISOString(),
        dueDate: addDays(overdueBorrowedAt, BORROW_WINDOW_DAYS),
        returnDate: null,
      },
      {
        id: createId('txn'),
        bookId: bookC,
        userId: studentId,
        borrowDate: returnedBorrowedAt.toISOString(),
        dueDate: addDays(returnedBorrowedAt, BORROW_WINDOW_DAYS),
        returnDate: returnedAt.toISOString(),
      },
    ],
  };
}

function ensureStore() {
  const dataDirectory = path.dirname(DATA_FILE);
  fs.mkdirSync(dataDirectory, { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    const seedData = createSeedData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seedData, null, 2));
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeStore(nextStore) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(nextStore, null, 2));
}

module.exports = {
  BORROW_WINDOW_DAYS,
  DATA_FILE,
  createId,
  readStore,
  writeStore,
};
