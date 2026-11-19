import { View } from 'react-native';
import { Camera } from 'lucide-react-native';
import { Avatar, Press, Row, T } from '../ui/primitives';
import { Hero, HeroCells, HeroPill, onHero } from '../ui/blocks';
import type { Gradient } from '../ui/theme';

// Gradient header with avatar for the Me / More / Account / Profile screens
export default function ProfileHero({
  name, avatar, line1, line2, pill, cells, gradient = 'brand', onPress, onAvatarPress,
}: { name?: string; avatar?: string | null; line1?: string; line2?: string; pill?: string; cells?: { k: string; v: string }[]; gradient?: Gradient; onPress?: () => void; onAvatarPress?: () => void }) {
  const avatarNode = (
    <View style={{ position: 'relative' }}>
      <View style={{ borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)' }}>
        <Avatar name={name} uri={avatar} size={62} tone="white" />
      </View>
      {onAvatarPress && (
        <View style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', elevation: 3 }}>
          <Camera size={12} color="#246460" />
        </View>
      )}
    </View>
  );

  return (
    <Hero gradient={gradient} onPress={onPress}>
      <Row gap={14}>
        {onAvatarPress ? (
          <Press onPress={onAvatarPress} scaleTo={0.92} accessibilityLabel="Change profile photo">
            {avatarNode}
          </Press>
        ) : (
          avatarNode
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h2" c={onHero.strong} numberOfLines={1}>{name || '—'}</T>
          {line1 ? <T v="small" c={onHero.soft} numberOfLines={1}>{line1}</T> : null}
          {line2 ? <T v="caption" c={onHero.faint} numberOfLines={1}>{line2}</T> : null}
          {pill ? <View style={{ marginTop: 6 }}><HeroPill label={pill} /></View> : null}
        </View>
      </Row>
      {cells && cells.length > 0 ? <HeroCells items={cells} /> : null}
    </Hero>
  );
}
