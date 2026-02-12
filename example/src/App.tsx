import { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Mqtt, type MqttMessage } from 'react-native-mqtt-client';

const BROKER_URL = 'tcp://mqtt.interswitchng.com:1883';
const DEFAULT_TOPIC = 'react-native-mqtt-client/test';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [message, setMessage] = useState('Hello from React Native!');
  const [logs, setLogs] = useState<string[]>([]);
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);

  const addLog = useCallback((log: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev: string[]) => [`[${timestamp}] ${log}`, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const connectedSub = Mqtt.addListener('onMqttConnected', (data) => {
      addLog(`✅ Connected: ${data.message}`);
      setIsConnected(true);
    });

    const disconnectedSub = Mqtt.addListener('onMqttDisconnected', (data) => {
      addLog(`🔌 Disconnected: ${data.message}`);
      setIsConnected(false);
      setSubscribedTopics([]);
    });

    const messageSub = Mqtt.addListener(
      'onMqttMessageReceived',
      (data: MqttMessage) => {
        addLog(`📩 [${data.topic}]: ${data.message}`);
      }
    );

    const errorSub = Mqtt.addListener('onMqttError', (data) => {
      addLog(`❌ Error: ${data.error}`);
    });

    const subscribedSub = Mqtt.addListener('onMqttSubscribed', (data) => {
      addLog(`📌 Subscribed to: ${data.topic}`);
    });

    const unsubscribedSub = Mqtt.addListener('onMqttUnsubscribed', (data) => {
      addLog(`📌 Unsubscribed from: ${data.topic}`);
    });

    return () => {
      connectedSub.remove();
      disconnectedSub.remove();
      messageSub.remove();
      errorSub.remove();
      subscribedSub.remove();
      unsubscribedSub.remove();
    };
  }, [addLog]);

  const handleConnect = async () => {
    try {
      addLog('Connecting...');
      await Mqtt.connect(BROKER_URL, '413100000001', 'M%3Hras#$^^&&**');
    } catch (error: any) {
      Alert.alert('Connection Error', error?.message ?? 'Unknown error');
    }
  };

  const handleDisconnect = async () => {
    try {
      await Mqtt.disconnect();
    } catch (error: any) {
      Alert.alert('Disconnect Error', error?.message ?? 'Unknown error');
    }
  };

  const handleSubscribe = async () => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }
    try {
      await Mqtt.subscribe(topic.trim());
      setSubscribedTopics((prev: string[]) => [...new Set([...prev, topic.trim()])]);
    } catch (error: any) {
      Alert.alert('Subscribe Error', error?.message ?? 'Unknown error');
    }
  };

  const handleUnsubscribe = async () => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }
    try {
      await Mqtt.unsubscribe(topic.trim());
      setSubscribedTopics((prev: string[]) => prev.filter((t: string) => t !== topic.trim()));
    } catch (error: any) {
      Alert.alert('Unsubscribe Error', error?.message ?? 'Unknown error');
    }
  };

  const handlePublish = async () => {
    if (!topic.trim() || !message.trim()) {
      Alert.alert('Error', 'Please enter both topic and message');
      return;
    }
    try {
      await Mqtt.publish(topic.trim(), message.trim());
      addLog(`📤 Published to [${topic.trim()}]: ${message.trim()}`);
    } catch (error: any) {
      Alert.alert('Publish Error', error?.message ?? 'Unknown error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>🔗 MQTT Client</Text>
        <Text style={styles.subtitle}>
          Status:{' '}
          <Text style={isConnected ? styles.connected : styles.disconnected}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </Text>

        {/* Connection Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <Text style={styles.brokerLabel}>Broker: {BROKER_URL}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.button, styles.connectBtn]}
              onPress={handleConnect}
              disabled={isConnected}
            >
              <Text style={styles.buttonText}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.disconnectBtn]}
              onPress={handleDisconnect}
              disabled={!isConnected}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Topic Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Topic</Text>
          <TextInput
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
            placeholder="Enter MQTT topic"
            placeholderTextColor="#999"
          />
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.button, styles.subscribeBtn]}
              onPress={handleSubscribe}
              disabled={!isConnected}
            >
              <Text style={styles.buttonText}>Subscribe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.unsubscribeBtn]}
              onPress={handleUnsubscribe}
              disabled={!isConnected}
            >
              <Text style={styles.buttonText}>Unsubscribe</Text>
            </TouchableOpacity>
          </View>
          {subscribedTopics.length > 0 && (
            <Text style={styles.subscribedLabel}>
              Subscribed: {subscribedTopics.join(', ')}
            </Text>
          )}
        </View>

        {/* Publish */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Publish</Text>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter message"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.button, styles.publishBtn]}
            onPress={handlePublish}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>Publish Message</Text>
          </TouchableOpacity>
        </View>

        {/* Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logs</Text>
          <View style={styles.logContainer}>
            {logs.length === 0 ? (
              <Text style={styles.logPlaceholder}>
                No logs yet. Connect to get started.
              </Text>
            ) : (
              logs.map((log: string, index: number) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  connected: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  disconnected: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  brokerLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  connectBtn: {
    backgroundColor: '#4CAF50',
  },
  disconnectBtn: {
    backgroundColor: '#F44336',
  },
  subscribeBtn: {
    backgroundColor: '#2196F3',
  },
  unsubscribeBtn: {
    backgroundColor: '#FF9800',
  },
  publishBtn: {
    backgroundColor: '#9C27B0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  subscribedLabel: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 8,
    fontStyle: 'italic',
  },
  logContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    minHeight: 150,
    maxHeight: 300,
  },
  logText: {
    color: '#d4d4d4',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  logPlaceholder: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
