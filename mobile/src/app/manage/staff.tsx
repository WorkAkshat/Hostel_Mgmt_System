import { useState } from 'react';
import { Contact, MessageCircle, Phone } from 'lucide-react-native';
import { staffApi } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { call, whatsapp } from '../../lib/contact';
import { Avatar, IconButton, Row } from '../../ui/primitives';
import { SearchInput } from '../../ui/form';
import { Empty, ErrorBox, Loading } from '../../ui/feedback';
import { Appear, ListRow, Screen } from '../../ui/layout';

const DEPT: Record<string, { label: string; tone: 'mint' | 'peach' | 'lilac' | 'sun' | 'white' }> = {
  Warden: { label: 'Warden office', tone: 'mint' }, Mess: { label: 'Mess', tone: 'peach' }, Security: { label: 'Security', tone: 'lilac' },
  Cleaning: { label: 'Cleaning', tone: 'sun' }, Maintenance: { label: 'Maintenance', tone: 'white' },
};

// Staff directory — call or WhatsApp in one tap. Add / edit staff on the website.
export default function Staff() {
  const { data, isLoading, error, refetch } = useData(['staff'], staffApi.all);
  const [q, setQ] = useState('');
  const list = asList(data).filter((m: any) => !q.trim() || [m.user?.name, m.designation, m.department, m.phoneNumber].some((v) => v && String(v).toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <Screen title="Staff" subtitle={`${asList(data).length} people`} back tabBar={false} onRefresh={refetch}>
      <SearchInput value={q} onChange={setQ} placeholder="Name, role or phone" />
      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading rows={4} h={70} /> : list.length === 0 ? (
        <Empty icon={Contact} title="No staff found" text="Add guards, cooks and cleaners from the website." />
      ) : list.map((m: any, i: number) => {
        const d = DEPT[m.department] || { label: m.department, tone: 'white' as const };
        return (
          <Appear key={m.id} i={i}>
            <ListRow leading={<Avatar name={m.user?.name} tone={d.tone === 'white' ? 'mint' : d.tone} />} title={m.user?.name} sub={m.designation} meta={[d.label, m.phoneNumber].filter(Boolean).join(' · ')}
              actions={<Row gap={6}><IconButton icon={MessageCircle} label="WhatsApp" tone="success" size={34} onPress={() => whatsapp(m.phoneNumber)} /><IconButton icon={Phone} label="Call" tone="mint" size={34} onPress={() => call(m.phoneNumber)} /></Row>} />
          </Appear>
        );
      })}
    </Screen>
  );
}
