export type Role = 'LIBRARIAN' | 'STUDENT';

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export type LibraryUser = SessionUser & {
  activeLoanCount: number;
  totalTransactions: number;
  outstandingLateFees: number;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  quantity: number;
  availableQuantity: number;
  activeLoanCount: number;
  overdueLoanCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TransactionStatus = 'BORROWED' | 'RETURNED' | 'OVERDUE';

export type Transaction = {
  id: string;
  bookId: string;
  userId: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  status: TransactionStatus;
  daysOverdue: number;
  lateFee: number;
  book: Pick<Book, 'id' | 'title' | 'author' | 'category'>;
  user: Pick<LibraryUser, 'id' | 'fullName' | 'email' | 'role'>;
};

export type DashboardData = {
  summary: {
    totalTitles: number;
    totalCopies: number;
    availableCopies: number;
    activeLoans: number;
    overdueLoans: number;
    totalUsers: number;
    returnedTransactions: number;
    outstandingFees: number;
  };
  recentTransactions: Transaction[];
  overdueTransactions: Transaction[];
  categories: Array<{ category: string; count: number }>;
  popularBooks: Array<{ bookId: string; title: string; borrowCount: number }>;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  fullName: string;
};

export type UserPayload = {
  fullName: string;
  email: string;
  password?: string;
  role: Role;
};

export type BookPayload = {
  title: string;
  author: string;
  category: string;
  quantity: number;
};

export type SessionResponse = {
  token: string;
  user: SessionUser;
  message?: string;
};
