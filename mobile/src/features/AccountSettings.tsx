import { useState } from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import { LogOut } from 'lucide-react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../ui/theme';
import { T } from '../ui/primitives';
import { Confirm } from '../ui/feedback';
import { Menu, MenuItem } from '../ui/blocks';

// Sign out, shared by every role
export default function AccountSettings() {
  const { logout } = useAuth();
  const [confirmOut, setConfirmOut] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <Menu>
        <MenuItem icon={LogOut} title="Sign out" sub="You can sign in again any time" danger onPress={() => setConfirmOut(true)} />
      </Menu>
      <T v="caption" c={colors.text3} center>Hari Pushp Tower · version {Constants.expoConfig?.version || '1.0.0'}</T>
      <Confirm open={confirmOut} title="Sign out?" message="You'll need your email and password to sign in again." confirmLabel="Sign out" danger onConfirm={logout} onClose={() => setConfirmOut(false)} />
    </View>
  );
}
