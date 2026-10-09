import type {ReactNode} from 'react';
import {Image, StyleSheet, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {tokens} from '@weave/design-tokens';

import bagHero from '../../../assets/brand/weave-bag-hero.png';
import {Typography} from '../../components/typography';

interface AuthLayoutProps {
  readonly children: ReactNode;
}

function AuthArtwork(): React.JSX.Element {
  return (
    <View style={styles.artwork}>
      <Image source={bagHero} style={styles.hero} accessible={false} />
      <SafeAreaView edges={['bottom', 'left']} style={styles.story}>
        <Typography variant="title">Everything, woven together.</Typography>
        <Typography variant="supporting">
          {'No more loose threads.\nFrom order to shelf.'}
        </Typography>
      </SafeAreaView>
    </View>
  );
}

export function AuthLayout({children}: AuthLayoutProps): React.JSX.Element {
  const {width, height} = useWindowDimensions();
  const tablet = Math.min(width, height) >= 600;
  const split = tablet && width > height && width >= 960;

  return (
    <View style={styles.screen}>
      {split && <AuthArtwork />}
      <SafeAreaView
        testID="login-safe-area"
        edges={['top', 'bottom', 'left', 'right']}
        style={[styles.pane, tablet && styles.tabletPane]}
      >
        <View style={[styles.frame, tablet && styles.tabletFrame]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, flexDirection: 'row', backgroundColor: tokens.colors.background},
  pane: {flex: 1, alignItems: 'center', justifyContent: 'flex-start'},
  tabletPane: {justifyContent: 'center'},
  frame: {flex: 1, width: '100%'},
  tabletFrame: {maxWidth: 480, maxHeight: 740},
  artwork: {flex: 1, backgroundColor: tokens.colors.brandSurface},
  hero: {flex: 1, width: '100%', resizeMode: 'contain'},
  story: {padding: tokens.spacing.extraLarge, gap: tokens.spacing.compact},
});
