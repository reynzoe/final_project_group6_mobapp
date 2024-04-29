import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/contexts/auth-context';
import { Book } from '@/types/library';

// ─── Storage key scoped to a specific user ────────────────────────────────────
function storageKey(userId: string) {
  return `bookmarks_v1_${userId}`;
}

type BookmarksContextValue = {
  bookmarkedIds: Set<string>;
  bookmarkedBooks: Book[];
  isBookmarked: (bookId: string) => boolean;
  toggleBookmark: (book: Book) => 'added' | 'removed';
};

const BookmarksContext = createContext<BookmarksContextValue | undefined>(undefined);

export function BookmarksProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();

  // ── Per-user book list ───────────────────────────────────────────────────
  const [bookmarkedBooks, setBookmarkedBooks] = useState<Book[]>([]);
  const loadedForUser = useRef<string | null>(null);

  // ── Load from AsyncStorage whenever the logged-in user changes ───────────
  useEffect(() => {
    if (!user) {
      // Logged out — clear in-memory bookmarks
      setBookmarkedBooks([]);
      loadedForUser.current = null;
      return;
    }

    if (loadedForUser.current === user.id) {
      // Already loaded for this user — skip
      return;
    }

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey(user.id));
        const parsed: Book[] = raw ? (JSON.parse(raw) as Book[]) : [];
        setBookmarkedBooks(parsed);
        loadedForUser.current = user.id;
      } catch {
        setBookmarkedBooks([]);
        loadedForUser.current = user.id;
      }
    })();
  }, [user]);

  // ── Persist to AsyncStorage whenever the list changes ────────────────────
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Don't write back on the initial load — wait until loadedForUser matches
    if (loadedForUser.current !== user.id) return;

    // Also skip the very first render after switching users
    // (the state is still from the previous user until the load effect runs)
    if (prevUserIdRef.current !== user.id) {
      prevUserIdRef.current = user.id;
      return;
    }

    void AsyncStorage.setItem(storageKey(user.id), JSON.stringify(bookmarkedBooks));
  }, [bookmarkedBooks, user]);

  // ── Derived helpers ──────────────────────────────────────────────────────
  const bookmarkedIds = new Set(bookmarkedBooks.map((b) => b.id));

  const isBookmarked = useCallback(
    (bookId: string) => bookmarkedIds.has(bookId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookmarkedBooks]
  );

  const toggleBookmark = useCallback(
    (book: Book): 'added' | 'removed' => {
      let result: 'added' | 'removed' = 'added';

      setBookmarkedBooks((prev) => {
        if (prev.some((b) => b.id === book.id)) {
          result = 'removed';
          return prev.filter((b) => b.id !== book.id);
        }
        result = 'added';
        return [book, ...prev];
      });

      return result;
    },
    []
  );

  return (
    <BookmarksContext.Provider
      value={{ bookmarkedIds, bookmarkedBooks, isBookmarked, toggleBookmark }}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx) {
    throw new Error('useBookmarks must be used inside BookmarksProvider');
  }
  return ctx;
}
