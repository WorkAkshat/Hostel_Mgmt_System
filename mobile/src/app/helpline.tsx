import { StyleSheet, View } from 'react-native';
import { Phone, ShieldAlert, ShieldCheck, HeartHandshake, MapPin } from 'lucide-react-native';
import { call } from '../lib/contact';
import { colors } from '../ui/theme';
import { Card, Divider, IconButton, Row, T } from '../ui/primitives';
import { Appear, Screen, Section } from '../ui/layout';

const CONTACTS = [
  { title: 'Chief Warden', phone: '9460191558', sub: 'Available for student support & queries' },
  { title: 'Hostel Caretaker', phone: '9001236013', sub: 'Room maintenance & day-to-day help' },
  { title: 'Emergency / Police Helpline', phone: '112', sub: 'National emergency assistance 24x7' },
];

const RULES = [
  'Night roll call attendance at 9:30 PM is mandatory for every resident.',
  'Hostel main gate closes strictly at 10:00 PM.',
  'Male visitors are restricted to the ground floor reception area only.',
  'Sub-meter electricity is billed from 10th to 10th of each calendar month.',
  'Leave requests must be applied through the app at least 24 hours prior to travel.',
  'Maintain silence in study hours and cleanliness in mess and common areas.',
];

export default function HelplineScreen() {
  return (
    <Screen title="Helpline & Rules" subtitle="24x7 support & hostel guidelines" back tabBar={false}>
      <Appear>
        <Card tone="mint" style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.mint200, alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={22} color={colors.brand700} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="title" w="bold">Hari Pushp Tower (Girls PG)</T>
            <T v="caption" c={colors.text2}>Sector 4, Jaipur, Rajasthan</T>
          </View>
        </Card>
      </Appear>

      <Appear i={1}>
        <Section title="24x7 Contacts & Helpline">
          <Card padded={false}>
            {CONTACTS.map((c, i) => (
              <View key={c.phone}>
                {i > 0 && <Divider />}
                <Row style={{ padding: 14, alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <T v="title" w="bold">{c.title}</T>
                    <T v="small" c={colors.brand700} w="semibold">{c.phone}</T>
                    <T v="caption" c={colors.text3} style={{ marginTop: 2 }}>{c.sub}</T>
                  </View>
                  <IconButton
                    icon={Phone}
                    label={`Call ${c.title}`}
                    tone="mint"
                    size={42}
                    onPress={() => call(c.phone)}
                  />
                </Row>
              </View>
            ))}
          </Card>
        </Section>
      </Appear>

      <Appear i={2}>
        <Section title="Hostel Guidelines & Rules">
          <Card style={{ gap: 10 }}>
            {RULES.map((r, idx) => (
              <Row key={idx} align="flex-start" gap={10}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <T v="caption" w="bold" c={colors.brand700}>{idx + 1}</T>
                </View>
                <T c={colors.text2} style={{ flex: 1, lineHeight: 20 }}>{r}</T>
              </Row>
            ))}
          </Card>
        </Section>
      </Appear>
    </Screen>
  );
}
