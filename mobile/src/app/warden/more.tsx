import { Boxes, CirclePlus, QrCode, Vote, Wallet, Activity, ChartColumn, Contact, Gauge, HandCoins, Lightbulb, Megaphone, Moon, NotebookPen, UtensilsCrossed, Wrench } from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { Appear, Screen } from '../../ui/layout';
import { Menu, MenuItem } from '../../ui/blocks';
import AccountSettings from '../../features/AccountSettings';
import ProfileHero from '../../features/ProfileHero';
import { go } from '../../lib/nav';

const GROUPS = [
  {
    title: 'Daily work',
    items: [
      { icon: Moon, tone: 'lilac' as const, title: 'Night roll call', sub: 'Mark present, absent or on leave', go: '/manage/roll-call' },
      { icon: UtensilsCrossed, tone: 'peach' as const, title: 'Mess & kitchen', sub: 'Plates to cook, skipped meals, menu', go: '/manage/mess' },
      { icon: Wrench, tone: 'peach' as const, title: 'Complaints', sub: 'Update status and reply', go: '/helpdesk' },
      { icon: Megaphone, tone: 'mint' as const, title: 'Announcements', sub: 'Tell residents & staff', go: '/notices' },
      { icon: Vote, tone: 'lilac' as const, title: 'Polls', sub: 'Ask anything, everyone votes', go: '/polls' },
      { icon: Lightbulb, tone: 'sun' as const, title: 'Suggestions', sub: 'Ideas from students', go: '/suggestions' },
    ],
  },
  {
    title: 'Money',
    items: [
      { icon: CirclePlus, tone: 'sun' as const, title: 'Ask for money / add payment', sub: 'Fine, damage, deposit, advance…', go: '/manage/dues?charge=1' },
      { icon: QrCode, tone: 'mint' as const, title: 'Payment details', sub: 'UPI ID & bank for the QR on bills', go: '/manage/payment-settings' },
      { icon: Wallet, tone: 'sun' as const, title: 'Pending dues', sub: 'Who owes money · collect in one tap', go: '/manage/dues' },
      { icon: HandCoins, tone: 'sun' as const, title: 'Fees & payments', sub: 'Record cash, UPI or bank payments', go: '/manage/fees' },
      { icon: Gauge, tone: 'peach' as const, title: 'Demand notes & meters', sub: 'Electricity readings and monthly notes', go: '/manage/demand-notes' },
      { icon: NotebookPen, tone: 'lilac' as const, title: 'Expenses', sub: 'Log daily spending into the ledger', go: '/manage/expenses' },
      { icon: ChartColumn, tone: 'mint' as const, title: 'Reports', sub: 'Collection, occupancy, leaves, mess', go: '/manage/reports' },
    ],
  },
  {
    title: 'Stock',
    items: [
      { icon: Boxes, tone: 'peach' as const, title: 'Stock register', sub: 'Assets, inventory, kitchen groceries', go: '/manage/inventory' },
    ],
  },
  {
    title: 'Team',
    items: [
      { icon: Contact, tone: 'mint' as const, title: 'Staff', sub: 'Call guards, cooks and cleaners', go: '/manage/staff' },
      { icon: Activity, tone: 'lilac' as const, title: 'Activity log', sub: 'Who did what, and when', go: '/manage/activity' },
    ],
  },
];

export default function WardenMore() {
  const { user } = useAuth();
  return (
    <Screen title="More" subtitle="Everything else you manage">
      <Appear>
        <ProfileHero name={user?.name} line1={user?.email} line2={user?.companyName} pill={user?.assignedFloor ? `Floor ${user.assignedFloor} warden` : 'Chief warden'} />
      </Appear>
      {GROUPS.map((g, gi) => (
        <Appear key={g.title} i={gi + 1}>
          <Menu title={g.title}>
            {g.items.map((it) => <MenuItem key={it.title} icon={it.icon} tone={it.tone} title={it.title} sub={it.sub} onPress={() => go(it.go as any)} />)}
          </Menu>
        </Appear>
      ))}
      <Appear i={GROUPS.length + 1}><AccountSettings /></Appear>
    </Screen>
  );
}
