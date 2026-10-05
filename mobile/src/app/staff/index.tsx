import { useAuth } from '../../lib/auth';
import { firstName } from '../../lib/format';
import { Screen } from '../../ui/layout';
import { Avatar, Press } from '../../ui/primitives';
import { colors } from '../../ui/theme';
import { go } from '../../lib/nav';
import GateBoard from '../../features/GateBoard';
import AnnouncementBanner from '../../features/AnnouncementBanner';

// Gate staff: let residents out, mark returns, check visitors in and out
export default function StaffGate() {
  const { user } = useAuth();
  return (
    <Screen title="Gate desk" subtitle={`On duty · ${firstName(user?.name)}`} left={<Press onPress={() => go('/staff/account')} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="My profile" style={{ borderRadius: 24, borderWidth: 2, borderColor: colors.white }}><Avatar name={user?.name} uri={undefined} size={44} tone="mint" /></Press>}>
      <AnnouncementBanner />
      <GateBoard />
    </Screen>
  );
}
