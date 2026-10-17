// The native coordinator owns iOS initialization and signed identity calls.
module.exports = {
  dependencies: {
    'react-native-onesignal': {platforms: {ios: null}},
  },
};
