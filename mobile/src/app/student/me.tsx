import { Bell, CalendarDays, Lightbulb, Megaphone, Receipt, UserRound, UtensilsCrossed, Wrench } from 'lucide-react-native';
import { dashboardApi } from '../../api';
import { useAuth } from '../../lib/auth';
import { useData } from '../../lib/query';
import { Badge } from '../../ui/primitives';
import { Appear, Screen } from '../../ui/layout';
import { Menu, MenuItem } from '../../ui/blocks';
import AccountSettings from '../../features/AccountSettings';
import ProfileHero from '../../features/ProfileHero';
import { useInbox } from '../../features/inbox';
import { go } from '../../lib/nav';

export default function StudentMe() {
  const { user } = useAuth();
  const dash = useData(['dashboard'], dashboardApi.get);
  const { unread } = useInbox(user);
  const p = dash.data?.profile;

  return (
    <Screen title="Me" subtitle="Your profile, help and settings" onRefresh={dash.refetch}>
      <Appear>
        <ProfileHero
          name={user?.name}
          avatar={p?.avatar}
          line1={p?.rollNumber || user?.studentDetails?.rollNumber}
          line2={user?.email}
          pill={p?.status === 'CHECKED_IN' ? 'Checked in' : undefined}
          cells={[
            { k: 'Room', v: p?.room?.roomNumber ? String(p.room.roomNumber) : '—' },
            { k: 'Floor', v: p?.room?.floorNumber ? String(p.room.floorNumber) : '—' },
            { k: 'Sharing', v: p?.room?.sharingType ? `${p.room.sharingType}-bed` : '—' },
          ]}
          onPress={() => go('/profile')}
        />
      </Appear>

      <Appear i={1}>
        <Menu title="My stay">
          <MenuItem icon={UserRound} tone="mint" title="My profile" sub="Details, change requests, ID documents" onPress={() => go('/profile')} />
          <MenuItem icon={CalendarDays} tone="lilac" title="Leaves" sub="Apply and track gate passes" onPress={() => go('/student/leaves')} />
          <MenuItem icon={UtensilsCrossed} tone="peach" title="Mess" sub="Weekly menu and skipped meals" onPress={() => go('/student/mess')} />
          <MenuItem icon={Receipt} tone="sun" title="Bills & receipts" sub="What's due and what you've paid" onPress={() => go('/student/bills')} />
        </Menu>
      </Appear>

      <Appear i={2}>
        <Menu title="Help & updates">
          <MenuItem icon={Bell} tone="sun" title="Notifications" sub="Leave, bill and complaint updates" right={unread ? <Badge label={`${unread} new`} tone="danger" /> : undefined} onPress={() => go('/notifications')} />
          <MenuItem icon={Wrench} tone="peach" title="Complaints" sub="Report a problem in your room" onPress={() => go('/helpdesk')} />
          <MenuItem icon={Lightbulb} tone="lilac" title="Suggestions" sub="Ideas to make the hostel better" onPress={() => go('/suggestions')} />
          <MenuItem icon={Megaphone} tone="mint" title="Announcements" sub="News and polls from the warden" onPress={() => go('/notices')} />
        </Menu>
      </Appear>

      <Appear i={3}><AccountSettings /></Appear>
    </Screen>
  );
}
