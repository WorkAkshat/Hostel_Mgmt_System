import { View } from 'react-native';
import { BellOff, CheckCheck } from 'lucide-react-native';
import { useAuth } from '../lib/auth';
import { useInbox } from '../features/inbox';
import { colors } from '../ui/theme';
import { Button, Card, IconTile, Row, T } from '../ui/primitives';
import { Empty, Loading } from '../ui/feedback';
import { Appear, Screen } from '../ui/layout';
import { go } from '../lib/nav';

export default function Notifications() {
  const { user } = useAuth();
  const { items, read, unread, markRead, refetch, isLoading } = useInbox(user);

  return (
    <Screen title="Notifications" subtitle={unread ? `${unread} new` : 'You are all caught up'} back tabBar={false} onRefresh={refetch}
      right={unread ? <Button title="Read all" icon={CheckCheck} kind="secondary" small onPress={() => markRead(items.map((i) => i.id))} /> : undefined}
    >
      {isLoading ? <Loading /> : items.length === 0 ? (
        <Empty icon={BellOff} title="No notifications" text="Leave decisions, bills, complaint updates and notices will show here." />
      ) : items.map((n, i) => {
        const isNew = !read.includes(n.id);
        return (
          <Appear key={n.id} i={i}>
            <Card onPress={() => { markRead([n.id]); go(n.href as any); }} style={[{ flexDirection: 'row', gap: 12 }, isNew && { borderColor: colors.sun300, backgroundColor: colors.cream100 }]}>
              <IconTile icon={n.icon} tone={n.tone} />
              <View style={{ flex: 1, gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="title" style={{ flex: 1 }} numberOfLines={1}>{n.title}</T>
                  <T v="caption" c={colors.text3}>{n.time}</T>
                </Row>
                <T v="small" c={colors.text2} numberOfLines={3}>{n.message}</T>
              </View>
              {isNew && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, marginTop: 6 }} />}
            </Card>
          </Appear>
        );
      })}
    </Screen>
  );
}
