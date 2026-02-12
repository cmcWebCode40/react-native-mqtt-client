import {
  ConfigPlugin,
  withAndroidManifest,
  withInfoPlist,
} from '@expo/config-plugins';

/**
 * Expo Config Plugin for react-native-mqtt-client
 *
 * Automatically configures the necessary permissions and settings
 * for MQTT client on both Android and iOS.
 */
const withMqttClient: ConfigPlugin = (config) => {
  // Android: Ensure INTERNET and network permissions
  config = withAndroidManifest(config, (androidConfig) => {
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
        (p: any) => p.$?.['android:name'] === permission
      );
      if (!exists) {
        permissions.push({
          $: { 'android:name': permission },
        } as any);
      }
    });

    return androidConfig;
  });

  // iOS: Ensure App Transport Security allows arbitrary loads for non-TLS MQTT
  config = withInfoPlist(config, (iosConfig) => {
    if (!iosConfig.modResults.NSAppTransportSecurity) {
      iosConfig.modResults.NSAppTransportSecurity = {};
    }
    // Allow non-TLS connections if needed (tcp:// broker URLs)
    iosConfig.modResults.NSAppTransportSecurity.NSAllowsArbitraryLoads = true;

    return iosConfig;
  });

  return config;
};

export default withMqttClient;
