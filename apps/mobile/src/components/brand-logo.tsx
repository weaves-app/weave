import {Image, StyleSheet, View} from 'react-native';

import logo from '../../assets/brand/weave-horizontal.png';

// The supplied lockup is 702.086 × 224 units, with 48-unit bands.
// Padding is measured from the rendered width so the clear zone scales with the mark.
export interface BrandLogoProps {
  readonly width?: number;
  readonly alignment?: 'start' | 'center';
}

export function BrandLogo({width = 208, alignment = 'center'}: BrandLogoProps): React.JSX.Element {
  const band = (width * 48) / 702.086;

  return (
    <View style={[{padding: band, alignSelf: alignment === 'start' ? 'flex-start' : 'center'}]}>
      <Image
        source={logo}
        accessibilityLabel="Weave"
        accessibilityRole="image"
        style={[styles.logo, {width, height: (width * 638) / 2000}]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {resizeMode: 'contain'},
});
