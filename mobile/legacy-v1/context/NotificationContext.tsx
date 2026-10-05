import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import {
  Bell,
  X,
  CheckCircle,
  Info,
  AlertTriangle,
  Vote,
  ChevronRight,
  FileText,
  ClipboardCheck,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotificationType = 'NOTICE' | 'POLL' | 'LEAVE' | 'COMPLAINT' | 'INFO';

export interface NotificationBannerData {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  actionLabel?: string;
  actionRoute?: string;
  actionTab?: string;
  timestamp: Date;
}

interface NotificationContextType {
  showBanner: (
    title: string,
    body: string,
    type?: NotificationType,
    options?: { actionLabel?: string; actionRoute?: string; actionTab?: string }
  ) => void;
  unreadCount: number;
  clearUnread: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ─── Theme per type ──────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  {
    accentColor: string;
    bgFrom: string;
    bgTo: string;
    label: string;
    defaultAction: string;
    defaultTab: string;
  }
> = {
  NOTICE: {
    accentColor: '#F04438',
    bgFrom: '#1A0A0A',
    bgTo: '#1D1010',
    label: 'Notice Board',
    defaultAction: 'View Notice',
    defaultTab: 'Notices',
  },
  POLL: {
    accentColor: '#7F56D9',
    bgFrom: '#0E0A1A',
    bgTo: '#140D1D',
    label: 'New Poll',
    defaultAction: 'Vote Now',
    defaultTab: 'Notices',
  },
  LEAVE: {
    accentColor: '#12B76A',
    bgFrom: '#071812',
    bgTo: '#091A14',
    label: 'Leave Update',
    defaultAction: 'View Status',
    defaultTab: 'Leaves',
  },
  COMPLAINT: {
    accentColor: '#F79009',
    bgFrom: '#1A1200',
    bgTo: '#1D1400',
    label: 'Complaint',
    defaultAction: 'View',
    defaultTab: 'Complaints',
  },
  INFO: {
    accentColor: '#0BA5EC',
    bgFrom: '#000D1A',
    bgTo: '#00101F',
    label: 'Hostel Alert',
    defaultAction: 'View',
    defaultTab: 'Home',
  },
};

// ─── Icon renderer ───────────────────────────────────────────────────────────

const NotifIcon = ({ type, size = 22 }: { type: NotificationType; size?: number }) => {
  const color = TYPE_CONFIG[type].accentColor;
  switch (type) {
    case 'POLL':      return <Vote size={size} color={color} />;
    case 'NOTICE':    return <FileText size={size} color={color} />;
    case 'LEAVE':     return <ClipboardCheck size={size} color={color} />;
    case 'COMPLAINT': return <AlertTriangle size={size} color={color} />;
    default:          return <Info size={size} color={color} />;
  }
};

// ─── Banner Component ────────────────────────────────────────────────────────

interface BannerProps {
  notification: NotificationBannerData;
  onDismiss: (id: string) => void;
  onAction: (notification: NotificationBannerData) => void;
  index: number; // stacking offset
}

const NotificationBanner: React.FC<BannerProps> = ({ notification, onDismiss, onAction, index }) => {
  const translateY = useRef(new Animated.Value(-160)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.94)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cfg = TYPE_CONFIG[notification.type];

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -180, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: 220, useNativeDriver: true }),
      Animated.timing(scale,      { toValue: 0.88, duration: 250, useNativeDriver: true }),
    ]).start(() => onDismiss(notification.id));
  }, [notification.id, onDismiss]);

  // Pan gesture — swipe left/right to dismiss, up to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 || gs.dy < -8,
      onPanResponderMove: (_, gs) => {
        translateX.setValue(gs.dx);
        if (gs.dy < 0) translateY.setValue(gs.dy * 0.5);
      },
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > 80 || gs.dy < -50) {
          // Fling away
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: gs.dx > 0 ? width + 60 : -(width + 60),
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => onDismiss(notification.id));
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  // Slide in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();

    // Auto dismiss after 6s
    timerRef.current = setTimeout(dismiss, 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Stack offset — first notification on top, others slightly below and scaled
  const stackOffset  = index * 8;
  const stackScale   = 1 - index * 0.04;

  const elapsed = (() => {
    const diff = (Date.now() - notification.timestamp.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  })();

  return (
    <Animated.View
      style={[
        styles.bannerOuter,
        {
          top: (Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 10) + stackOffset,
          opacity,
          transform: [
            { translateY },
            { translateX },
            { scale: Animated.multiply(scale, new Animated.Value(stackScale)) },
          ],
          zIndex: 9999 - index,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: cfg.accentColor }]} />

      <View style={[styles.bannerCard, { backgroundColor: cfg.bgFrom }]}>
        {/* Top row */}
        <View style={styles.topRow}>
          {/* App label chip */}
          <View style={[styles.appChip, { backgroundColor: cfg.accentColor + '22' }]}>
            <Bell size={10} color={cfg.accentColor} style={{ marginRight: 4 }} />
            <Text style={[styles.appChipText, { color: cfg.accentColor }]}>
              Hari Pushp PG · {cfg.label}
            </Text>
          </View>
          <Text style={styles.timeText}>{elapsed}</Text>
          <TouchableOpacity onPress={dismiss} style={styles.closeTap} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={14} color="rgba(255,255,255,0.45)" />
          </TouchableOpacity>
        </View>

        {/* Content row */}
        <View style={styles.contentRow}>
          {/* Icon */}
          <View style={[styles.iconBox, { backgroundColor: cfg.accentColor + '1A' }]}>
            <NotifIcon type={notification.type} size={22} />
          </View>

          {/* Text */}
          <View style={styles.textBlock}>
            <Text style={styles.bannerTitle} numberOfLines={1}>{notification.title}</Text>
            <Text style={styles.bannerBody}  numberOfLines={2}>{notification.body}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => onAction(notification)}
            style={[styles.actionBtn, { backgroundColor: cfg.accentColor }]}
            activeOpacity={0.82}
          >
            <Text style={styles.actionBtnText}>
              {notification.actionLabel ?? cfg.defaultAction}
            </Text>
            <ChevronRight size={13} color="#fff" style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={dismiss} style={styles.dismissBtn} activeOpacity={0.7}>
            <Text style={styles.dismissBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<NotificationBannerData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const showBanner = useCallback(
    (
      title: string,
      body: string,
      type: NotificationType = 'INFO',
      options?: { actionLabel?: string; actionRoute?: string; actionTab?: string }
    ) => {
      const cfg = TYPE_CONFIG[type];
      const newNotif: NotificationBannerData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title,
        body,
        type,
        actionLabel: options?.actionLabel ?? cfg.defaultAction,
        actionRoute: options?.actionRoute,
        actionTab:   options?.actionTab   ?? cfg.defaultTab,
        timestamp:   new Date(),
      };
      // Keep max 3 in view
      setQueue(prev => [newNotif, ...prev].slice(0, 3));
      setUnreadCount(c => c + 1);
    },
    []
  );

  const handleDismiss = useCallback((id: string) => {
    setQueue(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleAction = useCallback(
    (notification: NotificationBannerData) => {
      handleDismiss(notification.id);
      if (notification.actionRoute) {
        router.push(notification.actionRoute as any);
      } else if (notification.actionTab) {
        // Navigate to dashboard and signal which tab to open
        router.push({
          pathname: '/dashboard',
          params: { tab: notification.actionTab },
        } as any);
      }
    },
    [handleDismiss, router]
  );

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  // Listen for Expo foreground notifications
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(notification => {
      const { title, body, data } = notification.request.content;
      if (title && body) {
        const type = (data?.type as NotificationType) || 'INFO';
        showBanner(title, body, type);
      }
    });
    return () => sub.remove();
  }, [showBanner]);

  return (
    <NotificationContext.Provider value={{ showBanner, unreadCount, clearUnread }}>
      {children}
      {/* Render notification banners on top of everything */}
      {queue.map((notif, index) => (
        <NotificationBanner
          key={notif.id}
          notification={notif}
          onDismiss={handleDismiss}
          onAction={handleAction}
          index={index}
        />
      ))}
    </NotificationContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useNotification = (): NotificationContextType => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bannerOuter: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'stretch',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  accentBar: {
    height: 3,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  bannerCard: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginRight: 'auto',
  },
  appChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginRight: 10,
    fontWeight: '500',
  },
  closeTap: {
    padding: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: 0.1,
  },
  bannerBody: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  dismissBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
});
