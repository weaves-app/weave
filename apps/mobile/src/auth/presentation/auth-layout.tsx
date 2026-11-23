import type {ReactNode} from 'react';
import {Image, StyleSheet, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {tokens} from '@weave/design-tokens';

import {
  FLEX_ALIGNMENT,
  FLEX_DIRECTION,
  IMAGE_RESIZE_MODE,
  SAFE_AREA_EDGE,
  SIZE,
} from '../../components/native-options';
import bagHero from '../../../assets/brand/weave-bag-hero.png';
import {Typography, VARIANT} from '../../components/typography';

export const TABLET_MIN_DIMENSION = 600;

export const SPLIT_MIN_WIDTH = 960;

interface AuthLayoutProps {
  readonly children: ReactNode;
}

function AuthArtwork(): React.JSX.Element {
  return (
    <View style={styles.artwork}>
      <Image source={bagHero} style={styles.hero} accessible={false} />
      <SafeAreaView edges={[SAFE_AREA_EDGE.BOTTOM, SAFE_AREA_EDGE.LEFT]} style={styles.story}>
        <Typography variant={VARIANT.TITLE}>Everything, woven together.</Typography>
        <Typography variant={VARIANT.SUPPORTING}>
          {'No more loose threads.\nFrom order to shelf.'}
        </Typography>
      </SafeAreaView>
    </View>
  );
}

export function AuthLayout({children}: AuthLayoutProps): React.JSX.Element {
  const {width, height} = useWindowDimensions();
  const tablet = Math.min(width, height) >= TABLET_MIN_DIMENSION;
  const split = tablet && width > height && width >= SPLIT_MIN_WIDTH;

  return (
    <View style={styles.screen}>
      {split && <AuthArtwork />}
      <SafeAreaView
        testID="login-safe-area"
        edges={[
          SAFE_AREA_EDGE.TOP,
          SAFE_AREA_EDGE.BOTTOM,
          SAFE_AREA_EDGE.LEFT,
          SAFE_AREA_EDGE.RIGHT,
        ]}
        style={[styles.pane, tablet && styles.tabletPane]}
      >
        <View style={[styles.frame, tablet && styles.tabletFrame]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, flexDirection: FLEX_DIRECTION.ROW, backgroundColor: tokens.colors.background},
  pane: {flex: 1, alignItems: FLEX_ALIGNMENT.CENTER, justifyContent: FLEX_ALIGNMENT.START},
  tabletPane: {justifyContent: FLEX_ALIGNMENT.CENTER},
  frame: {flex: 1, width: SIZE.FULL},
  tabletFrame: {maxWidth: 480, maxHeight: 740},
  artwork: {flex: 1, backgroundColor: tokens.colors.brandSurface},
  hero: {flex: 1, width: SIZE.FULL, resizeMode: IMAGE_RESIZE_MODE.CONTAIN},
  story: {padding: tokens.spacing.extraLarge, gap: tokens.spacing.compact},
});
