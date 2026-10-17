import { DoorOpen, Megaphone, Vote, Wrench } from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { Appear, Screen } from '../../ui/layout';
import { Menu, MenuItem } from '../../ui/blocks';
import AccountSettings from '../../features/AccountSettings';
import ProfileHero from '../../features/ProfileHero';
import { go } from '../../lib/nav';

export default function StaffAccount() {
  const { user } = useAuth();
  return (
    <Screen title="Profile" subtitle="Your details and help">
      <Appear>
        <ProfileHero name={user?.name} line1={user?.staffDetails?.designation || 'Staff'} line2={user?.email} pill={user?.staffDetails?.department || 'Staff'} />
      </Appear>
      <Appear i={1}>
        <Menu title="Work">
          <MenuItem icon={DoorOpen} tone="mint" title="Gate desk" sub="Exits, returns and visitors" onPress={() => go('/staff')} />
          <MenuItem icon={Megaphone} tone="sun" title="Announcements" sub="News from the warden" onPress={() => go('/notices')} />
          <MenuItem icon={Vote} tone="lilac" title="Polls" sub="Vote on hostel questions" onPress={() => go('/polls')} />
          <MenuItem icon={Wrench} tone="peach" title="Report a problem" sub="Broken lock, light, CCTV…" onPress={() => go({ pathname: '/helpdesk', params: { new: '1' } })} />
        </Menu>
      </Appear>
      <Appear i={2}><AccountSettings /></Appear>
    </Screen>
  );
}
