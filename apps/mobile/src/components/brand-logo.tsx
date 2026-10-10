import {Image, StyleSheet, View} from 'react-native';

import {ACCESSIBILITY_ROLE, FLEX_ALIGNMENT, IMAGE_RESIZE_MODE} from './native-options';
import logo from '../../assets/brand/weave-horizontal.png';

export const ALIGNMENT = {
  START: 'start',
  CENTER: FLEX_ALIGNMENT.CENTER,
} as const;

// The supplied lockup is 702.086 × 224 units, with 48-unit bands.
// Padding is measured from the rendered width so the clear zone scales with the mark.
export interface BrandLogoProps {
  readonly width?: number;
  readonly alignment?: (typeof ALIGNMENT)[keyof typeof ALIGNMENT];
}

export function BrandLogo({
  width = 208,
  alignment = ALIGNMENT.CENTER,
}: BrandLogoProps): React.JSX.Element {
  const band = (width * 48) / 702.086;

  return (
    <View
      style={[
        {
          padding: band,
          alignSelf: alignment === ALIGNMENT.START ? FLEX_ALIGNMENT.START : ALIGNMENT.CENTER,
        },
      ]}
    >
      <Image
        source={logo}
        accessibilityLabel="Weave"
        accessibilityRole={ACCESSIBILITY_ROLE.IMAGE}
        style={[styles.logo, {width, height: (width * 638) / 2000}]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {resizeMode: IMAGE_RESIZE_MODE.CONTAIN},
});
