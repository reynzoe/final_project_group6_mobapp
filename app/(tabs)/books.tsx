import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ToastNotification } from '@/components/toast-notification';
import { useBookmarks } from '@/contexts/bookmarks-context';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { AppInput } from '@/components/app-input';
import { BookCover } from '@/components/book-cover';
import { EmptyState } from '@/components/empty-state';
import { ModalSheet } from '@/components/modal-sheet';
import { PillBadge } from '@/components/pill-badge';
import { ScreenShell } from '@/components/screen-shell';
import { AppPalette, radii, spacing, typography } from '@/constants/library-theme';
import { useAuth } from '@/contexts/auth-context';
import { useLibrary } from '@/contexts/library-context';
import { useTheme } from '@/contexts/theme-context';
import { validateNumericField, validateQuantity, validateRequiredText } from '@/lib/validation';
import { Book, BookPayload } from '@/types/library';

const emptyBookForm = {
  title: '',
  author: '',
  category: '',
  cabinet: '',
  rack: '',
  row: '',
  quantity: '1',
};

const ALL_CATEGORIES = 'All';

export default function BooksScreen() {
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId?: string }>();
  const {
    books,
    transactions,
    searchQuery,
    error,
    isLoading,
    isMutating,
    loadBooks,
    createBook,
    updateBook,
    deleteBook,
    borrowBook,
    reloadAll,
  } = useLibrary();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [query, setQuery] = useState(searchQuery);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form, setForm] = useState(emptyBookForm);
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({});
  const [detailBook, setDetailBook] = useState<Book | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setToast({ message, visible: true });
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
  }

  function handleToggleBookmark(book: Book) {
    const result = toggleBookmark(book);
    showToast(
      result === 'added'
        ? `"${book.title}" added to bookmarks`
        : `"${book.title}" removed from bookmarks`
    );
  }

  const deferredQuery = useDeferredValue(query);
  const loadBooksRef = useRef(loadBooks);

  useEffect(() => {
    loadBooksRef.current = loadBooks;
  }, [loadBooks]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isActive = true;

    async function syncSearch() {
      try {
        await loadBooksRef.current(deferredQuery.trim());
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to search books.';
        Alert.alert('Search failed', message);
      }
    }

    void syncSearch();

    return () => {
      isActive = false;
    };
  }, [deferredQuery, user]);

  // Open the details modal when navigated with ?bookId=...
  useEffect(() => {
    if (!params.bookId) {
      return;
    }

    const matched = books.find((book) => book.id === params.bookId);
    if (matched) {
      setDetailBook(matched);
      // Clear the param so revisiting the tab doesn't re-open
      router.setParams({ bookId: undefined });
    }
  }, [params.bookId, books, router]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    books.forEach((book) => {
      if (book.category) {
        unique.add(book.category);
      }
    });
    return [ALL_CATEGORIES, ...Array.from(unique).sort()];
  }, [books]);

  const filteredBooks = useMemo(
    () =>
      activeCategory === ALL_CATEGORIES
        ? books
        : books.filter((book) => book.category === activeCategory),
    [books, activeCategory]
  );

  if (!user) {
    return null;
  }

  function resetForm() {
    setForm(emptyBookForm);
    setEditingBook(null);
    setFormErrors({});
  }

  function openCreateModal() {
    resetForm();
    setEditorVisible(true);
  }

  function openEditModal(book: Book) {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author,
      category: book.category,
      cabinet: book.cabinet,
      rack: book.rack,
      row: book.row,
      quantity: String(book.quantity),
    });
    setFormErrors({});
    setEditorVisible(true);
  }

  function validateBookForm() {
    const nextErrors = {
      title: validateRequiredText('Title', form.title),
      author: validateRequiredText('Author', form.author),
      category: validateRequiredText('Category', form.category),
      cabinet: validateNumericField('Cabinet', form.cabinet, 1, 2),
      rack: validateNumericField('Rack', form.rack, 1, 2),
      row: validateNumericField('Row', form.row, 1, 2),
      quantity: validateQuantity(form.quantity),
    };

    setFormErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  }

  async function handleSaveBook() {
    if (!validateBookForm()) {
      return;
    }

    const payload: BookPayload = {
      title: form.title.trim(),
      author: form.author.trim(),
      category: form.category.trim(),
      cabinet: form.cabinet.trim(),
      rack: form.rack.trim(),
      row: form.row.trim(),
      quantity: Number(form.quantity),
    };

    try {
      if (editingBook) {
        await updateBook(editingBook.id, payload);
      } else {
        await createBook(payload);
      }

      setEditorVisible(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save book.';
      Alert.alert('Save failed', message);
    }
  }

  function confirmDelete(book: Book) {
    Alert.alert('Delete book', `Remove "${book.title}" from the catalogue?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteBook(book.id);
              setDetailBook(null);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to delete book.';
              Alert.alert('Delete failed', message);
            }
          })();
        },
      },
    ]);
  }

  function confirmBorrow(book: Book) {
    Alert.alert('Borrow book', `Borrow "${book.title}" now?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Borrow',
        onPress: () => {
          void (async () => {
            try {
              await borrowBook(book.id);
              setDetailBook(null);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to borrow book.';
              Alert.alert('Borrow failed', message);
            }
          })();
        },
      },
    ]);
  }

  const pendingBookIds = new Set(
    transactions
      .filter(
        (transaction) =>
          transaction.userId === user.id &&
          (transaction.status === 'PENDING' || (!transaction.dueDate && !transaction.returnDate))
      )
      .map((transaction) => transaction.bookId)
  );
  const activeBorrowedBookIds = new Set(
    transactions
      .filter(
        (transaction) =>
          transaction.userId === user.id &&
          (transaction.status === 'BORROWED' ||
            transaction.status === 'OVERDUE' ||
            transaction.status === 'PENDING_RETURN')
      )
      .map((transaction) => transaction.bookId)
  );

  const isLibrarian = user.role === 'LIBRARIAN';

  // Re-evaluate detailBook from latest books list when it changes (after mutations)
  const liveDetailBook = detailBook
    ? books.find((book) => book.id === detailBook.id) ?? detailBook
    : null;

  const detailAlreadyBorrowed = liveDetailBook
    ? activeBorrowedBookIds.has(liveDetailBook.id)
    : false;
  const detailAwaitingApproval = liveDetailBook
    ? pendingBookIds.has(liveDetailBook.id)
    : false;
  const detailUnavailable = liveDetailBook ? liveDetailBook.availableQuantity === 0 : false;

  return (
    <>
      <ToastNotification
        message={toast.message}
        visible={toast.visible}
        icon={toast.message.includes('removed') ? 'heart-dislike' : 'heart'}
      />
      <ScreenShell
        title="Catalogue"
        subtitle={
          isLibrarian
            ? 'Search the collection, add new titles, and keep inventory accurate.'
            : 'Search by title, author, or category — tap a book to see details.'
        }
        action={
          isLibrarian ? (
            <AppButton label="Add Book" variant="secondary" compact onPress={openCreateModal} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void reloadAll(query);
            }}
            tintColor={palette.primary}
          />
        }>
        <AppCard>
          <AppInput
            label="Search Books"
            value={query}
            onChangeText={setQuery}
            placeholder="Search title, author, or category"
          />

          <View style={styles.filterHeader}>
            <Text style={styles.filterLabel}>Filter by category</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}>
            {categories.map((category) => {
              const active = activeCategory === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => setActiveCategory(active ? ALL_CATEGORIES : category)}
                  style={[styles.chip, active ? styles.chipActive : undefined]}>
                  <Text
                    style={[styles.chipLabel, active ? styles.chipLabelActive : undefined]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.caption}>
            {filteredBooks.length} result{filteredBooks.length === 1 ? '' : 's'}
            {activeCategory !== ALL_CATEGORIES ? ` in ${activeCategory}` : ''}
            {query.trim() ? ` for "${query.trim()}"` : ''}.
          </Text>
        </AppCard>

        {error ? (
          <AppCard style={styles.errorCard}>
            <Text style={styles.errorTitle}>Catalogue issue</Text>
            <Text style={styles.errorCopy}>{error}</Text>
          </AppCard>
        ) : null}

        {filteredBooks.length ? (
          filteredBooks.map((book) => {
            const alreadyBorrowed = activeBorrowedBookIds.has(book.id);
            const awaitingApproval = pendingBookIds.has(book.id);
            const unavailable = book.availableQuantity === 0;
            const bookmarked = isBookmarked(book.id);

            return (
              <Pressable
                key={book.id}
                onPress={() => setDetailBook(book)}
                style={({ pressed }) => [pressed ? styles.cardPressed : undefined]}>
                <AppCard>
                  <View style={styles.bookRow}>
                    <View style={styles.coverWrapper}>
                      <BookCover
                        title={book.title}
                        author={book.author}
                        category={book.category}
                        size="md"
                      />
                    </View>
                    <View style={styles.bookContent}>
                      <View style={styles.bookHeader}>
                        <View style={styles.bookCopy}>
                          <Text style={styles.bookTitle} numberOfLines={2}>
                            {book.title}
                          </Text>
                          <Text style={styles.bookMeta} numberOfLines={1}>
                            {book.author}
                          </Text>
                        </View>
                        <Pressable
                          hitSlop={10}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleBookmark(book);
                          }}
                          style={styles.heartButton}>
                          <Ionicons
                            name={bookmarked ? 'heart' : 'heart-outline'}
                            size={22}
                            color={bookmarked ? '#E05C5C' : palette.textMuted}
                          />
                        </Pressable>
                      </View>

                      <View style={styles.metaRow}>
                        <PillBadge label={book.category} tone="primary" />
                        <PillBadge
                          label={
                            book.availableQuantity > 0
                              ? `${book.availableQuantity} available`
                              : 'Checked out'
                          }
                          tone={book.availableQuantity > 0 ? 'success' : 'danger'}
                        />
                      </View>

                      <View style={styles.tapHint}>
                        <Ionicons name="information-circle-outline" size={14} color={palette.textMuted} />
                        <Text style={styles.tapHintLabel}>
                          {isLibrarian
                            ? 'Tap for details and admin actions'
                            : awaitingApproval
                              ? 'Waiting for approval'
                              : alreadyBorrowed
                                ? 'Already on your shelf'
                                : unavailable
                                  ? 'Currently unavailable'
                                  : 'Tap to view & borrow'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </AppCard>
              </Pressable>
            );
          })
        ) : (
          <EmptyState
            title="No books matched your search"
            message="Try a different keyword or change the category filter."
          />
        )}
      </ScreenShell>

      {/* BOOK DETAILS POPUP */}
      <ModalSheet
        visible={!!liveDetailBook}
        title="Book Details"
        subtitle={liveDetailBook ? liveDetailBook.author : undefined}
        onClose={() => setDetailBook(null)}
        footer={
          liveDetailBook ? (
            <View style={styles.detailFooter}>
              {isLibrarian ? (
                <>
                  <AppButton
                    label="Edit"
                    variant="secondary"
                    style={styles.flexButton}
                    onPress={() => {
                      setDetailBook(null);
                      openEditModal(liveDetailBook);
                    }}
                  />
                  <AppButton
                    label="Delete"
                    variant="danger"
                    style={styles.flexButton}
                    onPress={() => confirmDelete(liveDetailBook)}
                  />
                </>
              ) : (
                <AppButton
                  label={
                    detailAwaitingApproval
                      ? 'Waiting for approval'
                      : detailAlreadyBorrowed
                        ? 'Already on your shelf'
                        : detailUnavailable
                          ? 'Unavailable'
                          : 'Borrow this book'
                  }
                  loading={isMutating}
                  disabled={
                    detailAwaitingApproval ||
                    detailAlreadyBorrowed ||
                    detailUnavailable ||
                    isMutating
                  }
                  onPress={() => confirmBorrow(liveDetailBook)}
                />
              )}
            </View>
          ) : null
        }>
        {liveDetailBook ? (
          <>
            <View style={styles.detailHero}>
              <BookCover
                title={liveDetailBook.title}
                author={liveDetailBook.author}
                category={liveDetailBook.category}
                size="lg"
              />
              <View style={styles.detailHeroCopy}>
                <View style={styles.detailTitleRow}>
                  <Text style={[styles.detailTitle, { flex: 1 }]}>{liveDetailBook.title}</Text>
                  <Pressable
                    hitSlop={10}
                    onPress={() => handleToggleBookmark(liveDetailBook)}
                    style={styles.detailHeartButton}>
                    <Ionicons
                      name={isBookmarked(liveDetailBook.id) ? 'heart' : 'heart-outline'}
                      size={26}
                      color={isBookmarked(liveDetailBook.id) ? '#E05C5C' : palette.textMuted}
                    />
                  </Pressable>
                </View>
                <Text style={styles.detailAuthor}>by {liveDetailBook.author}</Text>
                <View style={styles.detailBadges}>
                  <PillBadge label={liveDetailBook.category} tone="primary" />
                  <PillBadge
                    label={
                      liveDetailBook.availableQuantity > 0
                        ? `${liveDetailBook.availableQuantity} available`
                        : 'Checked out'
                    }
                    tone={liveDetailBook.availableQuantity > 0 ? 'success' : 'danger'}
                  />
                </View>
              </View>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Total copies</Text>
                <Text style={styles.detailValue}>{liveDetailBook.quantity}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Active loans</Text>
                <Text style={styles.detailValue}>{liveDetailBook.activeLoanCount}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Cabinet</Text>
                <Text style={styles.detailValue}>{liveDetailBook.cabinet}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Rack</Text>
                <Text style={styles.detailValue}>{liveDetailBook.rack}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Row</Text>
                <Text style={styles.detailValue}>{liveDetailBook.row}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Overdue</Text>
                <Text style={styles.detailValue}>{liveDetailBook.overdueLoanCount}</Text>
              </View>
            </View>
          </>
        ) : null}
      </ModalSheet>

      {/* CREATE / EDIT BOOK FORM */}
      <ModalSheet
        visible={editorVisible}
        title={editingBook ? 'Edit Book' : 'Add Book'}
        subtitle="Inventory changes are validated by the backend before they are saved."
        onClose={() => {
          setEditorVisible(false);
          resetForm();
        }}
        footer={
          <View style={styles.detailFooter}>
            <AppButton
              label="Cancel"
              variant="ghost"
              style={styles.flexButton}
              onPress={() => {
                setEditorVisible(false);
                resetForm();
              }}
            />
            <AppButton
              label={editingBook ? 'Save Changes' : 'Create Book'}
              style={styles.flexButton}
              loading={isMutating}
              onPress={handleSaveBook}
            />
          </View>
        }>
        <AppInput
          label="Title"
          value={form.title}
          onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
          placeholder="Enter book title"
          error={formErrors.title}
        />
        <AppInput
          label="Author"
          value={form.author}
          onChangeText={(value) => setForm((current) => ({ ...current, author: value }))}
          placeholder="Enter author name"
          error={formErrors.author}
        />
        <AppInput
          label="Category"
          value={form.category}
          onChangeText={(value) => setForm((current) => ({ ...current, category: value }))}
          placeholder="Fiction, History, Technology..."
          error={formErrors.category}
        />
        <AppInput
          label="Cabinet"
          value={form.cabinet}
          onChangeText={(value) => setForm((current) => ({ ...current, cabinet: value }))}
          placeholder="Cabinet number"
          error={formErrors.cabinet}
        />
        <AppInput
          label="Rack"
          value={form.rack}
          onChangeText={(value) => setForm((current) => ({ ...current, rack: value }))}
          placeholder="Rack number"
          error={formErrors.rack}
        />
        <AppInput
          label="Row"
          value={form.row}
          onChangeText={(value) => setForm((current) => ({ ...current, row: value }))}
          placeholder="Row number"
          error={formErrors.row}
        />
        <AppInput
          label="Quantity"
          value={form.quantity}
          onChangeText={(value) => setForm((current) => ({ ...current, quantity: value }))}
          keyboardType="number-pad"
          placeholder="0"
          error={formErrors.quantity}
        />
      </ModalSheet>
    </>
  );
}

function createStyles(palette: AppPalette) { return StyleSheet.create({
  caption: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  filterLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  chipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipLabel: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  chipLabelActive: {
    color: palette.white,
  },
  errorCard: {
    backgroundColor: palette.dangerSoft,
  },
  errorTitle: {
    color: palette.danger,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  errorCopy: {
    color: palette.danger,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  cardPressed: {
    opacity: 0.85,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  bookRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  coverWrapper: {
    paddingTop: 2,
  },
  bookContent: {
    flex: 1,
    gap: spacing.sm,
  },
  bookCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  bookTitle: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 20,
    lineHeight: 25,
  },
  bookMeta: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inventoryText: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  tapHintLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '600',
  },
  heartButton: {
    padding: 4,
  },
  detailHero: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  detailHeroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailHeartButton: {
    paddingTop: 2,
  },
  detailTitle: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 24,
    lineHeight: 28,
  },
  detailAuthor: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  detailBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  detailItem: {
    flexBasis: '48%',
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  detailLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  detailFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
}); }
