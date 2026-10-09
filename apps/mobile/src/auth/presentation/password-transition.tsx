import {useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useAnimatedValue,
  View,
} from 'react-native';

import {tokens} from '@weave/design-tokens';

import {FormField} from '../../components/form-field';

interface PasswordTransitionProps {
  readonly visible: boolean;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly disabled: boolean;
  readonly action: ReactNode;
}

export function PasswordTransition({
  visible,
  value,
  onChangeText,
  disabled,
  action,
}: PasswordTransitionProps): React.JSX.Element {
  const progress = useAnimatedValue(visible ? 1 : 0);
  const [height, setHeight] = useState(0);
  const [actionHeight, setActionHeight] = useState(0);
  const reduceMotion = useRef(true);
  const target = useRef(visible ? 1 : 0);

  useEffect(() => {
    let mounted = true;
    let receivedEvent = false;

    function applyPreference(enabled: boolean): void {
      reduceMotion.current = enabled;

      if (enabled) {
        progress.stopAnimation();
        progress.setValue(target.current);
      }
    }

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      receivedEvent = true;
      applyPreference(enabled);
    });

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted && !receivedEvent) applyPreference(enabled);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [progress]);
  useEffect(() => {
    target.current = visible ? 1 : 0;

    if (reduceMotion.current || height === 0) {
      progress.setValue(visible ? 1 : 0);

      return;
    }

    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: tokens.motion.formTransitionMs,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    });

    animation.start();

    return () => animation.stop();
  }, [height, progress, visible]);

  return (
    <View style={{minHeight: height + actionHeight}}>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
        style={[
          styles.clip,
          {height: progress.interpolate({inputRange: [0, 1], outputRange: [0, height]})},
        ]}
      >
        <Animated.View
          style={[
            styles.password,
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-tokens.spacing.small, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
            style={styles.measure}
          >
            <FormField
              label="Password"
              value={value}
              onChangeText={onChangeText}
              placeholder="Enter your password"
              autoComplete="current-password"
              secret
              disabled={disabled || !visible}
            />
          </View>
        </Animated.View>
      </Animated.View>
      <View onLayout={(event) => setActionHeight(event.nativeEvent.layout.height)}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {overflow: 'hidden'},
  password: {position: 'absolute', top: 0, left: 0, right: 0},
  measure: {paddingBottom: tokens.spacing.large},
});
