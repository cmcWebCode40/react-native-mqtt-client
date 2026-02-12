import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  connect(brokerUrl: string, username: string, password: string): Promise<string>;
  disconnect(): Promise<string>;
  subscribe(topic: string, qos: number): Promise<string>;
  unsubscribe(topic: string): Promise<string>;
  publish(topic: string, message: string, qos: number): Promise<string>;

  // Event emitter support
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MqttClient');
