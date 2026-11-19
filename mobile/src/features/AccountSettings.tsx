import { useState } from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import { KeyRound, Lock, LogOut } from 'lucide-react-native';
import { authApi } from '../api';
import { useAuth } from '../lib/auth';
import { colors } from '../ui/theme';
import { Button, T } from '../ui/primitives';
import { Field, Input } from '../ui/form';
import { Confirm, useToast } from '../ui/feedback';
import { Menu, MenuItem } from '../ui/blocks';
import { Sheet } from '../ui/Sheet';

export default function AccountSettings() {
  const { logout } = useAuth();
  const toast = useToast();
  const [confirmOut, setConfirmOut] = useState(false);

  // Change password state
  const [pwSheetOpen, setPwSheetOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) {
      return toast.error('Required', 'Please enter your current and new password');
    }
    if (newPw.length < 6) {
      return toast.error('Too short', 'New password must be at least 6 characters');
    }
    if (newPw !== confirmPw) {
      return toast.error('Mismatch', 'New passwords do not match');
    }

    setSavingPw(true);
    try {
      await authApi.changePassword({ currentPassword: currentPw, newPassword: newPw });
      toast.success('Password changed', 'Your account security has been updated');
      setPwSheetOpen(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (e: any) {
      toast.error('Failed', e.message || 'Current password might be incorrect');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Menu title="Account & security">
        <MenuItem
          icon={KeyRound}
          tone="mint"
          title="Change password"
          sub="Update your login password"
          onPress={() => setPwSheetOpen(true)}
        />
        <MenuItem
          icon={LogOut}
          title="Sign out"
          sub="You can sign in again any time"
          danger
          onPress={() => setConfirmOut(true)}
        />
      </Menu>

      <T v="caption" c={colors.text3} center>
        Hari Pushp Tower · version {Constants.expoConfig?.version || '1.0.0'}
      </T>

      <Confirm
        open={confirmOut}
        title="Sign out?"
        message="You'll need your email and password to sign in again."
        confirmLabel="Sign out"
        danger
        onConfirm={logout}
        onClose={() => setConfirmOut(false)}
      />

      {/* Change Password Sheet */}
      <Sheet
        open={pwSheetOpen}
        onClose={() => setPwSheetOpen(false)}
        title="Change Password"
        subtitle="Secure your account with a new password"
        footer={
          <Button
            title={savingPw ? 'Updating…' : 'Update Password'}
            icon={Lock}
            onPress={handleChangePassword}
            loading={savingPw}
            full
          />
        }
      >
        <Field label="Current Password" required>
          <Input
            value={currentPw}
            onChangeText={setCurrentPw}
            secureTextEntry
            placeholder="Enter current password"
          />
        </Field>
        <Field label="New Password (min 6 characters)" required>
          <Input
            value={newPw}
            onChangeText={setNewPw}
            secureTextEntry
            placeholder="Enter new password"
          />
        </Field>
        <Field label="Confirm New Password" required>
          <Input
            value={confirmPw}
            onChangeText={setConfirmPw}
            secureTextEntry
            placeholder="Re-enter new password"
          />
        </Field>
      </Sheet>
    </View>
  );
}
