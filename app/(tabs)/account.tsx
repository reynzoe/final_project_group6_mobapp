import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { AppInput } from '@/components/app-input';
import { BookCover } from '@/components/book-cover';
import { EmptyState } from '@/components/empty-state';
import { ModalSheet } from '@/components/modal-sheet';
import { PillBadge } from '@/components/pill-badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { AppPalette, radii, spacing, typography } from '@/constants/library-theme';
import { useAuth } from '@/contexts/auth-context';
import { useBookmarks } from '@/contexts/bookmarks-context';
import { useLibrary } from '@/contexts/library-context';
import { useTheme } from '@/contexts/theme-context';
import { formatRole } from '@/lib/formatting';
import { validateEmail, validatePassword, validateRequiredText } from '@/lib/validation';
import { Book, LibraryUser, Role } from '@/types/library';

const emptyUserForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'STUDENT' as Role,
};

function RolePicker({
  value,
  onChange,
}: {
  value: Role;
  onChange: (role: Role) => void;
}) {
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.roleRow}>
      {(['STUDENT', 'LIBRARIAN'] as Role[]).map((role) => {
        const active = value === role;
        return (
          <Pressable
            key={role}
            onPress={() => onChange(role)}
            style={[styles.rolePill, active ? styles.rolePillActive : undefined]}>
            <Text style={[styles.rolePillLabel, active ? styles.rolePillLabelActive : undefined]}>
              {formatRole(role)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Avatar with initials ─────────────────────────────────────────────────────
function Avatar({ name, size = 72 }: { name: string; size?: number }) {
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

// ─── Settings-style row ───────────────────────────────────────────────────────
function SettingsRow({
  icon,
  label,
  onPress,
  danger,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  badge?: number;
}) {
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const color = danger ? palette.danger : palette.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed ? styles.settingsRowPressed : undefined]}>
      <View style={[styles.settingsIconWrap, { backgroundColor: danger ? palette.dangerSoft : palette.surfaceMuted }]}>
        <Ionicons name={icon} size={18} color={danger ? palette.danger : palette.textMuted} />
      </View>
      <Text style={[styles.settingsLabel, { color }]}>{label}</Text>
      {badge !== undefined && badge > 0 ? (
        <View style={styles.settingsBadge}>
          <Text style={styles.settingsBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={danger ? palette.danger : palette.textMuted} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user, logout } = useAuth();
  const { users, transactions, dashboard, error, isLoading, isMutating, createUser, updateUser, deleteUser, borrowBook, reloadAll } =
    useLibrary();
  const { bookmarkedBooks, toggleBookmark } = useBookmarks();

  const [detailBook, setDetailBook] = useState<Book | null>(null);
  const [borrowingId, setBorrowingId] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LibraryUser | null>(null);
  const [bookmarksExpanded, setBookmarksExpanded] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [profileForm, setProfileForm] = useState(emptyUserForm);
  const [managedUserForm, setManagedUserForm] = useState(emptyUserForm);
  const [profileErrors, setProfileErrors] = useState<Record<string, string | null>>({});
  const [managedErrors, setManagedErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!user) return;
    setProfileForm({ fullName: user.fullName, email: user.email, password: '', role: user.role });
  }, [user]);

  if (!user) return null;

  function validateUserForm(input: typeof emptyUserForm, requirePassword: boolean) {
    return {
      fullName: validateRequiredText('Full name', input.fullName),
      email: validateEmail(input.email),
      password: validatePassword(input.password, !requirePassword),
    };
  }

  async function handleProfileSave() {
    if (!user) return;
    const nextErrors = validateUserForm(profileForm, false);
    setProfileErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      await updateUser(user.id, {
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        password: profileForm.password.trim() || undefined,
        role: user.role,
      });
      setProfileModalVisible(false);
      setProfileForm((c) => ({ ...c, password: '' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update profile.';
      Alert.alert('Profile update failed', message);
    }
  }

  function openCreateUserModal() {
    setSelectedUser(null);
    setManagedErrors({});
    setManagedUserForm(emptyUserForm);
    setUserModalVisible(true);
  }

  function openEditUserModal(libraryUser: LibraryUser) {
    setSelectedUser(libraryUser);
    setManagedErrors({});
    setManagedUserForm({ fullName: libraryUser.fullName, email: libraryUser.email, password: '', role: libraryUser.role });
    setUserModalVisible(true);
  }

  async function handleManagedUserSave() {
    const nextErrors = validateUserForm(managedUserForm, !selectedUser);
    setManagedErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      if (selectedUser) {
        await updateUser(selectedUser.id, {
          fullName: managedUserForm.fullName.trim(),
          email: managedUserForm.email.trim(),
          password: managedUserForm.password.trim() || undefined,
          role: managedUserForm.role,
        });
      } else {
        await createUser({
          fullName: managedUserForm.fullName.trim(),
          email: managedUserForm.email.trim(),
          password: managedUserForm.password.trim(),
          role: managedUserForm.role,
        });
      }
      setUserModalVisible(false);
      setManagedUserForm(emptyUserForm);
      setSelectedUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save user.';
      Alert.alert('User save failed', message);
    }
  }

  function confirmDeleteUser(targetUser: LibraryUser) {
    Alert.alert('Delete user', `Remove ${targetUser.fullName} from the system?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteUser(targetUser.id);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to delete user.';
              Alert.alert('Delete failed', message);
            }
          })();
        },
      },
    ]);
  }

  function confirmLogout() {
    Alert.alert('Sign out', 'End your current session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', onPress: () => void logout() },
    ]);
  }

  function confirmBorrowBookmark(book: Book) {
    Alert.alert('Borrow book', `Borrow "${book.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Borrow',
        onPress: () => {
          void (async () => {
            try {
              setBorrowingId(book.id);
              await borrowBook(book.id);
              Alert.alert('Requested!', `"${book.title}" has been submitted for approval.`);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unable to borrow.';
              Alert.alert('Borrow failed', message);
            } finally {
              setBorrowingId(null);
            }
          })();
        },
      },
    ]);
  }

  const myActiveLoans = transactions.filter((t) => t.status !== 'RETURNED').length;
  const myReturnedCount = transactions.filter((t) => t.status === 'RETURNED').length;
  const isAdmin = user.role === 'LIBRARIAN';

  // Sets for borrow-state checks in the bookmarks list
  const activeBorrowedIds = new Set(
    transactions
      .filter((t) => t.userId === user.id && (t.status === 'BORROWED' || t.status === 'OVERDUE' || t.status === 'PENDING_RETURN'))
      .map((t) => t.bookId)
  );
  const pendingIds = new Set(
    transactions
      .filter((t) => t.userId === user.id && t.status === 'PENDING')
      .map((t) => t.bookId)
  );

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => void reloadAll()}
              tintColor={palette.primary}
            />
          }>

          {/* ── Profile header ───────────────────────────────────────────────── */}
          <View style={styles.profileSection}>
            <View style={styles.profileTopRow}><View style={{flex:1}} /><ThemeToggle /></View>
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrap}>
                <Avatar name={user.fullName} size={80} />
              </View>
              <View style={styles.profileMeta}>
                <Text style={styles.profileName}>{user.fullName}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                <PillBadge
                  label={formatRole(user.role)}
                  tone={isAdmin ? 'warning' : 'primary'}
                />
              </View>
            </View>
          </View>

          {/* ── Stats row ─────────────────────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {isAdmin ? dashboard?.summary.activeLoans ?? 0 : myActiveLoans}
              </Text>
              <Text style={styles.statLabel}>{isAdmin ? 'Active Loans' : 'Borrowed'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {isAdmin ? dashboard?.summary.totalUsers ?? 0 : myReturnedCount}
              </Text>
              <Text style={styles.statLabel}>{isAdmin ? 'Members' : 'Returned'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{bookmarkedBooks.length}</Text>
              <Text style={styles.statLabel}>Bookmarks</Text>
            </View>
          </View>

          {error ? (
            <AppCard style={styles.errorCard}>
              <Text style={styles.errorTitle}>Account issue</Text>
              <Text style={styles.errorCopy}>{error}</Text>
            </AppCard>
          ) : null}

          {/* ── Settings list ────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Library</Text>
            <AppCard style={styles.settingsCard}>

              {/* Bookmarks — inline collapsible */}
              <Pressable
                onPress={() => setBookmarksExpanded((p) => !p)}
                style={({ pressed }) => [styles.settingsRow, pressed ? styles.settingsRowPressed : undefined]}>
                <View style={styles.settingsIconWrap}>
                  <Ionicons name="bookmark-outline" size={18} color={palette.textMuted} />
                </View>
                <Text style={styles.settingsLabel}>Bookmarks</Text>
                {bookmarkedBooks.length > 0 ? (
                  <View style={styles.settingsBadge}>
                    <Text style={styles.settingsBadgeText}>{bookmarkedBooks.length}</Text>
                  </View>
                ) : null}
                <Ionicons
                  name={bookmarksExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={palette.textMuted}
                />
              </Pressable>

              {bookmarksExpanded && (
                <View style={styles.bookmarksDropdown}>
                  {bookmarkedBooks.length ? (
                    bookmarkedBooks.map((book) => {
                      const alreadyBorrowed = activeBorrowedIds.has(book.id);
                      const awaitingApproval = pendingIds.has(book.id);
                      const unavailable = book.availableQuantity === 0;
                      const canBorrow = !isAdmin && !alreadyBorrowed && !awaitingApproval && !unavailable;
                      const borrowLabel = awaitingApproval
                        ? 'Pending'
                        : alreadyBorrowed
                          ? 'Borrowed'
                          : unavailable
                            ? 'Unavailable'
                            : 'Borrow';

                      return (
                        <Pressable
                          key={book.id}
                          onPress={() => setDetailBook(book)}
                          style={({ pressed }) => [
                            styles.bookmarkRow,
                            pressed ? styles.bookmarkRowPressed : undefined,
                          ]}>
                          <BookCover
                            title={book.title}
                            author={book.author}
                            category={book.category}
                            size="md"
                          />
                          <View style={styles.bookmarkMeta}>
                            <Text style={[styles.bookmarkTitle, { color: palette.text }]} numberOfLines={2}>
                              {book.title}
                            </Text>
                            <Text style={[styles.bookmarkAuthor, { color: palette.textMuted }]} numberOfLines={1}>
                              {book.author}
                            </Text>
                            <PillBadge
                              label={book.availableQuantity > 0 ? 'Available' : 'Out'}
                              tone={book.availableQuantity > 0 ? 'success' : 'danger'}
                            />
                          </View>
                          <Pressable
                            hitSlop={10}
                            onPress={(e) => {
                              e.stopPropagation();
                              Alert.alert(
                                'Remove bookmark',
                                `Remove "${book.title}" from bookmarks?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Remove',
                                    style: 'destructive',
                                    onPress: () => toggleBookmark(book),
                                  },
                                ]
                              );
                            }}>
                            <Ionicons name="heart" size={22} color="#E05C5C" />
                          </Pressable>
                        </Pressable>
                      );
                    })
                  ) : (
                    <View style={styles.emptyBookmarks}>
                      <Ionicons name="heart-outline" size={32} color={palette.textMuted} />
                      <Text style={styles.emptyBookmarksTitle}>No bookmarks yet</Text>
                      <Text style={styles.emptyBookmarksText}>
                        Tap the heart icon on any book to save it here.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {isAdmin ? (
                <SettingsRow
                  icon="people-outline"
                  label="Manage Users"
                  badge={users.length}
                  onPress={openCreateUserModal}
                />
              ) : null}
            </AppCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            <AppCard style={styles.settingsCard}>
              <SettingsRow
                icon="person-outline"
                label="Edit Profile"
                onPress={() => setProfileModalVisible(true)}
              />
            </AppCard>
          </View>

          <View style={styles.section}>
            <AppCard style={styles.settingsCard}>
              <SettingsRow
                icon="log-out-outline"
                label="Sign Out"
                danger
                onPress={confirmLogout}
              />
            </AppCard>
          </View>

          {/* ── Admin: user list ─────────────────────────────────────────────── */}
          {isAdmin && (
            <View style={styles.section}>
              <Pressable
                onPress={() => setMembersExpanded((p) => !p)}
                style={({ pressed }) => [styles.membersHeader, pressed ? { opacity: 0.7 } : undefined]}>
                <Text style={styles.sectionLabel}>All Members</Text>
                <View style={styles.membersHeaderRight}>
                  {users.length > 0 && (
                    <View style={styles.settingsBadge}>
                      <Text style={styles.settingsBadgeText}>{users.length}</Text>
                    </View>
                  )}
                  <Pressable style={styles.addUserButton} onPress={openCreateUserModal}>
                    <Ionicons name="add" size={16} color={palette.primary} />
                    <Text style={styles.addUserLabel}>Add User</Text>
                  </Pressable>
                  <Ionicons
                    name={membersExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={palette.textMuted}
                  />
                </View>
              </Pressable>

              {membersExpanded && (
                <>
                  {users.length ? (
                    users.map((libraryUser) => (
                      <AppCard key={libraryUser.id} style={styles.userCard}>
                        <View style={styles.userCardRow}>
                          <Avatar name={libraryUser.fullName} size={44} />
                          <View style={styles.userCardMeta}>
                            <Text style={styles.userName}>{libraryUser.fullName}</Text>
                            <Text style={styles.userEmail}>{libraryUser.email}</Text>
                            <View style={styles.userStats}>
                              <Text style={styles.userStat}>{libraryUser.activeLoanCount} active</Text>
                              <Text style={styles.userStatDot}>·</Text>
                              <Text style={styles.userStat}>{libraryUser.totalTransactions} total</Text>
                            </View>
                          </View>
                          <PillBadge
                            label={formatRole(libraryUser.role)}
                            tone={libraryUser.role === 'LIBRARIAN' ? 'warning' : 'primary'}
                          />
                        </View>

                        <View style={styles.userActions}>
                          <AppButton
                            label="Edit"
                            variant="secondary"
                            compact
                            style={styles.flexButton}
                            onPress={() => openEditUserModal(libraryUser)}
                          />
                          <AppButton
                            label="Delete"
                            variant="danger"
                            compact
                            disabled={libraryUser.id === user.id}
                            style={styles.flexButton}
                            onPress={() => confirmDeleteUser(libraryUser)}
                          />
                        </View>
                      </AppCard>
                    ))
                  ) : (
                    <EmptyState
                      title="No users available"
                      message="Create the first library account from the button above."
                    />
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ── Edit profile modal ──────────────────────────────────────────────── */}
      <ModalSheet
        visible={profileModalVisible}
        title="Edit Profile"
        subtitle="Update your personal details. Leave the password empty to keep it unchanged."
        onClose={() => { setProfileModalVisible(false); setProfileErrors({}); }}
        footer={
          <View style={styles.footerActions}>
            <AppButton
              label="Cancel"
              variant="ghost"
              style={styles.flexButton}
              onPress={() => {
                setProfileModalVisible(false);
                setProfileErrors({});
                setProfileForm({ fullName: user.fullName, email: user.email, password: '', role: user.role });
              }}
            />
            <AppButton
              label="Save Profile"
              style={styles.flexButton}
              loading={isMutating}
              onPress={handleProfileSave}
            />
          </View>
        }>
        <AppInput
          label="Full Name"
          value={profileForm.fullName}
          onChangeText={(v) => setProfileForm((c) => ({ ...c, fullName: v }))}
          error={profileErrors.fullName}
        />
        <AppInput
          label="Email"
          value={profileForm.email}
          onChangeText={(v) => setProfileForm((c) => ({ ...c, email: v }))}
          autoCapitalize="none"
          keyboardType="email-address"
          error={profileErrors.email}
        />
        <AppInput
          label="New Password"
          value={profileForm.password}
          onChangeText={(v) => setProfileForm((c) => ({ ...c, password: v }))}
          secureTextEntry
          autoCapitalize="none"
          hint="Optional — leave blank to keep current password"
          error={profileErrors.password}
        />
      </ModalSheet>

      {/* ── Manage user modal (admin) ───────────────────────────────────────── */}
      <ModalSheet
        visible={userModalVisible}
        title={selectedUser ? 'Edit User' : 'Create User'}
        subtitle="Librarians can manage both student and librarian accounts."
        onClose={() => { setUserModalVisible(false); setManagedErrors({}); setSelectedUser(null); setManagedUserForm(emptyUserForm); }}
        footer={
          <View style={styles.footerActions}>
            <AppButton
              label="Cancel"
              variant="ghost"
              style={styles.flexButton}
              onPress={() => { setUserModalVisible(false); setManagedErrors({}); setSelectedUser(null); setManagedUserForm(emptyUserForm); }}
            />
            <AppButton
              label={selectedUser ? 'Save User' : 'Create User'}
              style={styles.flexButton}
              loading={isMutating}
              onPress={handleManagedUserSave}
            />
          </View>
        }>
        <AppInput
          label="Full Name"
          value={managedUserForm.fullName}
          onChangeText={(v) => setManagedUserForm((c) => ({ ...c, fullName: v }))}
          error={managedErrors.fullName}
        />
        <AppInput
          label="Email"
          value={managedUserForm.email}
          onChangeText={(v) => setManagedUserForm((c) => ({ ...c, email: v }))}
          autoCapitalize="none"
          keyboardType="email-address"
          error={managedErrors.email}
        />
        <AppInput
          label={selectedUser ? 'New Password' : 'Password'}
          value={managedUserForm.password}
          onChangeText={(v) => setManagedUserForm((c) => ({ ...c, password: v }))}
          secureTextEntry
          autoCapitalize="none"
          hint={selectedUser ? 'Optional on edit' : 'Required for new users'}
          error={managedErrors.password}
        />
        <View style={styles.roleSection}>
          <Text style={styles.roleLabel}>Role</Text>
          <RolePicker
            value={managedUserForm.role}
            onChange={(role) => setManagedUserForm((c) => ({ ...c, role }))}
          />
        </View>
      </ModalSheet>

      {/* ── Book detail modal (from bookmarks) ─────────────────────────────── */}
      {(() => {
        const alreadyBorrowed = detailBook ? activeBorrowedIds.has(detailBook.id) : false;
        const awaitingApproval = detailBook ? pendingIds.has(detailBook.id) : false;
        const unavailable = detailBook ? detailBook.availableQuantity === 0 : false;
        const canBorrow = !isAdmin && !!detailBook && !alreadyBorrowed && !awaitingApproval && !unavailable;
        const borrowLabel = awaitingApproval
          ? 'Waiting for approval'
          : alreadyBorrowed
            ? 'Already on your shelf'
            : unavailable
              ? 'Unavailable'
              : 'Borrow this book';

        return (
          <ModalSheet
            visible={!!detailBook}
            title={detailBook?.title ?? ''}
            subtitle={detailBook?.author ?? ''}
            onClose={() => setDetailBook(null)}
            footer={
              !isAdmin && detailBook ? (
                <AppButton
                  label={borrowingId === detailBook.id ? 'Requesting…' : borrowLabel}
                  loading={borrowingId === detailBook.id}
                  disabled={!canBorrow || borrowingId === detailBook.id}
                  onPress={() => confirmBorrowBookmark(detailBook)}
                />
              ) : undefined
            }>
            {detailBook ? (
              <View style={styles.detailContent}>
                <View style={styles.detailCoverRow}>
                  <BookCover
                    title={detailBook.title}
                    author={detailBook.author}
                    category={detailBook.category}
                    size="lg"
                  />
                </View>
                <View style={styles.detailBadgeRow}>
                  <PillBadge label={detailBook.category} tone="primary" />
                  <PillBadge
                    label={detailBook.availableQuantity > 0 ? 'Available' : 'Out'}
                    tone={detailBook.availableQuantity > 0 ? 'success' : 'danger'}
                  />
                </View>
                <View style={styles.detailGrid}>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailGridValue}>{detailBook.quantity}</Text>
                    <Text style={styles.detailGridLabel}>Quantity</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailGridValue}>{detailBook.quantity - detailBook.availableQuantity}</Text>
                    <Text style={styles.detailGridLabel}>Active Loans</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailGridValue}>{detailBook.cabinet}</Text>
                    <Text style={styles.detailGridLabel}>Cabinet</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailGridValue}>{detailBook.rack}</Text>
                    <Text style={styles.detailGridLabel}>Rack</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailGridValue}>{detailBook.row}</Text>
                    <Text style={styles.detailGridLabel}>Row</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </ModalSheet>
        );
      })()}
    </>
  );
}

function createStyles(palette: AppPalette) { return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.primary,
  },
  scroll: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },

  // ── Profile section ─────────────────────────────────────────────────────────
  profileSection: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  avatarWrap: {
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatar: {
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.white,
    fontFamily: typography.heading,
    fontWeight: '700',
  },
  profileMeta: {
    flex: 1,
    gap: spacing.xs,
    paddingBottom: 4,
  },
  profileName: {
    color: palette.white,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: typography.body,
    fontSize: 13,
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
  },
  statValue: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  statLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Sections ───────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  membersHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  addUserLabel: {
    color: palette.primary,
    fontFamily: typography.body,
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Settings rows ──────────────────────────────────────────────────────────
  settingsCard: {
    gap: 0,
    padding: 0,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  settingsRowPressed: {
    backgroundColor: palette.surfaceMuted,
  },
  settingsIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  settingsBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  settingsBadgeText: {
    color: palette.white,
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '800',
  },

  // ── User cards ─────────────────────────────────────────────────────────────
  userCard: {
    gap: spacing.md,
  },
  userCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userCardMeta: {
    flex: 1,
    gap: 2,
  },
  userName: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 16,
  },
  userEmail: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  userStat: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  userStatDot: {
    color: palette.textMuted,
    fontSize: 12,
  },
  userActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // ── Bookmarks inline dropdown ──────────────────────────────────────────────
  bookmarksDropdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingTop: spacing.xs,
  },
  bookmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  bookmarkRowPressed: {
    backgroundColor: palette.surfaceMuted,
  },
  bookmarkMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  bookmarkTitle: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  bookmarkAuthor: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  borrowBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: palette.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  borrowBtnDisabled: {
    backgroundColor: palette.surfaceStrong,
  },
  borrowBtnLabel: {
    color: palette.white,
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '700',
  },
  borrowBtnLabelDisabled: {
    color: palette.textMuted,
  },
  emptyBookmarks: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  emptyBookmarksTitle: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 18,
  },
  emptyBookmarksText: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
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

  // ── Modals ─────────────────────────────────────────────────────────────────
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  roleSection: {
    gap: spacing.sm,
  },
  roleLabel: {
    color: palette.text,
    fontFamily: typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rolePill: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: palette.surfaceMuted,
  },
  rolePillActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  rolePillLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  rolePillLabelActive: {
    color: palette.white,
  },

  // ── Profile top row (theme toggle) ────────────────────────────────────────
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },

  // ── Book detail modal ──────────────────────────────────────────────────────
  detailContent: {
    gap: spacing.md,
  },
  detailCoverRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  detailGridItem: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  detailGridValue: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 18,
  },
  detailGridLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
}); }
