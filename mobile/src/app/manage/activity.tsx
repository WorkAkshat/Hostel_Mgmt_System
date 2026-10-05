import { useState } from 'react';
import { View } from 'react-native';
import { Activity, BedDouble, Boxes, CalendarDays, DoorOpen, KeyRound, Landmark, MessageSquareText, Moon, Receipt, Users, UtensilsCrossed, Wrench } from 'lucide-react-native';
import { activityApi } from '../../api';
import { useData } from '../../lib/query';
import { fmtDate, fmtTime } from '../../lib/format';
import { colors, Tone } from '../../ui/theme';
import { Badge, Chips, IconTile, Row, T } from '../../ui/primitives';
import { Empty, ErrorBox, Loading } from '../../ui/feedback';
import { Screen } from '../../ui/layout';

const MOD: Record<string, { label: string; icon: any; tone: Tone }> = {
  AUTH: { label: 'Sign-in', icon: KeyRound, tone: 'lilac' }, STUDENT: { label: 'Students', icon: Users, tone: 'mint' }, ROOM: { label: 'Rooms', icon: BedDouble, tone: 'mint' },
  LEAVE: { label: 'Leaves', icon: CalendarDays, tone: 'sun' }, VISITOR: { label: 'Visitors', icon: DoorOpen, tone: 'sun' }, ATTENDANCE: { label: 'Roll call', icon: Moon, tone: 'lilac' },
  MESS: { label: 'Mess', icon: UtensilsCrossed, tone: 'peach' }, COMPLAINT: { label: 'Complaints', icon: Wrench, tone: 'peach' }, SUGGESTION: { label: 'Suggestions', icon: MessageSquareText, tone: 'peach' },
  FEE: { label: 'Fees', icon: Receipt, tone: 'sun' }, ACCOUNTING: { label: 'Accounts', icon: Landmark, tone: 'sun' }, STAFF: { label: 'Staff', icon: Users, tone: 'mint' }, INVENTORY: { label: 'Stock', icon: Boxes, tone: 'peach' },
};
const ACT: Record<string, string> = { LOGIN: 'Signed in', LOGOUT: 'Signed out', CREATE: 'Created', UPDATE: 'Updated', DELETE: 'Deleted', APPROVE: 'Approved', REJECT: 'Rejected', CHECKOUT: 'Gate exit', CHECKIN: 'Gate entry', PAYMENT: 'Payment', OPT_OUT: 'Meal skipped', CANCEL: 'Cancelled', SEND: 'Sent' };

const dayLabel = (d: string) => {
  const x = new Date(d).toDateString();
  const t = new Date();
  if (x === t.toDateString()) return 'Today';
  t.setDate(t.getDate() - 1);
  if (x === t.toDateString()) return 'Yesterday';
  return fmtDate(d, { weekday: 'long' });
};

// Who did what, newest first. Sign-ins are hidden unless you ask for them.
export default function ActivityLog() {
  const [module, setModule] = useState('all');
  const { data, isLoading, error, refetch } = useData(['activity', module], () => activityApi.list({ limit: 80, ...(module === 'all' ? { exclude: 'LOGIN' } : { module }) }));
  // "Everything" hides sign-in / sign-out entries — they have their own chip
  const logs: any[] = (data?.logs || []).filter((l: any) => module !== 'all' || l.module !== 'AUTH');
  let lastDay = '';

  return (
    <Screen title="Activity log" subtitle="Who did what, and when" back tabBar={false} onRefresh={refetch}>
      <Chips value={module} onChange={setModule} options={[{ value: 'all', label: 'Everything' }, { value: 'LEAVE', label: 'Leaves' }, { value: 'FEE', label: 'Fees' }, { value: 'COMPLAINT', label: 'Complaints' }, { value: 'AUTH', label: 'Sign-ins' }]} />
      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading rows={6} h={60} /> : logs.length === 0 ? (
        <Empty icon={Activity} title="Nothing recorded" />
      ) : logs.map((l) => {
        const m = MOD[l.module] || { label: l.module, icon: Activity, tone: 'white' as Tone };
        const day = dayLabel(l.createdAt);
        const head = day !== lastDay;
        lastDay = day;
        return (
          <View key={l.id} style={{ gap: 8 }}>
            {head && <T v="label" c={colors.text3} style={{ marginTop: 6 }}>{day}</T>}
            <Row align="flex-start" gap={12} style={{ backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
              <IconTile icon={m.icon} tone={m.tone} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="small">{l.description}</T>
                <T v="caption" c={colors.text3}>{l.userName || 'System'} · {fmtTime(l.createdAt)}</T>
              </View>
              <Badge label={ACT[l.action] || String(l.action).charAt(0) + String(l.action).slice(1).toLowerCase().replace(/_/g, ' ')} tone={l.action === 'APPROVE' || l.action === 'PAYMENT' ? 'success' : l.action === 'REJECT' || l.action === 'DELETE' ? 'danger' : 'white'} />
            </Row>
          </View>
        );
      })}
    </Screen>
  );
}
