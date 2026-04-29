import {
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDeferredValue, useEffect, useRef, useState } from 'react';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { AppInput } from '@/components/app-input';
import { BookCover } from '@/components/book-cover';
import { EmptyState } from '@/components/empty-state';
import { ModalSheet } from '@/components/modal-sheet';
import { PillBadge } from '@/components/pill-badge';
import { ScreenShell } from '@/components/screen-shell';
import { palette, spacing, typography } from '@/constants/library-theme';
import { useAuth } from '@/contexts/auth-context';
import { useLibrary } from '@/contexts/library-context';
import { Book, BookPayload } from '@/types/library';
import { validateQuantity, validateRequiredText } from '@/lib/validation';

const emptyBookForm = {
  title: '',
  author: '',
  category: '',
  cabinet: '',
  rack: '',
  row: '',
  quantity: '1',
};

export default function BooksScreen() {
  const { user } = useAuth();
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
  const [query, setQuery] = useState(searchQuery);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form, setForm] = useState(emptyBookForm);
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({});

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
    setModalVisible(true);
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
    setModalVisible(true);
  }

  function validateBookForm() {
    const nextErrors = {
      title: validateRequiredText('Title', form.title),
      author: validateRequiredText('Author', form.author),
      category: validateRequiredText('Category', form.category),
      cabinet: validateRequiredText('Cabinet', form.cabinet),
      rack: validateRequiredText('Rack', form.rack),
      row: validateRequiredText('Row', form.row),
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

      setModalVisible(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save book.';
      Alert.alert('Save failed', message);
    }
  }

  function confirmDelete(book: Book) {
    Alert.alert('Delete book', `Remove "${book.title}" from the catalogue?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteBook(book.id);
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
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Borrow',
        onPress: () => {
          void (async () => {
            try {
              await borrowBook(book.id);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to borrow book.';
              Alert.alert('Borrow failed', message);
            }
          })();
        },
      },
    ]);
  }

  const borrowedBookIds = new Set(
    transactions
      .filter((transaction) => transaction.userId === user.id && transaction.status !== 'RETURNED')
      .map((transaction) => transaction.bookId)
  );

  return (
    <>
      <ScreenShell
        title="Catalogue"
        subtitle={
          user.role === 'LIBRARIAN'
            ? 'Search the collection, add new titles, and keep inventory quantities accurate.'
            : 'Search by title, author, or category and borrow books with live availability checks.'
        }
        action={
          user.role === 'LIBRARIAN' ? (
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
          <Text style={styles.caption}>
            {books.length} result{books.length === 1 ? '' : 's'} {query.trim() ? `for "${query.trim()}"` : 'in the catalogue'}.
          </Text>
        </AppCard>

        {error ? (
          <AppCard style={styles.errorCard}>
            <Text style={styles.errorTitle}>Catalogue issue</Text>
            <Text style={styles.errorCopy}>{error}</Text>
          </AppCard>
        ) : null}

        {books.length ? (
          books.map((book) => {
            const alreadyBorrowed = borrowedBookIds.has(book.id);
            const unavailable = book.availableQuantity === 0;

            return (
              <AppCard key={book.id}>
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
                        <Text style={styles.bookTitle}>{book.title}</Text>
                        <Text style={styles.bookMeta}>{book.author}</Text>
                      </View>
                      <PillBadge
                        label={book.availableQuantity > 0 ? `${book.availableQuantity} available` : 'Checked out'}
                        tone={book.availableQuantity > 0 ? 'success' : 'danger'}
                      />
                    </View>

                    <View style={styles.metaRow}>
                      <PillBadge label={book.category} tone="primary" />
                      <Text style={styles.inventoryText}>
                        {book.quantity} total • {book.activeLoanCount} active loan
                        {book.activeLoanCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text style={styles.locationText}>
                      Location: Cabinet {book.cabinet} • Rack {book.rack} • Row {book.row}
                    </Text>

                    {user.role === 'LIBRARIAN' ? (
                      <View style={styles.actionsRow}>
                        <AppButton
                          label="Edit"
                          variant="secondary"
                          compact
                          style={styles.actionButton}
                          onPress={() => openEditModal(book)}
                        />
                        <AppButton
                          label="Delete"
                          variant="danger"
                          compact
                          style={styles.actionButton}
                          onPress={() => confirmDelete(book)}
                        />
                      </View>
                    ) : (
                      <AppButton
                        label={
                          alreadyBorrowed
                            ? 'Already Borrowed'
                            : unavailable
                              ? 'Unavailable'
                              : 'Borrow Book'
                        }
                        disabled={alreadyBorrowed || unavailable || isMutating}
                        onPress={() => confirmBorrow(book)}
                      />
                    )}
                  </View>
                </View>
              </AppCard>
            );
          })
        ) : (
          <EmptyState
            title="No books matched your search"
            message="Try a different title, author, or category, or add a new book if you're managing the collection."
          />
        )}
      </ScreenShell>

      <ModalSheet
        visible={modalVisible}
        title={editingBook ? 'Edit Book' : 'Add Book'}
        subtitle="Inventory changes are validated by the backend before they are saved."
        onClose={() => {
          setModalVisible(false);
          resetForm();
        }}
        footer={
          <View style={styles.footerActions}>
            <AppButton
              label="Cancel"
              variant="ghost"
              style={styles.actionButton}
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            />
            <AppButton
              label={editingBook ? 'Save Changes' : 'Create Book'}
              style={styles.actionButton}
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

const styles = StyleSheet.create({
  caption: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
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
    fontSize: 22,
    lineHeight: 26,
  },
  bookMeta: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 19,
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
  locationText: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});