import MqttClient from './NativeMqttClient';

export function multiply(a: number, b: number): number {
  return MqttClient.multiply(a, b);
}
