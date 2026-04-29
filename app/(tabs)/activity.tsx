import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { EmptyState } from '@/components/empty-state';
import { PillBadge } from '@/components/pill-badge';
import { ScreenShell } from '@/components/screen-shell';
import { StatCard } from '@/components/stat-card';
import { palette, spacing, typography } from '@/constants/library-theme';
import { useAuth } from '@/contexts/auth-context';
import { useLibrary } from '@/contexts/library-context';
import { formatCurrency, formatDate, formatTransactionStatus } from '@/lib/formatting';
import { Transaction } from '@/types/library';

function TransactionCard({
  transaction,
  canReturn,
  onReturn,
  busy,
  showUser,
}: {
  transaction: Transaction;
  canReturn: boolean;
  onReturn: (transaction: Transaction) => void;
  busy: boolean;
  showUser: boolean;
}) {
  return (
    <AppCard>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionCopy}>
          <Text style={styles.transactionTitle}>{transaction.book.title}</Text>
          <Text style={styles.transactionSubtitle}>{transaction.book.author}</Text>
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

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Borrowed</Text>
        <Text style={styles.detailValue}>{formatDate(transaction.borrowDate)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Due Date</Text>
        <Text style={styles.detailValue}>{formatDate(transaction.dueDate)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Return Date</Text>
        <Text style={styles.detailValue}>
          {transaction.returnDate ? formatDate(transaction.returnDate) : 'Not returned yet'}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Late Fee</Text>
        <Text style={styles.detailValue}>{formatCurrency(transaction.lateFee)}</Text>
      </View>

      {showUser ? (
        <View style={styles.memberRow}>
          <Text style={styles.memberTitle}>{transaction.user.fullName}</Text>
          <Text style={styles.memberMeta}>{transaction.user.email}</Text>
        </View>
      ) : null}

      {canReturn ? (
        <AppButton
          label="Process Return"
          compact
          loading={busy}
          onPress={() => onReturn(transaction)}
        />
      ) : null}
    </AppCard>
  );
}

export default function ActivityScreen() {
  const { user } = useAuth();
  const { transactions, error, isLoading, isMutating, returnBook, reloadAll } = useLibrary();

  if (!user) {
    return null;
  }

  const activeCount = transactions.filter((transaction) => transaction.status !== 'RETURNED').length;
  const overdueCount = transactions.filter((transaction) => transaction.status === 'OVERDUE').length;
  const returnedCount = transactions.filter((transaction) => transaction.status === 'RETURNED').length;
  const outstandingFees = transactions.reduce((sum, transaction) => sum + transaction.lateFee, 0);

  function confirmReturn(transaction: Transaction) {
    Alert.alert('Return book', `Mark "${transaction.book.title}" as returned?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Return',
        onPress: () => {
          void (async () => {
            try {
              await returnBook(transaction.id);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to process return.';
              Alert.alert('Return failed', message);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title={user.role === 'LIBRARIAN' ? 'Circulation Desk' : 'Borrowing History'}
      subtitle={
        user.role === 'LIBRARIAN'
          ? 'Monitor current loans, process returns, and keep overdue items moving.'
          : 'Review your borrowing history, due dates, returns, and any late fees.'
      }
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => {
            void reloadAll();
          }}
          tintColor={palette.primary}
        />
      }>
      <View style={styles.statsGrid}>
        <StatCard label="Active" value={`${activeCount}`} accent="accent" />
        <StatCard label="Overdue" value={`${overdueCount}`} accent="warning" />
        <StatCard label="Returned" value={`${returnedCount}`} accent="success" />
        <StatCard label="Fees" value={formatCurrency(outstandingFees)} accent="primary" />
      </View>

      {error ? (
        <AppCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>Activity issue</Text>
          <Text style={styles.errorCopy}>{error}</Text>
        </AppCard>
      ) : null}

      {transactions.length ? (
        transactions.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            canReturn={transaction.status !== 'RETURNED'}
            onReturn={confirmReturn}
            busy={isMutating}
            showUser={user.role === 'LIBRARIAN'}
          />
        ))
      ) : (
        <EmptyState
          title="No transactions yet"
          message="Borrowing activity will appear here after books are checked out or returned."
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  transactionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  transactionTitle: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 24,
  },
  transactionSubtitle: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  detailValue: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 14,
  },
  memberRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  memberTitle: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 15,
    fontWeight: '700',
  },
  memberMeta: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
});
