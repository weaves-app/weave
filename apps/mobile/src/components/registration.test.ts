import {AppRegistry} from 'react-native';
import '../../index';

test('S25 registers the application name expected by Android and iOS', () => {
  expect(AppRegistry.getAppKeys()).toContain('Weave');
});
