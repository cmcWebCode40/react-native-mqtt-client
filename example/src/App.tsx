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

const DEFAULT_BROKER_URL = 'tcp://mqtt.interswitchng.com:1883';
const DEFAULT_USERNAME = '413100000001';
const DEFAULT_PASSWORD = 'M%3Hras#$^^&&**';
const DEFAULT_TOPIC = 'react-native-mqtt-client/test';

type MessageFormat = 'text' | 'json';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [brokerUrl, setBrokerUrl] = useState(DEFAULT_BROKER_URL);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [messageFormat, setMessageFormat] = useState<MessageFormat>('json');
  const [message, setMessage] = useState(
    JSON.stringify(
      {
        payload: 'Hello MQTT',
        qos: 1,
        retained: false,
      },
      null,
      2
    )
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);

  const addLog = useCallback((log: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev: string[]) =>
      [`[${timestamp}] ${log}`, ...prev].slice(0, 50)
    );
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
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
        console.log(`Message received on topic ${data}`);
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

  const requireConnection = useCallback(() => {
    if (!isConnected) {
      Alert.alert(
        'Not Connected',
        'You must be connected to a broker before performing this action.'
      );
      return false;
    }
    return true;
  }, [isConnected]);

  const handleConnect = async () => {
    if (!brokerUrl.trim()) {
      Alert.alert('Error', 'Please enter a broker URL');
      return;
    }
    try {
      addLog(`Connecting to ${brokerUrl.trim()}...`);
      const res = await Mqtt.connect(brokerUrl.trim(), username, password);
      console.log(res, 'res=======');
      addLog(`✅ Connected: response: ${res}`);
      setIsConnected(true);
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
    if (!requireConnection()) return;
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }
    try {
      await Mqtt.subscribe(topic.trim());
      setSubscribedTopics((prev: string[]) => [
        ...new Set([...prev, topic.trim()]),
      ]);
    } catch (error: any) {
      Alert.alert('Subscribe Error', error?.message ?? 'Unknown error');
    }
  };

  const handleUnsubscribe = async () => {
    if (!requireConnection()) return;
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }
    try {
      await Mqtt.unsubscribe(topic.trim());
      setSubscribedTopics((prev: string[]) =>
        prev.filter((t: string) => t !== topic.trim())
      );
    } catch (error: any) {
      Alert.alert('Unsubscribe Error', error?.message ?? 'Unknown error');
    }
  };

  const handlePublish = async () => {
    if (!requireConnection()) return;
    if (!topic.trim() || !message) {
      Alert.alert('Error', 'Please enter both topic and message');
      return;
    }

    let payload = message;

    if (messageFormat === 'json') {
      try {
        // Validate JSON by parsing it, then re-stringify compactly for publishing
        const parsed = JSON.parse(message);
        payload = JSON.stringify(parsed);
      } catch {
        Alert.alert(
          'Invalid JSON',
          'The message is not valid JSON. Please fix it or switch to Plain Text format.'
        );
        return;
      }
    }

    try {
      await Mqtt.publish(topic.trim(), payload);
      addLog(`📤 Published to [${topic.trim()}]: ${payload}`);
    } catch (error: any) {
      Alert.alert('Publish Error', error?.message ?? 'Unknown error');
    }
  };

  const handleFormatChange = (format: MessageFormat) => {
    if (format === messageFormat) return;

    if (format === 'json') {
      // Switching to JSON — try to parse existing text as JSON for pretty-print
      try {
        const parsed = JSON.parse(message);
        setMessage(JSON.stringify(parsed, null, 2));
      } catch {
        // Leave as-is, user will need to fix it
      }
    } else {
      // Switching to plain text — compact JSON if valid, else leave as-is
      try {
        const parsed = JSON.parse(message);
        setMessage(JSON.stringify(parsed));
      } catch {
        // Leave as-is
      }
    }

    setMessageFormat(format);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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

          <Text style={styles.fieldLabel}>Broker URL</Text>
          <TextInput
            style={styles.input}
            value={brokerUrl}
            onChangeText={setBrokerUrl}
            placeholder="tcp://broker.example.com:1883"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnected}
          />

          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username (optional)"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnected}
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password (optional)"
            placeholderTextColor="#999"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnected}
          />

          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.connectBtn,
                isConnected && styles.buttonDisabled,
              ]}
              onPress={handleConnect}
              disabled={isConnected}
            >
              <Text style={styles.buttonText}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.disconnectBtn,
                !isConnected && styles.buttonDisabled,
              ]}
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
              style={[
                styles.button,
                styles.subscribeBtn,
                !isConnected && styles.buttonDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={!isConnected}
            >
              <Text style={styles.buttonText}>Subscribe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.unsubscribeBtn,
                !isConnected && styles.buttonDisabled,
              ]}
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

          {/* Format Toggle */}
          <View style={styles.formatToggleContainer}>
            <Text style={styles.formatLabel}>Format:</Text>
            <View style={styles.formatToggle}>
              <TouchableOpacity
                style={[
                  styles.formatOption,
                  messageFormat === 'text' && styles.formatOptionActive,
                ]}
                onPress={() => handleFormatChange('text')}
              >
                <Text
                  style={[
                    styles.formatOptionText,
                    messageFormat === 'text' && styles.formatOptionTextActive,
                  ]}
                >
                  Plain Text
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formatOption,
                  messageFormat === 'json' && styles.formatOptionActive,
                ]}
                onPress={() => handleFormatChange('json')}
              >
                <Text
                  style={[
                    styles.formatOptionText,
                    messageFormat === 'json' && styles.formatOptionTextActive,
                  ]}
                >
                  JSON
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={message}
            onChangeText={(text) => setMessage(text)}
            placeholder={
              messageFormat === 'json' ? '{"key": "value"}' : 'Enter message...'
            }
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.button,
              styles.publishBtn,
              !isConnected && styles.buttonDisabled,
            ]}
            onPress={handlePublish}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>Publish Message</Text>
          </TouchableOpacity>
        </View>

        {/* Logs */}
        <View style={styles.section}>
          <View style={styles.logHeader}>
            <Text style={styles.sectionTitle}>Logs</Text>
            {logs.length > 0 && (
              <TouchableOpacity onPress={clearLogs} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.logContainer}>
            <ScrollView
              nestedScrollEnabled
              style={styles.logScroll}
              contentContainerStyle={styles.logScrollContent}
            >
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
            </ScrollView>
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
    marginBottom: 4,
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
  buttonDisabled: {
    opacity: 0.4,
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
  multilineInput: {
    minHeight: 100,
    maxHeight: 200,
    fontFamily: 'monospace',
    fontSize: 13,
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
    height: 250,
  },
  logScroll: {
    flex: 1,
  },
  logScrollContent: {
    flexGrow: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  clearBtnText: {
    fontSize: 13,
    color: '#F44336',
    fontWeight: '500',
  },
  formatToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  formatLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  formatToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  formatOption: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#fafafa',
  },
  formatOptionActive: {
    backgroundColor: '#9C27B0',
  },
  formatOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  formatOptionTextActive: {
    color: '#fff',
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
