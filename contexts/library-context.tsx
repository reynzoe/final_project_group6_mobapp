import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api';
import {
  Book,
  BookPayload,
  DashboardData,
  LibraryUser,
  Transaction,
  UserPayload,
} from '@/types/library';

type LibraryContextValue = {
  books: Book[];
  users: LibraryUser[];
  transactions: Transaction[];
  dashboard: DashboardData | null;
  isLoading: boolean;
  isMutating: boolean;
  searchQuery: string;
  error: string | null;
  reloadAll: (query?: string) => Promise<void>;
  loadBooks: (query?: string) => Promise<void>;
  createBook: (payload: BookPayload) => Promise<void>;
  updateBook: (bookId: string, payload: BookPayload) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  borrowBook: (bookId: string) => Promise<void>;
  returnBook: (transactionId: string) => Promise<void>;
  createUser: (payload: UserPayload) => Promise<void>;
  updateUser: (userId: string, payload: UserPayload) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  clearError: () => void;
};

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

function normalizeBooksById(rawBooks: Book[]) {
  const uniqueBooks = new Map<string, Book>();

  rawBooks.forEach((book) => {
    if (!uniqueBooks.has(book.id)) {
      uniqueBooks.set(book.id, book);
    }
  });

  return Array.from(uniqueBooks.values());
}

export function LibraryProvider({ children }: PropsWithChildren) {
  const { token, user, refreshUser } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<LibraryUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  function clearError() {
    setError(null);
  }

  function resetState() {
    setBooks([]);
    setUsers([]);
    setTransactions([]);
    setDashboard(null);
    setSearchQuery('');
    setError(null);
  }

  async function loadBooks(query = searchQuery) {
    if (!token) {
      return;
    }

    try {
      setError(null);
      setSearchQuery(query);
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set('search', query.trim());
      }

      const response = await apiRequest<{ books: Book[] }>(
        `/books${params.toString() ? `?${params.toString()}` : ''}`,
        {
          token,
        }
      );

      setBooks(normalizeBooksById(response.books));
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Unable to load the book catalogue.';
      setError(message);
      throw requestError;
    }
  }

  async function loadUsers() {
    if (!token || user?.role !== 'LIBRARIAN') {
      setUsers([]);
      return;
    }

    const response = await apiRequest<{ users: LibraryUser[] }>('/users', {
      token,
    });
    setUsers(response.users);
  }

  async function loadTransactions() {
    if (!token) {
      return;
    }

    const response = await apiRequest<{ transactions: Transaction[] }>('/transactions', {
      token,
    });
    setTransactions(response.transactions);
  }

  async function loadDashboard() {
    if (!token) {
      return;
    }

    const response = await apiRequest<DashboardData>('/dashboard', {
      token,
    });
    setDashboard(response);
  }

  async function reloadAll(query = searchQuery) {
    if (!token) {
      return;
    }

    setIsLoading(true);

    try {
      setError(null);
      await Promise.all([
        loadDashboard(),
        loadBooks(query),
        loadTransactions(),
        user?.role === 'LIBRARIAN' ? loadUsers() : Promise.resolve(),
      ]);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Unable to refresh library data.';
      setError(message);
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  async function runMutation(task: () => Promise<void>, refreshQuery = searchQuery) {
    setIsMutating(true);

    try {
      setError(null);
      await task();
      await reloadAll(refreshQuery);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'The requested change could not be saved.';
      setError(message);
      throw requestError;
    } finally {
      setIsMutating(false);
    }
  }

  async function createBook(payload: BookPayload) {
    if (!token) {
      return;
    }

    await runMutation(async () => {
      await apiRequest('/books', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      });
    });
  }

  async function updateBook(bookId: string, payload: BookPayload) {
    if (!token) {
      return;
    }

    await runMutation(async () => {
      await apiRequest(`/books/${bookId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(payload),
      });
    });
  }

  async function deleteBook(bookId: string) {
    if (!token) {
      return;
    }

    await runMutation(async () => {
      await apiRequest(`/books/${bookId}`, {
        method: 'DELETE',
        token,
      });
    });
  }

  async function borrowBook(bookId: string) {
    if (!token) {
      return;
    }

    await runMutation(async () => {
      await apiRequest('/transactions/borrow', {
        method: 'POST',
        token,
        body: JSON.stringify({ bookId }),
      });
    });
  }

  async function returnBook(transactionId: string) {
    if (!token) {
      return;
    }

    await runMutation(async () => {
      await apiRequest(`/transactions/${transactionId}/return`, {
        method: 'POST',
        token,
      });
    });
  }

  async function createUser(payload: UserPayload) {
    if (!token) {
      return;
    }

    await runMutation(async () => {
      await apiRequest('/users', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      });
    });
  }

  async function updateUser(userId: string, payload: UserPayload) {
    if (!token) {
      return;
    }

    await runMutation(async () => {
      await apiRequest(`/users/${userId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(payload),
      });

      if (userId === user?.id) {
        await refreshUser();
      }
    });
  }

  async function deleteUser(userId: string) {
    if (!token) {
      return;
    }

    await runMutation(async () => {
      await apiRequest(`/users/${userId}`, {
        method: 'DELETE',
        token,
      });
    });
  }

  useEffect(() => {
    if (!token || !user) {
      resetState();
      return;
    }

    const currentUser = user;
    let isCancelled = false;

    async function bootstrap() {
      setIsLoading(true);

      try {
        setError(null);
        const [dashboardResponse, booksResponse, transactionsResponse, usersResponse] = await Promise.all([
          apiRequest<DashboardData>('/dashboard', { token }),
          apiRequest<{ books: Book[] }>('/books', { token }),
          apiRequest<{ transactions: Transaction[] }>('/transactions', { token }),
          currentUser.role === 'LIBRARIAN'
            ? apiRequest<{ users: LibraryUser[] }>('/users', { token })
            : Promise.resolve({ users: [] }),
        ]);

        if (isCancelled) {
          return;
        }

        setDashboard(dashboardResponse);
        setBooks(normalizeBooksById(booksResponse.books));
        setTransactions(transactionsResponse.transactions);
        setUsers(usersResponse.users);
        setSearchQuery('');
      } catch (requestError) {
        if (isCancelled) {
          return;
        }

        const message =
          requestError instanceof Error ? requestError.message : 'Unable to load library data.';
        setError(message);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isCancelled = true;
    };
  }, [token, user]);

  return (
    <LibraryContext.Provider
      value={{
        books,
        users,
        transactions,
        dashboard,
        isLoading,
        isMutating,
        searchQuery,
        error,
        reloadAll,
        loadBooks,
        createBook,
        updateBook,
        deleteBook,
        borrowBook,
        returnBook,
        createUser,
        updateUser,
        deleteUser,
        clearError,
      }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);

  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider.');
  }

  return context;
}
