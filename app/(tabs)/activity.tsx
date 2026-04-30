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

function isPendingTransaction(transaction: Transaction) {
  return transaction.status === 'PENDING' || (!transaction.dueDate && !transaction.returnDate);
}

function getDisplayStatus(transaction: Transaction) {
  return isPendingTransaction(transaction) ? 'PENDING' : transaction.status;
}

function TransactionCard({
  transaction,
  canReturn,
  onReturn,
  onApprove,
  busy,
  showUser,
  isAdmin,
  onApproveReturn,
  canApprove,
}: {
  transaction: Transaction;
  canReturn: boolean;
  onReturn: (transaction: Transaction) => void;
  onApprove: (transaction: Transaction) => void;
  busy: boolean;
  showUser: boolean;
  isAdmin: boolean;
  onApproveReturn: (transaction: Transaction) => void;
  canApprove: boolean;
}) {
  const isPendingReturn = transaction.status === 'PENDING_RETURN';
  const returnLabel = isPendingReturn && isAdmin ? 'Process Return' : 'Request Return';
  const returnHandler = isPendingReturn && isAdmin ? onApproveReturn : onReturn;

  return (
    <AppCard>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionCopy}>
          <Text style={styles.transactionTitle}>{transaction.book.title}</Text>
          <Text style={styles.transactionSubtitle}>{transaction.book.author}</Text>
        </View>
        <PillBadge
          label={formatTransactionStatus(getDisplayStatus(transaction))}
          tone={
            getDisplayStatus(transaction) === 'OVERDUE'
              ? 'danger'
              : getDisplayStatus(transaction) === 'BORROWED'
                ? 'warning'
                : getDisplayStatus(transaction) === 'PENDING_RETURN'
                  ? 'info'
                : getDisplayStatus(transaction) === 'PENDING'
                  ? 'primary'
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

      {canApprove ? (
        <AppButton
          label="Approve Borrow"
          compact
          loading={busy}
          onPress={() => onApprove(transaction)}
        />
      ) : null}
      {canReturn ? (
        <AppButton
          label={returnLabel}
          compact
          loading={busy}
          onPress={() => returnHandler(transaction)}
        />
      ) : null}
    </AppCard>
  );
}

export default function ActivityScreen() {
  const { user } = useAuth();
  const { transactions, error, isLoading, isMutating, requestBookReturn, approveBookReturn, approveBorrow, reloadAll } =
    useLibrary();

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'LIBRARIAN';
  const activeCount = transactions.filter(
    (transaction) =>
      transaction.status === 'BORROWED' ||
      transaction.status === 'OVERDUE' ||
      transaction.status === 'PENDING_RETURN'
  ).length;
  const overdueCount = transactions.filter((transaction) => transaction.status === 'OVERDUE').length;
  const returnedCount = transactions.filter((transaction) => transaction.status === 'RETURNED').length;
  const outstandingFees = transactions.reduce((sum, transaction) => sum + transaction.lateFee, 0);
  const pendingTransactions = transactions.filter(isPendingTransaction);
  const visibleTransactions =
    user.role === 'LIBRARIAN'
      ? transactions.filter((transaction) => !isPendingTransaction(transaction))
      : transactions;

  function confirmReturn(transaction: Transaction) {
    Alert.alert('Return book', `Request to return "${transaction.book.title}"? This requires librarian approval.`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Request Return',
        onPress: () => {
          void (async () => {
            try {
              await requestBookReturn(transaction.id);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to request return.';
              Alert.alert('Return request failed', message);
            }
          })();
        },
      },
    ]);
  }

  function confirmApproveReturn(transaction: Transaction) {
    Alert.alert('Process return', `Mark "${transaction.book.title}" as returned?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Process Return',
        onPress: () => {
          void (async () => {
            try {
              await approveBookReturn(transaction.id);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to process return.';
              Alert.alert('Return approval failed', message);
            }
          })();
        },
      },
    ]);
  }

  function confirmApprove(transaction: Transaction) {
    Alert.alert('Approve borrow', `Approve "${transaction.book.title}" for ${transaction.user.fullName}?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Approve',
        onPress: () => {
          void (async () => {
            try {
              await approveBorrow(transaction.id);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to approve borrow request.';
              Alert.alert('Approval failed', message);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenShell
      title={isAdmin ? 'Circulation Desk' : 'Borrowing History'}
      subtitle={
        isAdmin
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

      {isAdmin && pendingTransactions.length ? (
        <AppCard style={styles.pendingCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            <PillBadge label={`${pendingTransactions.length} waiting`} tone="warning" />
          </View>
          {pendingTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              canReturn={false}
              onReturn={confirmReturn}
              onApprove={confirmApprove}
              onApproveReturn={confirmApproveReturn}
              busy={isMutating}
              showUser
              isAdmin={isAdmin}
              canApprove
            />
          ))}
        </AppCard>
      ) : null}

      {visibleTransactions.length ? (
        visibleTransactions.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            canReturn={
              transaction.status === 'PENDING_RETURN'
                ? isAdmin
                : transaction.status !== 'RETURNED' && !isPendingTransaction(transaction)
            }
            onReturn={confirmReturn}
            onApprove={confirmApprove}
            onApproveReturn={confirmApproveReturn}
            busy={isMutating}
            showUser={isAdmin}
            isAdmin={isAdmin}
            canApprove={isAdmin && isPendingTransaction(transaction)}
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
  pendingCard: {
    gap: spacing.md,
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
