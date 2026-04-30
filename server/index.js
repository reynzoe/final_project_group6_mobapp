const http = require('node:http');

const { loadEnvFile } = require('./lib/env');

loadEnvFile();

const {
  createPasswordRecord,
  createSession,
  getSession,
  removeSession,
  sanitizeUser,
  verifyPassword,
} = require('./lib/auth');
const booksRepository = require('./lib/books');
const { BORROW_WINDOW_DAYS, createId, readStore, writeStore } = require('./lib/data');
const {
  AppError,
  getBearerToken,
  getRequestUrl,
  handleError,
  handleOptions,
  readJsonBody,
  sendJson,
} = require('./lib/http');
const {
  validateAdminUserPayload,
  validateBookPayload,
  validateBorrowPayload,
  validateLoginPayload,
  validateRegistrationPayload,
} = require('./lib/validation');

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const LATE_FEE_PER_DAY = 2.5;

function addDays(dateValue, days) {
  const nextDate = new Date(dateValue);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString();
}

function diffDays(laterDate, earlierDate) {
  const milliseconds = laterDate.getTime() - earlierDate.getTime();
  return Math.max(0, Math.ceil(milliseconds / (1000 * 60 * 60 * 24)));
}

function getTransactionStatus(transaction) {
  if (transaction.status === 'PENDING') {
    return 'PENDING';
  }

  if (transaction.status === 'BORROWED') {
    return 'BORROWED';
  }

  if (transaction.status === 'OVERDUE') {
    return 'OVERDUE';
  }

  if (transaction.returnDate) {
    return 'RETURNED';
  }

  if (!transaction.dueDate) {
    return 'PENDING';
  }

  const dueDate = new Date(transaction.dueDate);

  if (dueDate.getTime() < Date.now()) {
    return 'OVERDUE';
  }

  return 'BORROWED';
}

function getLateFee(transaction) {
  if (!transaction.dueDate) {
    return 0;
  }

  const endDate = transaction.returnDate ? new Date(transaction.returnDate) : new Date();
  const dueDate = new Date(transaction.dueDate);
  return diffDays(endDate, dueDate) * LATE_FEE_PER_DAY;
}

function bookIncludesId(book, bookId) {
  return book.id === bookId || book.copyIds?.includes(bookId);
}

function serializeBook(book, store) {
  const activeTransactions = store.transactions.filter((transaction) => {
    if (!bookIncludesId(book, transaction.bookId)) {
      return false;
    }

    const status = getTransactionStatus(transaction);
    return status === 'BORROWED' || status === 'OVERDUE';
  });
  const overdueTransactions = activeTransactions.filter(
    (transaction) => getTransactionStatus(transaction) === 'OVERDUE'
  );

  return {
    ...book,
    activeLoanCount: activeTransactions.length,
    overdueLoanCount: overdueTransactions.length,
  };
}

function serializeUser(user, store) {
  const userTransactions = store.transactions.filter((transaction) => transaction.userId === user.id);
  const activeLoanCount = userTransactions.filter((transaction) => {
    const status = getTransactionStatus(transaction);
    return status === 'BORROWED' || status === 'OVERDUE';
  }).length;
  const outstandingLateFees = userTransactions
    .filter((transaction) => getTransactionStatus(transaction) === 'OVERDUE')
    .reduce((sum, transaction) => sum + getLateFee(transaction), 0);

  return {
    ...sanitizeUser(user),
    activeLoanCount,
    totalTransactions: userTransactions.length,
    outstandingLateFees,
  };
}

function serializeTransaction(transaction, store) {
  const book = store.books.find((item) => bookIncludesId(item, transaction.bookId));
  const user = store.users.find((item) => item.id === transaction.userId);
  const status = getTransactionStatus(transaction);

  return {
    ...transaction,
    status,
    daysOverdue:
      status === 'OVERDUE' && transaction.dueDate
        ? diffDays(new Date(), new Date(transaction.dueDate))
        : 0,
    lateFee: Number(getLateFee(transaction).toFixed(2)),
    book: {
      id: book?.id ?? transaction.bookId,
      title: book?.title ?? 'Unknown title',
      author: book?.author ?? 'Unknown author',
      category: book?.category ?? 'Uncategorized',
    },
    user: user
      ? sanitizeUser(user)
      : {
          id: transaction.userId,
          fullName: 'Unknown user',
          email: '',
          role: 'STUDENT',
        },
  };
}

async function hydrateBooks(store) {
  if (booksRepository.isSupabaseEnabled()) {
    store.books = await booksRepository.listBooks();
  }

  return store;
}

function getDashboardForUser(currentUser, store) {
  const visibleTransactions =
    currentUser.role === 'LIBRARIAN'
      ? store.transactions
      : store.transactions.filter((transaction) => transaction.userId === currentUser.id);

  const visibleBooks =
    currentUser.role === 'LIBRARIAN'
      ? store.books
      : store.books;

  const activeTransactions = visibleTransactions.filter((transaction) => {
    const status = getTransactionStatus(transaction);
    return status === 'BORROWED' || status === 'OVERDUE';
  });
  const overdueTransactions = activeTransactions.filter(
    (transaction) => getTransactionStatus(transaction) === 'OVERDUE'
  );
  const returnedTransactions = visibleTransactions.filter((transaction) => !!transaction.returnDate);
  const outstandingFees = overdueTransactions.reduce((sum, transaction) => sum + getLateFee(transaction), 0);
  const categories = Object.entries(
    visibleBooks.reduce((grouped, book) => {
      grouped[book.category] = (grouped[book.category] || 0) + 1;
      return grouped;
    }, {})
  )
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);

  const popularBooks = Object.entries(
    visibleTransactions.reduce((grouped, transaction) => {
      const matchedBook = store.books.find((book) => bookIncludesId(book, transaction.bookId));
      const normalizedBookId = matchedBook?.id ?? transaction.bookId;

      grouped[normalizedBookId] = (grouped[normalizedBookId] || 0) + 1;
      return grouped;
    }, {})
  )
    .map(([bookId, borrowCount]) => {
      const book = store.books.find((item) => item.id === bookId);
      return {
        bookId,
        title: book ? book.title : 'Unknown title',
        borrowCount,
      };
    })
    .sort((left, right) => right.borrowCount - left.borrowCount)
    .slice(0, 4);

  return {
    summary: {
      totalTitles: visibleBooks.length,
      totalCopies: visibleBooks.reduce((sum, book) => sum + book.quantity, 0),
      availableCopies: visibleBooks.reduce((sum, book) => sum + book.availableQuantity, 0),
      activeLoans: activeTransactions.length,
      overdueLoans: overdueTransactions.length,
      totalUsers: currentUser.role === 'LIBRARIAN' ? store.users.length : 1,
      returnedTransactions: returnedTransactions.length,
      outstandingFees: Number(outstandingFees.toFixed(2)),
    },
    recentTransactions: visibleTransactions
      .slice()
      .sort((left, right) => new Date(right.borrowDate).getTime() - new Date(left.borrowDate).getTime())
      .slice(0, 6)
      .map((transaction) => serializeTransaction(transaction, store)),
    overdueTransactions: overdueTransactions
      .slice()
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
      .map((transaction) => serializeTransaction(transaction, store)),
    categories,
    popularBooks,
  };
}

function requireUser(request, store, allowedRoles) {
  const token = getBearerToken(request);

  if (!token) {
    throw new AppError(401, 'Authentication is required.');
  }

  const session = getSession(token);

  if (!session) {
    throw new AppError(401, 'Your session is no longer valid. Please sign in again.');
  }

  const currentUser = store.users.find((user) => user.id === session.userId);

  if (!currentUser) {
    throw new AppError(401, 'The authenticated user could not be found.');
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    throw new AppError(403, 'You do not have permission to perform this action.');
  }

  return { currentUser, token };
}

function findUserByEmail(store, email) {
  return store.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function assertUniqueEmail(store, email, ignoredUserId) {
  const duplicateUser = store.users.find(
    (user) => user.email.toLowerCase() === email.toLowerCase() && user.id !== ignoredUserId
  );

  if (duplicateUser) {
    throw new AppError(409, 'A user with that email address already exists.');
  }
}

function ensureBookExists(store, bookId) {
  const book = store.books.find((item) => bookIncludesId(item, bookId));

  if (!book) {
    throw new AppError(404, 'Book not found.');
  }

  return book;
}

function ensureUserExists(store, userId) {
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  return user;
}

async function handleRequest(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  const url = getRequestUrl(request);
  const pathname = url.pathname;
  const method = request.method;

  try {
    if (method === 'GET' && pathname === '/api/health') {
      sendJson(response, 200, {
        message: 'Library API is running.',
        booksSource: booksRepository.isSupabaseEnabled() ? 'supabase' : 'local-json',
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/auth/login') {
      const store = readStore();
      const payload = validateLoginPayload(await readJsonBody(request));
      const user = findUserByEmail(store, payload.email);

      if (!user || !verifyPassword(payload.password, user)) {
        throw new AppError(401, 'Incorrect email or password.');
      }

      const token = createSession(user.id);

      sendJson(response, 200, {
        token,
        user: sanitizeUser(user),
        message: 'Signed in successfully.',
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/auth/register') {
      const store = readStore();
      const payload = validateRegistrationPayload(await readJsonBody(request));
      assertUniqueEmail(store, payload.email);

      const createdAt = new Date().toISOString();
      const nextUser = {
        id: createId('usr'),
        fullName: payload.fullName,
        email: payload.email,
        role: 'STUDENT',
        ...createPasswordRecord(payload.password),
        createdAt,
        updatedAt: createdAt,
      };

      store.users.push(nextUser);
      writeStore(store);

      const token = createSession(nextUser.id);

      sendJson(response, 201, {
        token,
        user: sanitizeUser(nextUser),
        message: 'Account created successfully.',
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/auth/logout') {
      const token = getBearerToken(request);

      if (token) {
        removeSession(token);
      }

      sendJson(response, 200, {
        message: 'Signed out successfully.',
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/auth/me') {
      const store = readStore();
      const { currentUser } = requireUser(request, store);
      sendJson(response, 200, {
        user: sanitizeUser(currentUser),
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/dashboard') {
      const store = await hydrateBooks(readStore());
      const { currentUser } = requireUser(request, store);
      sendJson(response, 200, getDashboardForUser(currentUser, store));
      return;
    }

    if (method === 'GET' && pathname === '/api/books') {
      const store = await hydrateBooks(readStore());
      requireUser(request, store);
      const search = url.searchParams.get('search')?.trim().toLowerCase() || '';
      const filteredBooks = store.books
        .filter((book) => {
          if (!search) {
            return true;
          }

          return [book.title, book.author, book.category]
            .join(' ')
            .toLowerCase()
            .includes(search);
        })
        .sort((left, right) => left.title.localeCompare(right.title))
        .map((book) => serializeBook(book, store));

      sendJson(response, 200, {
        books: filteredBooks,
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/books') {
      const store = await hydrateBooks(readStore());
      requireUser(request, store, ['LIBRARIAN']);
      const payload = validateBookPayload(await readJsonBody(request));
      const createdAt = new Date().toISOString();

      let nextBook;

      if (booksRepository.isSupabaseEnabled()) {
        nextBook = await booksRepository.createBook(payload);
        store.books.push(nextBook);
      } else {
        nextBook = {
          id: createId('bk'),
          ...payload,
          availableQuantity: payload.quantity,
          createdAt,
          updatedAt: createdAt,
        };

        store.books.push(nextBook);
        writeStore(store);
      }

      sendJson(response, 201, {
        message: 'Book created successfully.',
        book: serializeBook(nextBook, store),
      });
      return;
    }

    const bookMatch = pathname.match(/^\/api\/books\/([^/]+)$/);
    if (bookMatch && method === 'PUT') {
      const store = await hydrateBooks(readStore());
      requireUser(request, store, ['LIBRARIAN']);
      const payload = validateBookPayload(await readJsonBody(request));
      const book = ensureBookExists(store, bookMatch[1]);
      const activeLoans = store.transactions.filter((transaction) => {
        if (!bookIncludesId(book, transaction.bookId)) {
          return false;
        }

        const status = getTransactionStatus(transaction);
        return status === 'BORROWED' || status === 'OVERDUE' || status === 'PENDING_RETURN';
      }).length;

      if (payload.quantity < activeLoans) {
        throw new AppError(
          409,
          'Quantity cannot be lower than the number of active loans for this book.'
        );
      }

      let updatedBook;

      if (booksRepository.isSupabaseEnabled()) {
        updatedBook = await booksRepository.updateBook(book.id, payload, activeLoans);
        store.books = store.books.map((item) => (item.id === updatedBook.id ? updatedBook : item));
      } else {
        book.title = payload.title;
        book.author = payload.author;
        book.category = payload.category;
        book.cabinet = payload.cabinet;
        book.rack = payload.rack;
        book.row = payload.row;
        book.quantity = payload.quantity;
        book.availableQuantity = payload.quantity - activeLoans;
        book.updatedAt = new Date().toISOString();
        updatedBook = book;

        writeStore(store);
      }

      sendJson(response, 200, {
        message: 'Book updated successfully.',
        book: serializeBook(updatedBook, store),
      });
      return;
    }

    if (bookMatch && method === 'DELETE') {
      const store = await hydrateBooks(readStore());
      requireUser(request, store, ['LIBRARIAN']);
      const bookId = bookMatch[1];
      const book = ensureBookExists(store, bookId);
      const activeLoans = store.transactions.filter((transaction) => {
        if (!bookIncludesId(book, transaction.bookId)) {
          return false;
        }

        const status = getTransactionStatus(transaction);
        return status === 'PENDING' || status === 'BORROWED' || status === 'OVERDUE';
      });

      if (activeLoans.length > 0) {
        throw new AppError(409, 'Books with active or pending loans cannot be deleted.');
      }

      const nextBooks = store.books.filter((item) => item.id !== bookId);

      if (nextBooks.length === store.books.length) {
        throw new AppError(404, 'Book not found.');
      }

      if (booksRepository.isSupabaseEnabled()) {
        await booksRepository.deleteBook(book.id);
      } else {
        store.books = nextBooks;
        writeStore(store);
      }

      sendJson(response, 200, {
        message: 'Book deleted successfully.',
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/users') {
      const store = readStore();
      requireUser(request, store, ['LIBRARIAN']);
      sendJson(response, 200, {
        users: store.users
          .slice()
          .sort((left, right) => left.fullName.localeCompare(right.fullName))
          .map((listedUser) => serializeUser(listedUser, store)),
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/users') {
      const store = readStore();
      requireUser(request, store, ['LIBRARIAN']);
      const payload = validateAdminUserPayload(await readJsonBody(request));
      assertUniqueEmail(store, payload.email);

      const createdAt = new Date().toISOString();
      const nextUser = {
        id: createId('usr'),
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        ...createPasswordRecord(payload.password),
        createdAt,
        updatedAt: createdAt,
      };

      store.users.push(nextUser);
      writeStore(store);

      sendJson(response, 201, {
        message: 'User created successfully.',
        user: serializeUser(nextUser, store),
      });
      return;
    }

    const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && method === 'PUT') {
      const store = readStore();
      const { currentUser } = requireUser(request, store);
      const targetUser = ensureUserExists(store, userMatch[1]);
      const isSelf = currentUser.id === targetUser.id;
      const isAdmin = currentUser.role === 'LIBRARIAN';

      if (!isAdmin && !isSelf) {
        throw new AppError(403, 'You can only edit your own profile.');
      }

      const payload = validateAdminUserPayload(await readJsonBody(request), true);
      assertUniqueEmail(store, payload.email, targetUser.id);

      if (!isAdmin && payload.role !== targetUser.role) {
        throw new AppError(403, 'You cannot change your role.');
      }

      const librarianCount = store.users.filter((user) => user.role === 'LIBRARIAN').length;
      if (
        targetUser.role === 'LIBRARIAN' &&
        payload.role === 'STUDENT' &&
        librarianCount === 1
      ) {
        throw new AppError(409, 'The last librarian account cannot be changed to a student.');
      }

      targetUser.fullName = payload.fullName;
      targetUser.email = payload.email;
      targetUser.role = payload.role;
      targetUser.updatedAt = new Date().toISOString();

      if (payload.password) {
        const passwordRecord = createPasswordRecord(payload.password);
        targetUser.passwordHash = passwordRecord.passwordHash;
        targetUser.salt = passwordRecord.salt;
      }

      writeStore(store);

      sendJson(response, 200, {
        message: 'User updated successfully.',
        user: serializeUser(targetUser, store),
      });
      return;
    }

    if (userMatch && method === 'DELETE') {
      const store = readStore();
      const { currentUser } = requireUser(request, store, ['LIBRARIAN']);
      const targetUserId = userMatch[1];
      const targetUser = ensureUserExists(store, targetUserId);

      if (currentUser.id === targetUserId) {
        throw new AppError(409, 'Librarians cannot delete their own account from the app.');
      }

      const librarianCount = store.users.filter((user) => user.role === 'LIBRARIAN').length;
      if (targetUser.role === 'LIBRARIAN' && librarianCount === 1) {
        throw new AppError(409, 'The last librarian account cannot be deleted.');
      }

      const activeLoans = store.transactions.filter(
        (transaction) => transaction.userId === targetUserId && !transaction.returnDate
      );

      if (activeLoans.length > 0) {
        throw new AppError(409, 'Users with active loans cannot be deleted.');
      }

      store.users = store.users.filter((user) => user.id !== targetUserId);
      writeStore(store);

      sendJson(response, 200, {
        message: 'User deleted successfully.',
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/transactions') {
      const store = await hydrateBooks(readStore());
      const { currentUser } = requireUser(request, store);
      const visibleTransactions =
        currentUser.role === 'LIBRARIAN'
          ? store.transactions
          : store.transactions.filter((transaction) => transaction.userId === currentUser.id);

      sendJson(response, 200, {
        transactions: visibleTransactions
          .slice()
          .sort((left, right) => new Date(right.borrowDate).getTime() - new Date(left.borrowDate).getTime())
          .map((transaction) => serializeTransaction(transaction, store)),
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/transactions/borrow') {
      const store = await hydrateBooks(readStore());
      const { currentUser } = requireUser(request, store);
      const payload = validateBorrowPayload(await readJsonBody(request));
      const book = ensureBookExists(store, payload.bookId);

      if (book.availableQuantity < 1) {
        throw new AppError(409, 'This book is currently unavailable.');
      }

      const hasActiveLoan = store.transactions.some(
        (transaction) =>
          bookIncludesId(book, transaction.bookId) &&
          transaction.userId === currentUser.id &&
          !transaction.returnDate
      );

      if (hasActiveLoan) {
        throw new AppError(409, 'You already have an active loan for this book.');
      }

      const borrowDate = new Date().toISOString();
      const nextTransaction = {
        id: createId('txn'),
        bookId: payload.bookId,
        userId: currentUser.id,
        borrowDate,
        dueDate: null,
        returnDate: null,
        status: 'PENDING',
      };

      if (booksRepository.isSupabaseEnabled()) {
        const updatedBook = await booksRepository.updateBookAvailability(
          book.id,
          'borrow'
        );
        store.books = store.books.map((item) => (item.id === updatedBook.id ? updatedBook : item));
      } else {
        const nextAvailableQuantity = Math.max(0, book.availableQuantity - 1);
        book.availableQuantity = nextAvailableQuantity;
        book.updatedAt = new Date().toISOString();
      }

      store.transactions.push(nextTransaction);
      writeStore(store);

      sendJson(response, 201, {
        message: 'Borrow request submitted for approval.',
        transaction: serializeTransaction(nextTransaction, store),
      });
      return;
    }

    const approveMatch = pathname.match(/^\/api\/transactions\/([^/]+)\/approve$/);
    if (approveMatch && method === 'POST') {
      const store = await hydrateBooks(readStore());
      const { currentUser } = requireUser(request, store, ['LIBRARIAN']);
      const transaction = store.transactions.find((item) => item.id === approveMatch[1]);

      if (!transaction) {
        throw new AppError(404, 'Transaction not found.');
      }

      if (transaction.returnDate) {
        throw new AppError(409, 'This request has already been closed.');
      }

      if (getTransactionStatus(transaction) !== 'PENDING') {
        throw new AppError(409, 'Only pending borrow requests can be approved.');
      }

      transaction.status = 'BORROWED';
      transaction.dueDate = addDays(transaction.borrowDate, BORROW_WINDOW_DAYS);

      writeStore(store);

      sendJson(response, 200, {
        message: 'Borrow request approved.',
        transaction: serializeTransaction(transaction, store),
      });
      return;
    }

    const returnMatch = pathname.match(/^\/api\/transactions\/([^/]+)\/return$/);
    if (returnMatch && method === 'POST') {
      const store = await hydrateBooks(readStore());
      requireUser(request, store, ['LIBRARIAN']);
      const transaction = store.transactions.find((item) => item.id === returnMatch[1]);

      if (!transaction) {
        throw new AppError(404, 'Transaction not found.');
      }

      if (transaction.returnDate) {
        throw new AppError(409, 'This book has already been returned.');
      }

      if (getTransactionStatus(transaction) === 'PENDING') {
        throw new AppError(409, 'Pending requests must be approved before returning.');
      }

      const book = ensureBookExists(store, transaction.bookId);
      transaction.returnDate = new Date().toISOString();

      if (booksRepository.isSupabaseEnabled()) {
        const updatedBook = await booksRepository.updateBookAvailability(
          book.id,
          'return'
        );
        store.books = store.books.map((item) => (item.id === updatedBook.id ? updatedBook : item));
      } else {
        const nextAvailableQuantity = Math.min(book.quantity, book.availableQuantity + 1);
        book.availableQuantity = nextAvailableQuantity;
        book.updatedAt = new Date().toISOString();
      }

      writeStore(store);

      sendJson(response, 200, {
        message: 'Book returned successfully.',
        transaction: serializeTransaction(transaction, store),
      });
      return;
    }

    const returnRequestMatch = pathname.match(/^\/api\/transactions\/([^/]+)\/return-request$/);
    if (returnRequestMatch && method === 'POST') {
      const store = await hydrateBooks(readStore());
      const { currentUser } = requireUser(request, store);
      const transaction = store.transactions.find((item) => item.id === returnRequestMatch[1]);

      if (!transaction) {
        throw new AppError(404, 'Transaction not found.');
      }

      if (currentUser.role !== 'LIBRARIAN' && transaction.userId !== currentUser.id) {
        throw new AppError(403, 'You can only request returns from your own account.');
      }

      if (transaction.returnDate) {
        throw new AppError(409, 'This book has already been returned.');
      }

      const status = getTransactionStatus(transaction);

      if (status === 'PENDING') {
        throw new AppError(409, 'Pending borrow requests must be approved before returning.');
      }

      if (status === 'PENDING_RETURN') {
        throw new AppError(409, 'This return is already waiting for librarian approval.');
      }

      transaction.status = 'PENDING_RETURN';
      writeStore(store);

      sendJson(response, 200, {
        message: 'Return request submitted for approval.',
        transaction: serializeTransaction(transaction, store),
      });
      return;
    }

    throw new AppError(404, 'Route not found.');
  } catch (error) {
    handleError(response, error);
  }
}

const server = http.createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(PORT, HOST, () => {
  console.log(`Library API listening on http://${HOST}:${PORT}`);
});
