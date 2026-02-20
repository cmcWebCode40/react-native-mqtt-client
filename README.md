# @ecodevstack/react-native-mqtt-client

A native MQTT client for React Native (Android & iOS) built with the **New Architecture** (Turbo Modules + Codegen). Connect, publish, subscribe, and receive real-time messages from any MQTT broker.

## Features

- 🔗 **Connect / Disconnect** — TCP, SSL/TLS, WebSocket, and Secure WebSocket
- 📤 **Publish** messages with configurable QoS (0, 1, 2)
- 📥 **Subscribe / Unsubscribe** to topics
- 📩 **Real-time events** — receive messages, connection status changes, and errors via listeners
- ⚡ **New Architecture** — Turbo Module with Codegen (React Native 0.76+)
- 📱 **Expo** compatible via config plugin
- 🤖 **Android** — Eclipse Paho MQTT
- 🍎 **iOS** — MQTT-Client-Framework

## Requirements

- React Native **0.76+** (New Architecture / Turbo Modules)
- iOS **13.0+**
- Android **minSdkVersion 21+**

## Installation

```sh
npm install @ecodevstack/react-native-mqtt-client
# or
yarn add @ecodevstack/react-native-mqtt-client
```

### iOS

```sh
cd ios && pod install
```

### Expo

Add the plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": ["@ecodevstack/react-native-mqtt-client"]
  }
}
```

Then rebuild:

```sh
npx expo prebuild
```

## Quick Start

```ts
import { Mqtt } from '@ecodevstack/react-native-mqtt-client';

// 1. Listen for incoming messages
const sub = Mqtt.addListener('onMqttMessageReceived', (data) => {
  console.log(`[${data.topic}]: ${data.message}`);
});

// 2. Connect to a broker
await Mqtt.connect('tcp://broker.hivemq.com:1883', '', '');

// 3. Subscribe to a topic
await Mqtt.subscribe('my/topic');

// 4. Publish a message
await Mqtt.publish('my/topic', 'Hello MQTT!');

// 5. Clean up when done
sub.remove();
await Mqtt.disconnect();
```

## Usage

### Import

```ts
import { Mqtt } from '@ecodevstack/react-native-mqtt-client';
// Optional: import types
import type { MqttEvent, MqttMessage } from '@ecodevstack/react-native-mqtt-client';
```

### Connect to a Broker

```ts
try {
  await Mqtt.connect('tcp://broker.hivemq.com:1883', 'myUser', 'myPass');
  console.log('Connected!');
} catch (error) {
  console.error('Connection failed:', error);
}
```

**Supported URL schemes:**

| Scheme | Description | Default Port |
| --- | --- | --- |
| `tcp://` | Plain MQTT | 1883 |
| `ssl://` | MQTT over TLS | 8883 |
| `ws://` | MQTT over WebSocket | 80 |
| `wss://` | MQTT over Secure WebSocket | 443 |

> Pass empty strings (`''`) for `username` and `password` to connect anonymously.

### Subscribe to a Topic

```ts
await Mqtt.subscribe('sensors/temperature', 1); // QoS 0, 1, or 2
```

### Publish a Message

```ts
// Plain text
await Mqtt.publish('sensors/temperature', '22.5', 1);

// JSON payload
await Mqtt.publish('devices/status', JSON.stringify({ online: true }), 1);
```

### Unsubscribe from a Topic

```ts
await Mqtt.unsubscribe('sensors/temperature');
```

### Disconnect

```ts
await Mqtt.disconnect();
```

### Listen for Events

Register listeners to react to connection changes, incoming messages, and errors. Always clean up listeners when your component unmounts.

```tsx
import { useEffect } from 'react';
import { Mqtt } from '@ecodevstack/react-native-mqtt-client';
import type { MqttMessage } from '@ecodevstack/react-native-mqtt-client';

useEffect(() => {
  const connSub = Mqtt.addListener('onMqttConnected', (data) => {
    console.log('Connected:', data.message);
  });

  const disconnSub = Mqtt.addListener('onMqttDisconnected', (data) => {
    console.log('Disconnected:', data.message);
  });

  const msgSub = Mqtt.addListener('onMqttMessageReceived', (data: MqttMessage) => {
    console.log(`[${data.topic}]: ${data.message}`);
  });

  const errSub = Mqtt.addListener('onMqttError', (data) => {
    console.error('Error:', data.error);
  });

  const subSub = Mqtt.addListener('onMqttSubscribed', (data) => {
    console.log('Subscribed to:', data.topic);
  });

  const unsubSub = Mqtt.addListener('onMqttUnsubscribed', (data) => {
    console.log('Unsubscribed from:', data.topic);
  });

  return () => {
    connSub.remove();
    disconnSub.remove();
    msgSub.remove();
    errSub.remove();
    subSub.remove();
    unsubSub.remove();
  };
}, []);
```

## API Reference

### `Mqtt.connect(brokerUrl, username, password)`

Connects to an MQTT broker.

| Parameter | Type | Description |
| --- | --- | --- |
| `brokerUrl` | `string` | Broker URL (e.g. `tcp://broker.hivemq.com:1883`) |
| `username` | `string` | Username for authentication (empty string for anonymous) |
| `password` | `string` | Password for authentication (empty string for anonymous) |

**Returns:** `Promise<string>` — resolves with a success message, rejects on failure.

---

### `Mqtt.disconnect()`

Disconnects from the currently connected broker.

**Returns:** `Promise<string>`

---

### `Mqtt.subscribe(topic, qos?)`

Subscribes to an MQTT topic.

| Parameter | Type | Description |
| --- | --- | --- |
| `topic` | `string` | The MQTT topic to subscribe to |
| `qos` | `number` | QoS level: `0`, `1`, or `2`. Default: `1` |

**Returns:** `Promise<string>`

---

### `Mqtt.unsubscribe(topic)`

Unsubscribes from an MQTT topic.

| Parameter | Type | Description |
| --- | --- | --- |
| `topic` | `string` | The MQTT topic to unsubscribe from |

**Returns:** `Promise<string>`

---

### `Mqtt.publish(topic, message, qos?)`

Publishes a message to an MQTT topic.

| Parameter | Type | Description |
| --- | --- | --- |
| `topic` | `string` | The MQTT topic to publish to |
| `message` | `string` | The message payload |
| `qos` | `number` | QoS level: `0`, `1`, or `2`. Default: `1` |

**Returns:** `Promise<string>`

---

### `Mqtt.addListener(eventName, callback)`

Registers a listener for MQTT events. Returns an `EmitterSubscription` — call `.remove()` to unregister.

| Event Name | Callback Payload | Description |
| --- | --- | --- |
| `onMqttConnected` | `{ message: string }` | Fired when connected to the broker |
| `onMqttDisconnected` | `{ message: string }` | Fired when disconnected |
| `onMqttMessageReceived` | `{ topic: string, message: string }` | Fired when a message is received |
| `onMqttError` | `{ error: string }` | Fired on connection or protocol error |
| `onMqttSubscribed` | `{ topic: string }` | Fired after successful subscribe |
| `onMqttUnsubscribed` | `{ topic: string }` | Fired after successful unsubscribe |

**Returns:** `EmitterSubscription`

## Types

```ts
// Available event names
type MqttEvent =
  | 'onMqttConnected'
  | 'onMqttDisconnected'
  | 'onMqttMessageReceived'
  | 'onMqttError'
  | 'onMqttSubscribed'
  | 'onMqttUnsubscribed';

// Payload shape for onMqttMessageReceived
interface MqttMessage {
  topic: string;
  message: string;
}
```

## Full Example

A complete React Native screen with connect/disconnect, subscribe/unsubscribe, publish, and a real-time log viewer:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Text, View, Button, Alert, SafeAreaView, ScrollView } from 'react-native';
import { Mqtt, type MqttMessage } from '@ecodevstack/react-native-mqtt-client';

export default function MqttDemo() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((log: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${ts}] ${log}`, ...prev].slice(0, 50));
  }, []);

  // Register all MQTT event listeners
  useEffect(() => {
    const subs = [
      Mqtt.addListener('onMqttConnected', (d) => {
        addLog(`✅ Connected: ${d.message}`);
        setIsConnected(true);
      }),
      Mqtt.addListener('onMqttDisconnected', (d) => {
        addLog(`🔌 Disconnected: ${d.message}`);
        setIsConnected(false);
      }),
      Mqtt.addListener('onMqttMessageReceived', (d: MqttMessage) => {
        addLog(`📩 [${d.topic}]: ${d.message}`);
      }),
      Mqtt.addListener('onMqttError', (d) => {
        addLog(`❌ Error: ${d.error}`);
      }),
      Mqtt.addListener('onMqttSubscribed', (d) => {
        addLog(`📌 Subscribed: ${d.topic}`);
      }),
      Mqtt.addListener('onMqttUnsubscribed', (d) => {
        addLog(`📌 Unsubscribed: ${d.topic}`);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [addLog]);

  const handleConnect = async () => {
    try {
      await Mqtt.connect('tcp://broker.hivemq.com:1883', '', '');
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
  };

  const handleSubscribe = async () => {
    try {
      await Mqtt.subscribe('test/react-native');
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
  };

  const handlePublish = async () => {
    try {
      await Mqtt.publish('test/react-native', JSON.stringify({ hello: 'world' }));
      addLog('📤 Published message');
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>
        MQTT Client — {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </Text>

      <View style={{ gap: 8, marginBottom: 16 }}>
        <Button title="Connect" onPress={handleConnect} disabled={isConnected} />
        <Button title="Subscribe" onPress={handleSubscribe} disabled={!isConnected} />
        <Button title="Publish" onPress={handlePublish} disabled={!isConnected} />
        <Button title="Disconnect" onPress={() => Mqtt.disconnect()} disabled={!isConnected} />
      </View>

      <ScrollView style={{ backgroundColor: '#1e1e1e', borderRadius: 8, padding: 12, flex: 1 }}>
        {logs.map((log, i) => (
          <Text key={i} style={{ color: '#d4d4d4', fontFamily: 'monospace', fontSize: 12, marginBottom: 4 }}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
```

> 💡 See the [`example/`](./example) directory for a more feature-rich demo app with editable broker credentials, topic management, JSON/plain-text message format toggle, and scrollable logs.

## Troubleshooting

### iOS build fails with pod errors

Make sure your minimum iOS deployment target is **13.0+** and run:

```sh
cd ios && pod install --repo-update
```

### Events not received on iOS (New Architecture)

This library requires React Native **0.76+** with the New Architecture enabled. The iOS implementation uses TurboModule event emission which is only available under the new architecture runtime.

### Connection timeout

- Verify the broker URL, port, and credentials are correct.
- Check that your device/emulator has network access to the broker.
- For SSL/TLS connections, ensure the broker's certificate is valid.

### `Mqtt.connect` rejects immediately

- Ensure the broker URL includes the scheme (e.g. `tcp://`, `ssl://`).
- Confirm the port number is correct for the chosen scheme.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
