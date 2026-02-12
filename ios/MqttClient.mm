#import "MqttClient.h"

@interface MqttClient ()
@property (nonatomic, strong) MQTTSession *session;
@property (nonatomic, assign) BOOL hasListeners;
@end

@implementation MqttClient {
  RCTPromiseResolveBlock _connectResolve;
  RCTPromiseRejectBlock _connectReject;
}

+ (NSString *)moduleName
{
  return @"MqttClient";
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[
    @"onMqttConnected",
    @"onMqttDisconnected",
    @"onMqttMessageReceived",
    @"onMqttError",
    @"onMqttSubscribed",
    @"onMqttUnsubscribed"
  ];
}

- (void)startObserving
{
  _hasListeners = YES;
}

- (void)stopObserving
{
  _hasListeners = NO;
}

- (void)sendMqttEvent:(NSString *)eventName body:(NSDictionary *)body
{
  if (_hasListeners) {
    [self sendEventWithName:eventName body:body];
  }
}

#pragma mark - TurboModule Methods

- (void)connect:(NSString *)brokerUrl
       username:(NSString *)username
       password:(NSString *)password
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
  @try {
    // Parse the broker URL
    NSString *host = brokerUrl;
    NSUInteger port = 1883;
    BOOL useSSL = NO;

    if ([brokerUrl hasPrefix:@"ssl://"] || [brokerUrl hasPrefix:@"tls://"]) {
      useSSL = YES;
      host = [brokerUrl stringByReplacingOccurrencesOfString:@"ssl://" withString:@""];
      host = [host stringByReplacingOccurrencesOfString:@"tls://" withString:@""];
    } else if ([brokerUrl hasPrefix:@"tcp://"]) {
      host = [brokerUrl stringByReplacingOccurrencesOfString:@"tcp://" withString:@""];
    } else if ([brokerUrl hasPrefix:@"wss://"]) {
      useSSL = YES;
      host = [brokerUrl stringByReplacingOccurrencesOfString:@"wss://" withString:@""];
    } else if ([brokerUrl hasPrefix:@"ws://"]) {
      host = [brokerUrl stringByReplacingOccurrencesOfString:@"ws://" withString:@""];
    }

    // Extract port from host:port
    NSArray *hostParts = [host componentsSeparatedByString:@":"];
    if (hostParts.count > 1) {
      host = hostParts[0];
      port = [hostParts[1] integerValue];
    }

    NSString *clientId = [NSString stringWithFormat:@"ReactNativeMqtt_%@",
                          [[NSUUID UUID].UUIDString substringToIndex:8]];

    // Configure transport
    MQTTCFSocketTransport *transport = [[MQTTCFSocketTransport alloc] init];
    transport.host = host;
    transport.port = (UInt32)port;
    transport.tls = useSSL;

    // Configure session
    self.session = [[MQTTSession alloc] init];
    self.session.transport = transport;
    self.session.delegate = self;
    self.session.clientId = clientId;
    self.session.keepAliveInterval = 60;
    self.session.cleanSessionFlag = YES;

    if (username.length > 0) {
      self.session.userName = username;
    }
    if (password.length > 0) {
      self.session.password = password;
    }

    _connectResolve = resolve;
    _connectReject = reject;

    [self.session connectWithConnectHandler:^(NSError *error) {
      if (error) {
        NSString *errorMsg = error.localizedDescription ?: @"Connection failed";
        [self sendMqttEvent:@"onMqttError" body:@{@"error": errorMsg}];
        if (self->_connectReject) {
          self->_connectReject(@"MQTT_CONNECT_ERROR", errorMsg, error);
          self->_connectResolve = nil;
          self->_connectReject = nil;
        }
      } else {
        NSString *msg = [NSString stringWithFormat:@"Connected to %@", brokerUrl];
        [self sendMqttEvent:@"onMqttConnected" body:@{@"message": msg}];
        if (self->_connectResolve) {
          self->_connectResolve(msg);
          self->_connectResolve = nil;
          self->_connectReject = nil;
        }
      }
    }];
  } @catch (NSException *exception) {
    _connectResolve = nil;
    _connectReject = nil;
    [self sendMqttEvent:@"onMqttError" body:@{@"error": exception.reason ?: @"Connection error"}];
    reject(@"MQTT_CONNECT_ERROR", exception.reason, nil);
  }
}

- (void)disconnect:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  if (self.session == nil || self.session.status != MQTTSessionStatusConnected) {
    reject(@"MQTT_DISCONNECT_ERROR", @"Client is not connected", nil);
    return;
  }

  [self.session closeWithDisconnectHandler:^(NSError *error) {
    if (error) {
      reject(@"MQTT_DISCONNECT_ERROR", error.localizedDescription, error);
    } else {
      [self sendMqttEvent:@"onMqttDisconnected" body:@{@"message": @"Disconnected successfully"}];
      self.session = nil;
      resolve(@"Disconnected successfully");
    }
  }];
}

- (void)subscribe:(NSString *)topic
              qos:(double)qos
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject
{
  if (self.session == nil || self.session.status != MQTTSessionStatusConnected) {
    reject(@"MQTT_SUBSCRIBE_ERROR", @"Client is not connected", nil);
    return;
  }

  [self.session subscribeToTopic:topic atLevel:(MQTTQosLevel)(int)qos subscribeHandler:^(NSError *error, NSArray<NSNumber *> *gQoss) {
    if (error) {
      reject(@"MQTT_SUBSCRIBE_ERROR", error.localizedDescription, error);
    } else {
      [self sendMqttEvent:@"onMqttSubscribed" body:@{@"topic": topic}];
      resolve([NSString stringWithFormat:@"Subscribed to %@", topic]);
    }
  }];
}

- (void)unsubscribe:(NSString *)topic
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  if (self.session == nil || self.session.status != MQTTSessionStatusConnected) {
    reject(@"MQTT_UNSUBSCRIBE_ERROR", @"Client is not connected", nil);
    return;
  }

  [self.session unsubscribeTopic:topic unsubscribeHandler:^(NSError *error) {
    if (error) {
      reject(@"MQTT_UNSUBSCRIBE_ERROR", error.localizedDescription, error);
    } else {
      [self sendMqttEvent:@"onMqttUnsubscribed" body:@{@"topic": topic}];
      resolve([NSString stringWithFormat:@"Unsubscribed from %@", topic]);
    }
  }];
}

- (void)publish:(NSString *)topic
        message:(NSString *)message
            qos:(double)qos
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
  if (self.session == nil || self.session.status != MQTTSessionStatusConnected) {
    reject(@"MQTT_PUBLISH_ERROR", @"Client is not connected", nil);
    return;
  }

  NSData *data = [message dataUsingEncoding:NSUTF8StringEncoding];
  [self.session publishData:data onTopic:topic retain:NO qos:(MQTTQosLevel)(int)qos publishHandler:^(NSError *error) {
    if (error) {
      reject(@"MQTT_PUBLISH_ERROR", error.localizedDescription, error);
    } else {
      resolve([NSString stringWithFormat:@"Message published to %@", topic]);
    }
  }];
}

- (void)addListener:(NSString *)eventName
{
  // Required for RCTEventEmitter
}

- (void)removeListeners:(double)count
{
  // Required for RCTEventEmitter
}

#pragma mark - MQTTSessionDelegate

- (void)newMessage:(MQTTSession *)session data:(NSData *)data onTopic:(NSString *)topic qos:(MQTTQosLevel)qos retained:(BOOL)retained mid:(unsigned int)mid
{
  NSString *payload = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  [self sendMqttEvent:@"onMqttMessageReceived" body:@{
    @"topic": topic ?: @"",
    @"message": payload ?: @""
  }];
}

- (void)connectionClosed:(MQTTSession *)session
{
  [self sendMqttEvent:@"onMqttDisconnected" body:@{@"message": @"Connection closed"}];
}

- (void)connectionError:(MQTTSession *)session error:(NSError *)error
{
  NSString *errorMsg = error.localizedDescription ?: @"Connection error";
  [self sendMqttEvent:@"onMqttError" body:@{@"error": errorMsg}];

  if (_connectReject) {
    _connectReject(@"MQTT_CONNECT_ERROR", errorMsg, error);
    _connectResolve = nil;
    _connectReject = nil;
  }
}

- (void)connectionRefused:(MQTTSession *)session error:(NSError *)error
{
  NSString *errorMsg = error.localizedDescription ?: @"Connection refused";
  [self sendMqttEvent:@"onMqttError" body:@{@"error": errorMsg}];

  if (_connectReject) {
    _connectReject(@"MQTT_CONNECT_ERROR", errorMsg, error);
    _connectResolve = nil;
    _connectReject = nil;
  }
}

#pragma mark - TurboModule

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeMqttClientSpecJSI>(params);
}

@end
