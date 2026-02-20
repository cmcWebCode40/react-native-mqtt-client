'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const config_plugins_1 = require('@expo/config-plugins');
/**
 * Expo Config Plugin for react-native-mqtt-client
 *
 * Automatically configures the necessary permissions and settings
 * for MQTT client on both Android and iOS.
 */
const withMqttClient = (config) => {
  // Android: Ensure INTERNET and network permissions
  config = (0, config_plugins_1.withAndroidManifest)(
    config,
    (androidConfig) => {
      const manifest = androidConfig.modResults.manifest;
      if (!manifest['uses-permission']) {
        manifest['uses-permission'] = [];
      }
      const permissions = manifest['uses-permission'];
      const requiredPermissions = [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.WAKE_LOCK',
      ];
      requiredPermissions.forEach((permission) => {
        const exists = permissions.some(
          (p) => p.$?.['android:name'] === permission
        );
        if (!exists) {
          permissions.push({
            $: { 'android:name': permission },
          });
        }
      });
      return androidConfig;
    }
  );
  // iOS: Ensure App Transport Security allows arbitrary loads for non-TLS MQTT
  config = (0, config_plugins_1.withInfoPlist)(config, (iosConfig) => {
    if (!iosConfig.modResults.NSAppTransportSecurity) {
      iosConfig.modResults.NSAppTransportSecurity = {};
    }
    // Allow non-TLS connections if needed (tcp:// broker URLs)
    const ats = iosConfig.modResults.NSAppTransportSecurity;
    ats.NSAllowsArbitraryLoads = true;
    return iosConfig;
  });
  return config;
};
exports.default = withMqttClient;
