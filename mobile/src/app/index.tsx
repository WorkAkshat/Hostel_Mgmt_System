import { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');
const PURPLE = '#7F56D9';

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Logo animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  // Ring pulse animations (5 rings)
  const ringScales = useRef([...Array(5)].map(() => new Animated.Value(0.6))).current;
  const ringOpacities = useRef([...Array(5)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Animate rings in with staggered delay
    const ringAnimations = ringScales.map((scale, i) =>
      Animated.parallel([
        Animated.timing(ringOpacities[i], {
          toValue: 1 - i * 0.18,
          duration: 600,
          delay: i * 120,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 30,
          friction: 6,
          delay: i * 120,
          useNativeDriver: true,
        }),
      ])
    );

    // Logo entrance
    const logoEntrance = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }),
    ]);

    // Subtitle fade in
    const subtitleFade = Animated.timing(subtitleOpacity, {
      toValue: 1,
      duration: 400,
      delay: 600,
      useNativeDriver: true,
    });

    // Loading dots
    const dotsFade = Animated.timing(dotsOpacity, {
      toValue: 1,
      duration: 400,
      delay: 900,
      useNativeDriver: true,
    });

    Animated.parallel([...ringAnimations, logoEntrance, subtitleFade, dotsFade]).start();

    // Continuous ring pulse after entrance
    const pulseAnimations = ringScales.map((scale, i) => {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.04,
            duration: 1800 + i * 200,
            delay: 1200 + i * 150,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1800 + i * 200,
            useNativeDriver: true,
          }),
        ])
      );
      return pulse;
    });

    setTimeout(() => {
      pulseAnimations.forEach((p) => p.start());
    }, 1200);
  }, []);

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
          try {
            const LocalAuthentication = await import('expo-local-authentication');
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (hasHardware && isEnrolled) {
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to access HP PG',
                cancelLabel: 'Use Password',
              });
              if (result.success) {
                router.replace('/dashboard');
                return;
              }
            }
          } catch {
            // Biometrics not available — fall through to normal flow
          }
        }
      } catch {
        // SecureStore error — fall through
      }

      router.replace(user ? '/dashboard' : '/login');
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, loading]);

  const ringSizes = [
    width * 1.6,
    width * 1.3,
    width * 1.05,
    width * 0.78,
    width * 0.52,
  ];

  return (
    <View style={styles.container}>
      {/* Animated concentric rings */}
      {ringSizes.map((size, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: ringOpacities[i],
              transform: [{ scale: ringScales[i] }],
            },
          ]}
        />
      ))}

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.logoIconBox}>
          <Text style={styles.logoFlower}>✿</Text>
          <Text style={styles.logoIconText}>HP</Text>
        </View>
        <Animated.Text style={[styles.logoTitle, { opacity: logoOpacity }]}>
          Hari Pushp PG
        </Animated.Text>
        <Animated.Text style={[styles.logoSubtitle, { opacity: subtitleOpacity }]}>
          Girls Hostel Management
        </Animated.Text>
      </Animated.View>

      {/* Loading dots */}
      <Animated.View style={[styles.loadingDots, { opacity: dotsOpacity }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.dot} />
        ))}
      </Animated.View>

      {/* Version tag */}
      <Animated.Text style={[styles.versionTag, { opacity: subtitleOpacity }]}>
        v2.0 · Phase II
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'transparent',
  },
  logoContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIconText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  logoFlower: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: -4,
  },
  logoTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  loadingDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 100,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  versionTag: {
    position: 'absolute',
    bottom: 50,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
    letterSpacing: 1,
  },
});
