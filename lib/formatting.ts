import { Role, TransactionStatus } from '@/types/library';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDate(value: string | null, fallback = 'Pending approval') {
  if (!value) {
    return fallback;
  }

  return dateFormatter.format(new Date(value));
}

export function formatRole(role: Role) {
  return role === 'LIBRARIAN' ? 'Librarian' : 'Student';
}

export function formatTransactionStatus(status: TransactionStatus) {
  if (status === 'PENDING') {
    return 'Waiting for approval';
  }

  if (status === 'BORROWED') {
    return 'Borrowed';
  }

  if (status === 'PENDING_RETURN') {
    return 'Return requested';
  }

  if (status === 'OVERDUE') {
    return 'Overdue';
  }

  return 'Returned';
}
