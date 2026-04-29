import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import { AppButton } from '@/components/app-button';
import { AppCard } from '@/components/app-card';
import { AppInput } from '@/components/app-input';
import { EmptyState } from '@/components/empty-state';
import { ModalSheet } from '@/components/modal-sheet';
import { PillBadge } from '@/components/pill-badge';
import { ScreenShell } from '@/components/screen-shell';
import { palette, radii, spacing, typography } from '@/constants/library-theme';
import { useAuth } from '@/contexts/auth-context';
import { useLibrary } from '@/contexts/library-context';
import { formatCurrency, formatRole } from '@/lib/formatting';
import { validateEmail, validatePassword, validateRequiredText } from '@/lib/validation';
import { LibraryUser, Role } from '@/types/library';

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

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const { users, transactions, dashboard, error, isLoading, isMutating, createUser, updateUser, deleteUser, reloadAll } =
    useLibrary();

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LibraryUser | null>(null);
  const [profileForm, setProfileForm] = useState(emptyUserForm);
  const [managedUserForm, setManagedUserForm] = useState(emptyUserForm);
  const [profileErrors, setProfileErrors] = useState<Record<string, string | null>>({});
  const [managedErrors, setManagedErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
    });
  }, [user]);

  if (!user) {
    return null;
  }

  function validateUserForm(
    input: typeof emptyUserForm,
    requirePassword: boolean
  ): Record<string, string | null> {
    return {
      fullName: validateRequiredText('Full name', input.fullName),
      email: validateEmail(input.email),
      password: validatePassword(input.password, !requirePassword),
    };
  }

  async function handleProfileSave() {
    const nextErrors = validateUserForm(profileForm, false);
    setProfileErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    try {
      await updateUser(user.id, {
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        password: profileForm.password.trim() || undefined,
        role: user.role,
      });
      setProfileModalVisible(false);
      setProfileForm((current) => ({ ...current, password: '' }));
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
    setManagedUserForm({
      fullName: libraryUser.fullName,
      email: libraryUser.email,
      password: '',
      role: libraryUser.role,
    });
    setUserModalVisible(true);
  }

  async function handleManagedUserSave() {
    const nextErrors = validateUserForm(managedUserForm, !selectedUser);
    setManagedErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

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
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        onPress: () => {
          void logout();
        },
      },
    ]);
  }

  const myActiveLoans = transactions.filter((transaction) => transaction.status !== 'RETURNED').length;
  const myOutstandingFees = transactions.reduce((sum, transaction) => sum + transaction.lateFee, 0);

  return (
    <>
      <ScreenShell
        title={user.role === 'LIBRARIAN' ? 'Team & Access' : 'My Account'}
        subtitle={
          user.role === 'LIBRARIAN'
            ? 'Manage user profiles, promote librarians, and keep member records clean.'
            : 'Update your profile, review your account summary, and sign out securely.'
        }
        action={
          user.role === 'LIBRARIAN' ? (
            <AppButton label="Add User" variant="secondary" compact onPress={openCreateUserModal} />
          ) : null
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
        <AppCard>
          <View style={styles.profileHeader}>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{user.fullName}</Text>
              <Text style={styles.profileMeta}>{user.email}</Text>
            </View>
            <PillBadge
              label={formatRole(user.role)}
              tone={user.role === 'LIBRARIAN' ? 'warning' : 'primary'}
            />
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Active Loans</Text>
              <Text style={styles.summaryValue}>
                {user.role === 'LIBRARIAN' ? dashboard?.summary.activeLoans ?? 0 : myActiveLoans}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Outstanding Fees</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(
                  user.role === 'LIBRARIAN'
                    ? dashboard?.summary.outstandingFees ?? 0
                    : myOutstandingFees
                )}
              </Text>
            </View>
          </View>

          <View style={styles.primaryActions}>
            <AppButton
              label="Edit Profile"
              variant="secondary"
              style={styles.flexButton}
              onPress={() => setProfileModalVisible(true)}
            />
            <AppButton
              label="Sign Out"
              variant="ghost"
              style={styles.flexButton}
              onPress={confirmLogout}
            />
          </View>
        </AppCard>

        {error ? (
          <AppCard style={styles.errorCard}>
            <Text style={styles.errorTitle}>Account issue</Text>
            <Text style={styles.errorCopy}>{error}</Text>
          </AppCard>
        ) : null}

        {user.role === 'LIBRARIAN' ? (
          users.length ? (
            users.map((libraryUser) => (
              <AppCard key={libraryUser.id}>
                <View style={styles.profileHeader}>
                  <View style={styles.profileCopy}>
                    <Text style={styles.userName}>{libraryUser.fullName}</Text>
                    <Text style={styles.userMeta}>{libraryUser.email}</Text>
                  </View>
                  <PillBadge
                    label={formatRole(libraryUser.role)}
                    tone={libraryUser.role === 'LIBRARIAN' ? 'warning' : 'primary'}
                  />
                </View>

                <View style={styles.userStatsRow}>
                  <Text style={styles.userStat}>
                    {libraryUser.activeLoanCount} active loan{libraryUser.activeLoanCount === 1 ? '' : 's'}
                  </Text>
                  <Text style={styles.userStat}>
                    {libraryUser.totalTransactions} total transaction
                    {libraryUser.totalTransactions === 1 ? '' : 's'}
                  </Text>
                  <Text style={styles.userStat}>
                    {formatCurrency(libraryUser.outstandingLateFees)} overdue fees
                  </Text>
                </View>

                <View style={styles.primaryActions}>
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
              message="Create the first library account from the button above to start managing access."
            />
          )
        ) : (
          <EmptyState
            title="Account controls ready"
            message="Use this screen to keep your contact details up to date and review your library account summary."
          />
        )}
      </ScreenShell>

      <ModalSheet
        visible={profileModalVisible}
        title="Edit Profile"
        subtitle="Update your personal details. Leaving the password empty keeps it unchanged."
        onClose={() => {
          setProfileModalVisible(false);
          setProfileErrors({});
        }}
        footer={
          <View style={styles.primaryActions}>
            <AppButton
              label="Cancel"
              variant="ghost"
              style={styles.flexButton}
              onPress={() => {
                setProfileModalVisible(false);
                setProfileErrors({});
                setProfileForm({
                  fullName: user.fullName,
                  email: user.email,
                  password: '',
                  role: user.role,
                });
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
          onChangeText={(value) => setProfileForm((current) => ({ ...current, fullName: value }))}
          error={profileErrors.fullName}
        />
        <AppInput
          label="Email"
          value={profileForm.email}
          onChangeText={(value) => setProfileForm((current) => ({ ...current, email: value }))}
          autoCapitalize="none"
          keyboardType="email-address"
          error={profileErrors.email}
        />
        <AppInput
          label="New Password"
          value={profileForm.password}
          onChangeText={(value) => setProfileForm((current) => ({ ...current, password: value }))}
          secureTextEntry
          autoCapitalize="none"
          hint="Optional on edit"
          error={profileErrors.password}
        />
      </ModalSheet>

      <ModalSheet
        visible={userModalVisible}
        title={selectedUser ? 'Edit User' : 'Create User'}
        subtitle="Librarians can manage both student and librarian accounts from here."
        onClose={() => {
          setUserModalVisible(false);
          setManagedErrors({});
          setSelectedUser(null);
          setManagedUserForm(emptyUserForm);
        }}
        footer={
          <View style={styles.primaryActions}>
            <AppButton
              label="Cancel"
              variant="ghost"
              style={styles.flexButton}
              onPress={() => {
                setUserModalVisible(false);
                setManagedErrors({});
                setSelectedUser(null);
                setManagedUserForm(emptyUserForm);
              }}
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
          onChangeText={(value) => setManagedUserForm((current) => ({ ...current, fullName: value }))}
          error={managedErrors.fullName}
        />
        <AppInput
          label="Email"
          value={managedUserForm.email}
          onChangeText={(value) => setManagedUserForm((current) => ({ ...current, email: value }))}
          autoCapitalize="none"
          keyboardType="email-address"
          error={managedErrors.email}
        />
        <AppInput
          label={selectedUser ? 'New Password' : 'Password'}
          value={managedUserForm.password}
          onChangeText={(value) => setManagedUserForm((current) => ({ ...current, password: value }))}
          secureTextEntry
          autoCapitalize="none"
          hint={selectedUser ? 'Optional on edit' : 'Required for new users'}
          error={managedErrors.password}
        />
        <View style={styles.roleSection}>
          <Text style={styles.roleLabel}>Role</Text>
          <RolePicker
            value={managedUserForm.role}
            onChange={(role) => setManagedUserForm((current) => ({ ...current, role }))}
          />
        </View>
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  profileName: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 28,
  },
  profileMeta: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryLabel: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: palette.primary,
    fontFamily: typography.heading,
    fontSize: 24,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexButton: {
    flex: 1,
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
  userName: {
    color: palette.text,
    fontFamily: typography.heading,
    fontSize: 24,
  },
  userMeta: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  userStatsRow: {
    gap: spacing.xs,
  },
  userStat: {
    color: palette.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
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
});
