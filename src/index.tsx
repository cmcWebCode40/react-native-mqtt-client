import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import MqttClient from './NativeMqttClient';

const MqttEventEmitter = new NativeEventEmitter(
  Platform.OS !== 'web' ? NativeModules.MqttClient : undefined
);

export type MqttEvent =
  | 'onMqttConnected'
  | 'onMqttDisconnected'
  | 'onMqttMessageReceived'
  | 'onMqttError'
  | 'onMqttSubscribed'
  | 'onMqttUnsubscribed';

export interface MqttMessage {
  topic: string;
  message: string;
}

/**
 * Establishes a connection to an MQTT broker using the provided credentials.
 *
 * @param brokerUrl - The URL of the MQTT broker to connect to (e.g. "tcp://broker.hivemq.com:1883").
 * @param username - The username for authenticating with the MQTT broker.
 * @param password - The password for authenticating with the MQTT broker.
 * @returns A promise that resolves with a success message, or rejects with an error.
 */
const connect = async (
  brokerUrl: string,
  username: string,
  password: string
): Promise<string> => {
  return MqttClient.connect(brokerUrl, username, password);
};

/**
 * Disconnects from the currently connected MQTT broker.
 *
 * @returns A promise that resolves with a success message, or rejects with an error.
 */
const disconnect = async (): Promise<string> => {
  return MqttClient.disconnect();
};

/**
 * Subscribes to an MQTT topic.
 *
 * @param topic - The MQTT topic to subscribe to.
 * @param qos - Quality of Service level (0, 1, or 2). Defaults to 1.
 * @returns A promise that resolves with a success message, or rejects with an error.
 */
const subscribe = async (topic: string, qos: number = 1): Promise<string> => {
  return MqttClient.subscribe(topic, qos);
};

/**
 * Unsubscribes from an MQTT topic.
 *
 * @param topic - The MQTT topic to unsubscribe from.
 * @returns A promise that resolves with a success message, or rejects with an error.
 */
const unsubscribe = async (topic: string): Promise<string> => {
  return MqttClient.unsubscribe(topic);
};

/**
 * Publishes a message to an MQTT topic.
 *
 * @param topic - The MQTT topic to publish the message to.
 * @param message - The message payload to publish.
 * @param qos - Quality of Service level (0, 1, or 2). Defaults to 1.
 * @returns A promise that resolves with a success message, or rejects with an error.
 */
const publish = async (
  topic: string,
  message: string,
  qos: number = 1
): Promise<string> => {
  return MqttClient.publish(topic, message, qos);
};

/**
 * Adds a listener for MQTT events.
 *
 * @param eventName - The name of the event to listen for.
 * @param callback - The callback function to invoke when the event occurs.
 * @returns A subscription object that can be used to remove the listener.
 *
 * Available events:
 * - `onMqttConnected` - Fired when connected to the broker. Payload: `{ message: string }`
 * - `onMqttDisconnected` - Fired when disconnected from the broker. Payload: `{ message: string }`
 * - `onMqttMessageReceived` - Fired when a message is received. Payload: `{ topic: string, message: string }`
 * - `onMqttError` - Fired when an error occurs. Payload: `{ error: string }`
 * - `onMqttSubscribed` - Fired when subscribed to a topic. Payload: `{ topic: string }`
 * - `onMqttUnsubscribed` - Fired when unsubscribed from a topic. Payload: `{ topic: string }`
 */
const addListener = (eventName: MqttEvent, callback: (data: any) => void) => {
  return MqttEventEmitter.addListener(eventName, callback);
};

export const Mqtt = {
  connect,
  disconnect,
  subscribe,
  unsubscribe,
  publish,
  addListener,
};

export default Mqtt;
