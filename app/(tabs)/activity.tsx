import { Ionicons } from '@expo/vector-icons';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { EmptyState } from '@/components/empty-state';
import { PillBadge } from '@/components/pill-badge';
import { ScreenShell } from '@/components/screen-shell';
import { palette, radii, spacing, typography } from '@/constants/library-theme';
import { useAuth } from '@/contexts/auth-context';
import { useLibrary } from '@/contexts/library-context';
import { formatDate, formatTransactionStatus } from '@/lib/formatting';
import { Transaction } from '@/types/library';

function isPendingBorrow(transaction: Transaction) {
  return transaction.status === 'PENDING' || (!transaction.dueDate && !transaction.returnDate);
}

// ─── Compact row used inside section cards ────────────────────────────────────
function TransactionRow({
  transaction,
  showUser,
  isAdmin,
  busy,
  onApprove,
  onApproveReturn,
  onReturn,
}: {
  transaction: Transaction;
  showUser: boolean;
  isAdmin: boolean;
  busy: boolean;
  onApprove?: (t: Transaction) => void;
  onApproveReturn?: (t: Transaction) => void;
  onReturn?: (t: Transaction) => void;
}) {
  const status = transaction.status;

  const badgeTone =
    status === 'OVERDUE'
      ? 'danger'
      : status === 'BORROWED'
        ? 'warning'
        : status === 'PENDING_RETURN'
          ? 'info'
          : status === 'PENDING'
            ? 'primary'
            : 'success';

  return (
    <View style={styles.txRow}>
      <View style={styles.txMain}>
        <View style={styles.txCopy}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {transaction.book.title}
          </Text>
          <Text style={styles.txAuthor} numberOfLines={1}>
            {transaction.book.author}
          </Text>
          {showUser ? (
            <Text style={styles.txMember} numberOfLines={1}>
              {transaction.user.fullName}
            </Text>
          ) : null}
        </View>
        <PillBadge label={formatTransactionStatus(status)} tone={badgeTone} />
      </View>

      <View style={styles.txDates}>
        <View style={styles.txDateItem}>
          <Text style={styles.txDateLabel}>Borrowed</Text>
          <Text style={styles.txDateValue}>{formatDate(transaction.borrowDate)}</Text>
        </View>
        {transaction.dueDate ? (
          <View style={styles.txDateItem}>
            <Text style={styles.txDateLabel}>Due</Text>
            <Text
              style={[
                styles.txDateValue,
                status === 'OVERDUE' ? styles.txDateOverdue : undefined,
              ]}>
              {formatDate(transaction.dueDate)}
            </Text>
          </View>
        ) : null}
        {transaction.returnDate ? (
          <View style={styles.txDateItem}>
            <Text style={styles.txDateLabel}>Returned</Text>
            <Text style={styles.txDateValue}>{formatDate(transaction.returnDate)}</Text>
          </View>
        ) : null}
      </View>

      {onApprove ? (
        <AppButton
          label="Approve Borrow"
          compact
          loading={busy}
          onPress={() => onApprove(transaction)}
        />
      ) : null}

      {onApproveReturn ? (
        <AppButton
          label="Process Return"
          compact
          loading={busy}
          onPress={() => onApproveReturn(transaction)}
        />
      ) : null}

      {onReturn ? (
        <AppButton
          label="Request Return"
          compact
          loading={busy}
          variant="secondary"
          onPress={() => onReturn(transaction)}
        />
      ) : null}
    </View>
  );
}

// ─── Collapsible section card ─────────────────────────────────────────────────
function SectionCard({
  icon,
  title,
  count,
  accent,
  emptyMessage,
  children,
}: {
  icon: string;
  title: string;
  count: number;
  accent: 'primary' | 'warning' | 'danger' | 'success' | 'info';
  emptyMessage: string;
  children?: React.ReactNode;
}) {
  const accentColor =
    accent === 'danger'
      ? palette.danger
      : accent === 'warning'
        ? palette.warning
        : accent === 'success'
          ? palette.success
          : accent === 'info'
            ? palette.accent
            : palette.primary;

  return (
    <AppCard style={styles.sectionCard}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIconWrap, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name={icon as never} size={18} color={accentColor} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={[styles.sectionBadge, { backgroundColor: accentColor + '20' }]}>
          <Text style={[styles.sectionBadgeText, { color: accentColor }]}>{count}</Text>
        </View>
      </View>

      {count === 0 ? (
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      ) : (
        <View style={styles.sectionItems}>{children}</View>
      )}
    </AppCard>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ActivityScreen() {
  const { user } = useAuth();
  const {
    transactions,
    error,
    isLoading,
    isMutating,
    requestBookReturn,
    approveBookReturn,
    approveBorrow,
    reloadAll,
  } = useLibrary();

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'LIBRARIAN';

  // ── Buckets ────────────────────────────────────────────────────────────────
  const pendingBorrows = transactions.filter(isPendingBorrow);

  const activeLoans = transactions.filter(
    (t) => t.status === 'BORROWED' || t.status === 'OVERDUE'
  );

  const pendingReturns = transactions.filter((t) => t.status === 'PENDING_RETURN');

  const returned = transactions.filter((t) => t.status === 'RETURNED');

  // For students, "active" = their borrowed + overdue + pending_return
  const studentActive = transactions.filter(
    (t) =>
      t.status === 'BORROWED' || t.status === 'OVERDUE' || t.status === 'PENDING_RETURN'
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  function confirmReturn(transaction: Transaction) {
    Alert.alert(
      'Request return',
      `Request to return "${transaction.book.title}"? A librarian will approve it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Return',
          onPress: () => {
            void (async () => {
              try {
                await requestBookReturn(transaction.id);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'Unable to request return.';
                Alert.alert('Return request failed', message);
              }
            })();
          },
        },
      ]
    );
  }

  function confirmApproveReturn(transaction: Transaction) {
    Alert.alert('Process return', `Mark "${transaction.book.title}" as returned?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Process Return',
        onPress: () => {
          void (async () => {
            try {
              await approveBookReturn(transaction.id);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Unable to process return.';
              Alert.alert('Process return failed', message);
            }
          })();
        },
      },
    ]);
  }

  function confirmApprove(transaction: Transaction) {
    Alert.alert(
      'Approve borrow',
      `Approve "${transaction.book.title}" for ${transaction.user.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            void (async () => {
              try {
                await approveBorrow(transaction.id);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'Unable to approve.';
                Alert.alert('Approval failed', message);
              }
            })();
          },
        },
      ]
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScreenShell
      title={isAdmin ? 'Circulation Desk' : 'My Loans'}
      subtitle={
        isAdmin
          ? 'Approve borrow requests, process returns, and monitor active loans.'
          : 'Track your active loans and request returns when you\'re done.'
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
      {error ? (
        <AppCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>Activity issue</Text>
          <Text style={styles.errorCopy}>{error}</Text>
        </AppCard>
      ) : null}

      {/* ── ADMIN VIEW ──────────────────────────────────────────────────────── */}
      {isAdmin ? (
        <>
          <SectionCard
            icon="time-outline"
            title="Pending Approvals"
            count={pendingBorrows.length}
            accent="warning"
            emptyMessage="No borrow requests waiting for approval.">
            {pendingBorrows.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                showUser
                isAdmin
                busy={isMutating}
                onApprove={confirmApprove}
              />
            ))}
          </SectionCard>

          <SectionCard
            icon="refresh-outline"
            title="Pending Returns"
            count={pendingReturns.length}
            accent="info"
            emptyMessage="No returns are waiting to be processed.">
            {pendingReturns.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                showUser
                isAdmin
                busy={isMutating}
                onApproveReturn={confirmApproveReturn}
              />
            ))}
          </SectionCard>

          <SectionCard
            icon="book-outline"
            title="Active Loans"
            count={activeLoans.length}
            accent="primary"
            emptyMessage="No books are currently out on loan.">
            {activeLoans.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                showUser
                isAdmin
                busy={isMutating}
              />
            ))}
          </SectionCard>

          <SectionCard
            icon="checkmark-circle-outline"
            title="Returned"
            count={returned.length}
            accent="success"
            emptyMessage="No completed returns yet.">
            {returned.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                showUser
                isAdmin
                busy={isMutating}
              />
            ))}
          </SectionCard>
        </>
      ) : (
        /* ── STUDENT VIEW ────────────────────────────────────────────────────── */
        <>
          {transactions.length === 0 ? (
            <EmptyState
              title="No borrowing activity yet"
              message="Head to the Catalogue tab to find a book and start borrowing."
            />
          ) : null}

          <SectionCard
            icon="book-outline"
            title="Active Loans"
            count={studentActive.length}
            accent="primary"
            emptyMessage="You don't have any active loans right now.">
            {studentActive.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                showUser={false}
                isAdmin={false}
                busy={isMutating}
                onReturn={
                  t.status === 'BORROWED' || t.status === 'OVERDUE'
                    ? confirmReturn
                    : undefined
                }
              />
            ))}
          </SectionCard>

          <SectionCard
            icon="checkmark-circle-outline"
            title="Returned"
            count={returned.length}
            accent="success"
            emptyMessage="Books you return will appear here.">
            {returned.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                showUser={false}
                isAdmin={false}
                busy={isMutating}
              />
            ))}
          </SectionCard>
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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

  // ── Section card ──────────────────────────────────────────────────────────
  sectionCard: {
    gap: spacing.md,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 20,
  },
  sectionBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  sectionBadgeText: {
    fontFamily: typography.body,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionItems: {
    gap: 0,
  },
  emptyText: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
  },

  // ── Transaction row ────────────────────────────────────────────────────────
  txRow: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  txMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  txCopy: {
    flex: 1,
    gap: 2,
  },
  txTitle: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 15,
    fontWeight: '700',
  },
  txAuthor: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  txMember: {
    color: palette.primary,
    fontFamily: typography.body,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  txDates: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  txDateItem: {
    gap: 2,
  },
  txDateLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txDateValue: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 13,
    fontWeight: '600',
  },
  txDateOverdue: {
    color: palette.danger,
  },
});
