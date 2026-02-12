# react-native-mqtt-client

A native MQTT client for React Native (Android & iOS) built with the **New Architecture** (Turbo Modules + Codegen). Supports MQTT connection, disconnection, publish, subscribe, unsubscribe, and real-time message events.

## Features

- 🔗 **Connect / Disconnect** to any MQTT broker (TCP, SSL, WS, WSS)
- 📤 **Publish** messages to topics with configurable QoS
- 📥 **Subscribe / Unsubscribe** to topics
- 📩 **Real-time message events** via native event emitter
- ⚡ **New Architecture** — Turbo Module with Codegen
- 📱 **Expo** compatible via config plugin
- 🤖 **Android** — Eclipse Paho MQTT
- 🍎 **iOS** — MQTTClient (MQTT-Client-Framework)

## Installation

```sh
npm install react-native-mqtt-client
# or
yarn add react-native-mqtt-client
```

### iOS

```sh
cd ios && pod install
```

### Expo

If you're using Expo, add the plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": ["react-native-mqtt-client"]
  }
}
```

Then rebuild with:

```sh
npx expo prebuild
```

## Usage

### Import

```ts
import { Mqtt } from 'react-native-mqtt-client';
```

### Connect to a Broker

```ts
try {
  await Mqtt.connect('tcp://broker.hivemq.com:1883', '', '');
  console.log('Connected!');
} catch (error) {
  console.error('Connection failed:', error);
}
```

**Supported URL schemes:**
- `tcp://host:port` — Plain MQTT
- `ssl://host:port` — MQTT over TLS
- `ws://host:port` — MQTT over WebSocket
- `wss://host:port` — MQTT over Secure WebSocket

### Subscribe to a Topic

```ts
try {
  await Mqtt.subscribe('my/topic', 1); // QoS 0, 1, or 2
  console.log('Subscribed!');
} catch (error) {
  console.error('Subscribe failed:', error);
}
```

### Publish a Message

```ts
try {
  await Mqtt.publish('my/topic', 'Hello World!', 1); // QoS 0, 1, or 2
  console.log('Published!');
} catch (error) {
  console.error('Publish failed:', error);
}
```

### Unsubscribe from a Topic

```ts
try {
  await Mqtt.unsubscribe('my/topic');
  console.log('Unsubscribed!');
} catch (error) {
  console.error('Unsubscribe failed:', error);
}
```

### Disconnect

```ts
try {
  await Mqtt.disconnect();
  console.log('Disconnected!');
} catch (error) {
  console.error('Disconnect failed:', error);
}
```

### Listen for Events

```ts
import { useEffect } from 'react';
import { Mqtt } from 'react-native-mqtt-client';

useEffect(() => {
  const connectedSub = Mqtt.addListener('onMqttConnected', (data) => {
    console.log('Connected:', data.message);
  });

  const disconnectedSub = Mqtt.addListener('onMqttDisconnected', (data) => {
    console.log('Disconnected:', data.message);
  });

  const messageSub = Mqtt.addListener('onMqttMessageReceived', (data) => {
    console.log(`Message on [${data.topic}]:`, data.message);
  });

  const errorSub = Mqtt.addListener('onMqttError', (data) => {
    console.error('MQTT Error:', data.error);
  });

  const subscribedSub = Mqtt.addListener('onMqttSubscribed', (data) => {
    console.log('Subscribed to:', data.topic);
  });

  const unsubscribedSub = Mqtt.addListener('onMqttUnsubscribed', (data) => {
    console.log('Unsubscribed from:', data.topic);
  });

  return () => {
    connectedSub.remove();
    disconnectedSub.remove();
    messageSub.remove();
    errorSub.remove();
    subscribedSub.remove();
    unsubscribedSub.remove();
  };
}, []);
```

## API Reference

### `Mqtt.connect(brokerUrl, username, password)`

| Parameter   | Type     | Description                                |
| ----------- | -------- | ------------------------------------------ |
| `brokerUrl` | `string` | Broker URL (e.g. `tcp://host:1883`)        |
| `username`  | `string` | Username for authentication (empty string for anonymous) |
| `password`  | `string` | Password for authentication (empty string for anonymous) |

**Returns:** `Promise<string>`

### `Mqtt.disconnect()`

**Returns:** `Promise<string>`

### `Mqtt.subscribe(topic, qos?)`

| Parameter | Type     | Description                 |
| --------- | -------- | --------------------------- |
| `topic`   | `string` | The MQTT topic to subscribe |
| `qos`     | `number` | QoS level (0, 1, 2). Default: `1` |

**Returns:** `Promise<string>`

### `Mqtt.unsubscribe(topic)`

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `topic`   | `string` | The MQTT topic to unsubscribe |

**Returns:** `Promise<string>`

### `Mqtt.publish(topic, message, qos?)`

| Parameter | Type     | Description                 |
| --------- | -------- | --------------------------- |
| `topic`   | `string` | The MQTT topic to publish to |
| `message` | `string` | The message payload          |
| `qos`     | `number` | QoS level (0, 1, 2). Default: `1` |

**Returns:** `Promise<string>`

### `Mqtt.addListener(eventName, callback)`

| Event Name              | Payload                             |
| ----------------------- | ----------------------------------- |
| `onMqttConnected`       | `{ message: string }`               |
| `onMqttDisconnected`    | `{ message: string }`               |
| `onMqttMessageReceived` | `{ topic: string, message: string }`|
| `onMqttError`           | `{ error: string }`                 |
| `onMqttSubscribed`      | `{ topic: string }`                 |
| `onMqttUnsubscribed`    | `{ topic: string }`                 |

**Returns:** `EmitterSubscription` — call `.remove()` to unsubscribe.

## Full Example

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button } from 'react-native';
import { Mqtt } from 'react-native-mqtt-client';

export default function App() {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const sub = Mqtt.addListener('onMqttMessageReceived', (data) => {
      setMessages((prev) => [...prev, `[${data.topic}]: ${data.message}`]);
    });
    return () => sub.remove();
  }, []);

  const start = async () => {
    await Mqtt.connect('tcp://broker.hivemq.com:1883', '', '');
    await Mqtt.subscribe('test/topic');
  };

  const send = async () => {
    await Mqtt.publish('test/topic', 'Hello MQTT!');
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Button title="Connect & Subscribe" onPress={start} />
      <Button title="Publish" onPress={send} />
      {messages.map((msg, i) => (
        <Text key={i}>{msg}</Text>
      ))}
    </View>
  );
}
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
