module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Note: Worklets plugin is required for react-native-graph
      // If you see version mismatch errors, you need to rebuild native code:
      // npx expo prebuild --clean && rebuild your app
      ['react-native-worklets/plugin', {}, 'worklets-plugin'],
      ['react-native-reanimated/plugin', {}, 'reanimated-plugin'],
    ],
  };
};

