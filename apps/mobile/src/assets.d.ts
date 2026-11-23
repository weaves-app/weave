declare module '*.png' {
  import type {ImageSourcePropType} from 'react-native';
  const source: ImageSourcePropType;

  // Metro exposes static image assets as default imports.

  export default source;
}
