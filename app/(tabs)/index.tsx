import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/app-card';
import { BookCover } from '@/components/book-cover';
import { EmptyState } from '@/components/empty-state';
import { PillBadge } from '@/components/pill-badge';
import { ScreenShell } from '@/components/screen-shell';
import { StatCard } from '@/components/stat-card';
import { palette, radii, spacing, typography } from '@/constants/library-theme';
import { useAuth } from '@/contexts/auth-context';
import { useLibrary } from '@/contexts/library-context';
import { formatDate, formatTransactionStatus } from '@/lib/formatting';
import { Transaction } from '@/types/library';

function TransactionPreview({ transaction }: { transaction: Transaction }) {
  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionCopy}>
        <Text style={styles.transactionTitle}>{transaction.book.title}</Text>
        <Text style={styles.transactionMeta}>
          {transaction.user.fullName} • Due {formatDate(transaction.dueDate)}
        </Text>
      </View>
      <PillBadge
        label={formatTransactionStatus(transaction.status)}
        tone={
          transaction.status === 'OVERDUE'
            ? 'danger'
            : transaction.status === 'BORROWED'
              ? 'warning'
              : 'success'
        }
      />
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { books, dashboard, error, isLoading, reloadAll } = useLibrary();
  const router = useRouter();

  const refreshControl = (
    <RefreshControl
      refreshing={isLoading}
      onRefresh={() => {
        void reloadAll();
      }}
      tintColor={palette.primary}
    />
  );

  if (!user) {
    return null;
  }

  function goToBooks(bookId?: string) {
    router.push(bookId ? `/(tabs)/books?bookId=${bookId}` : '/(tabs)/books');
  }

  const statCards =
    user.role === 'LIBRARIAN'
      ? [
          {
            label: 'Titles',
            value: `${dashboard?.summary.totalTitles ?? 0}`,
            accent: 'primary' as const,
            caption: `${dashboard?.summary.totalCopies ?? 0} physical copies in catalog`,
          },
          {
            label: 'Active Loans',
            value: `${dashboard?.summary.activeLoans ?? 0}`,
            accent: 'accent' as const,
            caption: `${dashboard?.summary.availableCopies ?? 0} copies currently available`,
          },
          {
            label: 'Overdue',
            value: `${dashboard?.summary.overdueLoans ?? 0}`,
            accent: 'warning' as const,
            caption: `${dashboard?.summary.totalUsers ?? 0} registered accounts`,
          },
          {
            label: 'Returned',
            value: `${dashboard?.summary.returnedTransactions ?? 0}`,
            accent: 'success' as const,
            caption: 'Completed returns to date',
          },
        ]
      : [
          {
            label: 'Borrowed',
            value: `${dashboard?.summary.activeLoans ?? 0}`,
            accent: 'accent' as const,
            caption: 'Books currently on your account',
          },
          {
            label: 'Overdue',
            value: `${dashboard?.summary.overdueLoans ?? 0}`,
            accent: 'warning' as const,
            caption: 'Items that need attention today',
          },
          {
            label: 'History',
            value: `${dashboard?.summary.returnedTransactions ?? 0}`,
            accent: 'primary' as const,
            caption: 'Successfully completed returns',
          },
          {
            label: 'Available',
            value: `${dashboard?.summary.availableCopies ?? 0}`,
            accent: 'success' as const,
            caption: 'Books ready to borrow today',
          },
        ];

  return (
    <ScreenShell
      title={user.role === 'LIBRARIAN' ? 'Operations Dashboard' : 'Reading Dashboard'}
      subtitle={
        user.role === 'LIBRARIAN'
          ? 'Track circulation, overdue items, and member activity at a glance.'
          : 'Monitor your current loans and recent borrowing activity.'
      }
      refreshControl={refreshControl}>
      {error ? (
        <AppCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>Sync issue</Text>
          <Text style={styles.errorCopy}>{error}</Text>
        </AppCard>
      ) : null}

      <View style={styles.welcomeBlock}>
        <Text style={styles.greeting}>Hello, {user.fullName.split(' ')[0]} 👋</Text>
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickValue}>{dashboard?.summary.activeLoans ?? 0}</Text>
            <Text style={styles.quickLabel}>Borrowed</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickValue}>{dashboard?.summary.overdueLoans ?? 0}</Text>
            <Text style={styles.quickLabel}>Overdue</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickValue}>{dashboard?.summary.availableCopies ?? 0}</Text>
            <Text style={styles.quickLabel}>Ready</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickValue}>{dashboard?.summary.returnedTransactions ?? 0}</Text>
            <Text style={styles.quickLabel}>Returned</Text>
          </View>
        </View>
      </View>

      <View style={styles.shelfSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.shelfTitle}>New at the library</Text>
          <Pressable style={styles.seeAll} onPress={() => goToBooks()}>
            <Text style={styles.seeAllLabel}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={palette.primary} />
          </Pressable>
        </View>
        {books.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.coverRail}>
            {books.slice(0, 12).map((book) => (
              <Pressable
                key={book.id}
                onPress={() => goToBooks(book.id)}
                style={({ pressed }) => [
                  styles.coverItem,
                  pressed ? styles.coverItemPressed : undefined,
                ]}>
                <BookCover
                  title={book.title}
                  author={book.author}
                  category={book.category}
                  size="lg"
                />
                <Text style={styles.coverTitle} numberOfLines={2}>
                  {book.title}
                </Text>
                <Text style={styles.coverMeta} numberOfLines={1}>
                  {book.availableQuantity > 0
                    ? `${book.availableQuantity} available`
                    : 'Checked out'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            title="No books loaded yet"
            message="Imported titles will appear here as cover tiles."
          />
        )}
      </View>

      <View style={styles.grid}>
        {statCards.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            accent={item.accent}
            caption={item.caption}
          />
        ))}
      </View>

      {dashboard?.overdueTransactions.length ? (
        <AppCard style={styles.alertCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Action Needed</Text>
            <PillBadge label={`${dashboard.overdueTransactions.length} overdue`} tone="danger" />
          </View>
          {dashboard.overdueTransactions.slice(0, 4).map((transaction) => (
            <TransactionPreview key={transaction.id} transaction={transaction} />
          ))}
        </AppCard>
      ) : (
        <EmptyState
          title="Everything is on track"
          message="There are no overdue items right now. Fresh transactions will show up here automatically."
        />
      )}

      <AppCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <PillBadge label={`${dashboard?.recentTransactions.length ?? 0} records`} tone="primary" />
        </View>
        {dashboard?.recentTransactions.length ? (
          dashboard.recentTransactions.map((transaction) => (
            <TransactionPreview key={transaction.id} transaction={transaction} />
          ))
        ) : (
          <EmptyState
            title="No transactions yet"
            message="Borrowing and return activity will appear here once the library starts circulating books."
          />
        )}
      </AppCard>

      <View style={styles.doubleColumn}>
        <AppCard style={styles.splitCard}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {dashboard?.categories.length ? (
            dashboard.categories.map((category) => (
              <View key={category.category} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{category.category}</Text>
                <Text style={styles.metricValue}>{category.count}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.metricHint}>Category insights will appear once books are loaded.</Text>
          )}
        </AppCard>

        <AppCard style={styles.splitCard}>
          <Text style={styles.sectionTitle}>Popular Books</Text>
          {dashboard?.popularBooks.length ? (
            dashboard.popularBooks.map((book) => (
              <Pressable
                key={book.bookId}
                onPress={() => goToBooks(book.bookId)}
                style={({ pressed }) => [
                  styles.metricRow,
                  pressed ? styles.metricRowPressed : undefined,
                ]}>
                <Text style={styles.metricLabel}>{book.title}</Text>
                <Text style={styles.metricValue}>{book.borrowCount}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.metricHint}>Borrow trends will appear here as circulation grows.</Text>
          )}
        </AppCard>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  welcomeBlock: {
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  greeting: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 24,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quickStat: {
    flex: 1,
    gap: 2,
    paddingVertical: spacing.xs,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
  },
  quickValue: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  quickLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  shelfSection: {
    gap: spacing.md,
  },
  shelfTitle: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 26,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllLabel: {
    color: palette.primary,
    fontFamily: typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  coverRail: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  coverItem: {
    width: 118,
    gap: spacing.sm,
    borderRadius: radii.md,
  },
  coverItemPressed: {
    opacity: 0.7,
  },
  coverTitle: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  coverMeta: {
    color: palette.accent,
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '800',
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
  alertCard: {
    backgroundColor: '#FFF7F3',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  transactionRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  transactionCopy: {
    gap: spacing.xs,
  },
  transactionTitle: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 16,
    fontWeight: '700',
  },
  transactionMeta: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
  doubleColumn: {
    gap: spacing.md,
  },
  splitCard: {
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 4,
  },
  metricRowPressed: {
    opacity: 0.6,
  },
  metricLabel: {
    flex: 1,
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  metricValue: {
    color: palette.primary,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  metricHint: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
