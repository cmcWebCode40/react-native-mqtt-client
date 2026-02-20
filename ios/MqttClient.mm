#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>
#import <ReactCommon/RCTTurboModule.h>
#import <MQTTClient/MQTTClient.h>
#import "MqttClient.h"

@interface MqttClient () <MQTTSessionDelegate>
@property (nonatomic, strong) MQTTSession *session;
@property (nonatomic, assign) BOOL hasListeners;
@property (nonatomic, strong) NSThread *mqttThread;
@property (nonatomic, strong) NSRunLoop *mqttRunLoop;
@end

@implementation MqttClient {
  RCTPromiseResolveBlock _connectResolve;
  RCTPromiseRejectBlock _connectReject;
  facebook::react::EventEmitterCallback _eventEmitterCallback;
}

+ (BOOL)requiresMainQueueSetup { return NO; }

- (instancetype)init
{
  if (self = [super init]) {
    _mqttThread = [[NSThread alloc] initWithTarget:self selector:@selector(runMqttThread) object:nil];
    [_mqttThread start];
  }
  return self;
}

- (void)runMqttThread
{
  @autoreleasepool {
    _mqttRunLoop = [NSRunLoop currentRunLoop];
    [_mqttRunLoop addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode];
    while (!_mqttThread.isCancelled) {
      @autoreleasepool {
        [_mqttRunLoop runMode:NSDefaultRunLoopMode beforeDate:[NSDate distantFuture]];
      }
    }
  }
}

- (void)invalidate
{
  [super invalidate];
  if (_session) { [_session disconnect]; _session = nil; }
  if (_mqttThread) { [_mqttThread cancel]; _mqttThread = nil; }
}

+ (NSString *)moduleName { return @"MqttClient"; }

- (NSArray<NSString *> *)supportedEvents
{
  return @[
    @"onMqttConnected", @"onMqttDisconnected", @"onMqttMessageReceived",
    @"onMqttError", @"onMqttSubscribed", @"onMqttUnsubscribed"
  ];
}

- (void)startObserving { _hasListeners = YES; }
- (void)stopObserving  { _hasListeners = NO;  }

// ---------------------------------------------------------------------------
// CRITICAL FIX: always call [super …] here.
//
// RCTEventEmitter's own -addListener: increments an internal counter and — when
// it transitions from 0 to 1 — calls -startObserving, which sets _hasListeners.
// By overriding without calling super the counter was never updated, startObserving
// was never invoked, _hasListeners stayed permanently NO, and every
// sendEventWithName:body: call was silently discarded.
// ---------------------------------------------------------------------------
- (void)addListener:(NSString *)eventName
{
  [super addListener:eventName];
}

- (void)removeListeners:(double)count
{
  [super removeListeners:count];
}

#pragma mark - TurboModule Event Emitter

- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)eventEmitterCallbackWrapper
{
  _eventEmitterCallback = std::move(eventEmitterCallbackWrapper->_eventEmitterCallback);
}

/**
 * Central dispatch. Must be called on the main thread.
 * - If TurboModule JSI callback is registered: use it (New Arch).
 * - Otherwise use RCTEventEmitter's sendEventWithName:body: (bridge / NativeEventEmitter path).
 */
- (void)sendMqttEvent:(NSString *)eventName body:(NSDictionary *)body
{
  if (!NSThread.isMainThread) {
    dispatch_async(dispatch_get_main_queue(), ^{ [self sendMqttEvent:eventName body:body]; });
    return;
  }

  if (_eventEmitterCallback) {
    _eventEmitterCallback(std::string([eventName UTF8String]), body);
  } else if (_hasListeners) {
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
  NSDictionary *params = @{
    @"brokerUrl": brokerUrl,
    @"username":  username ?: @"",
    @"password":  password ?: @"",
    @"resolve":   resolve,
    @"reject":    reject
  };
  [self performSelector:@selector(doConnect:) onThread:_mqttThread withObject:params waitUntilDone:NO];
}

- (void)doConnect:(NSDictionary *)params
{
  NSString *brokerUrl = params[@"brokerUrl"];
  NSString *username  = params[@"username"];
  NSString *password  = params[@"password"];
  RCTPromiseResolveBlock resolve = params[@"resolve"];
  RCTPromiseRejectBlock  reject  = params[@"reject"];

  @try {
    if (_session) { [_session disconnect]; _session = nil; }

    NSString  *host   = brokerUrl;
    NSUInteger port   = 1883;
    BOOL       useSSL = NO;

    if ([brokerUrl hasPrefix:@"ssl://"] || [brokerUrl hasPrefix:@"tls://"]) {
      useSSL = YES; port = 8883;
      host = [brokerUrl stringByReplacingOccurrencesOfString:@"ssl://" withString:@""];
      host = [host       stringByReplacingOccurrencesOfString:@"tls://" withString:@""];
    } else if ([brokerUrl hasPrefix:@"tcp://"]) {
      host = [brokerUrl stringByReplacingOccurrencesOfString:@"tcp://" withString:@""];
    } else if ([brokerUrl hasPrefix:@"wss://"]) {
      useSSL = YES; port = 443;
      host = [brokerUrl stringByReplacingOccurrencesOfString:@"wss://" withString:@""];
    } else if ([brokerUrl hasPrefix:@"ws://"]) {
      port = 80;
      host = [brokerUrl stringByReplacingOccurrencesOfString:@"ws://" withString:@""];
    }

    NSArray *parts = [host componentsSeparatedByString:@":"];
    if (parts.count > 1) { host = parts[0]; port = [parts[1] integerValue]; }

    NSString *clientId = [NSString stringWithFormat:@"ReactNativeMqtt_%@",
                          [[NSUUID UUID].UUIDString substringToIndex:8]];

    MQTTCFSocketTransport *transport = [[MQTTCFSocketTransport alloc] init];
    transport.host = host;
    transport.port = (UInt32)port;
    transport.tls  = useSSL;
    if (useSSL) transport.streamSSLLevel = (NSString *)kCFStreamSocketSecurityLevelNegotiatedSSL;

    _session                   = [[MQTTSession alloc] init];
    _session.transport         = transport;
    _session.delegate          = self;
    _session.clientId          = clientId;
    _session.keepAliveInterval = 60;
    _session.cleanSessionFlag  = YES;

    if (username.length > 0) _session.userName = username;
    if (password.length > 0) _session.password  = password;

    _connectResolve = resolve;
    _connectReject  = reject;

    [_session connectWithConnectHandler:^(NSError *error) {
      if (error) {
        NSString *msg = error.localizedDescription ?: @"Connection failed";
        dispatch_async(dispatch_get_main_queue(), ^{
          [self sendMqttEvent:@"onMqttError" body:@{@"error": msg}];
          if (self->_connectReject) {
            self->_connectReject(@"MQTT_CONNECT_ERROR", msg, error);
            self->_connectResolve = nil; self->_connectReject = nil;
          }
        });
      }
    }];

    NSDate *timeout = [NSDate dateWithTimeIntervalSinceNow:30];
    while (_connectResolve != nil && [timeout timeIntervalSinceNow] > 0) {
      [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode
                               beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
    }

    if (_connectResolve != nil) {
      NSString *msg = @"Connection timeout - failed to connect within 30 seconds";
      dispatch_async(dispatch_get_main_queue(), ^{
        [self sendMqttEvent:@"onMqttError" body:@{@"error": msg}];
      });
      if (_connectReject) {
        _connectReject(@"MQTT_CONNECT_ERROR", msg, nil);
        _connectResolve = nil; _connectReject = nil;
      }
    }
  } @catch (NSException *e) {
    _connectResolve = nil; _connectReject = nil;
    NSString *msg = e.reason ?: @"Connection error";
    dispatch_async(dispatch_get_main_queue(), ^{ [self sendMqttEvent:@"onMqttError" body:@{@"error": msg}]; });
    reject(@"MQTT_CONNECT_ERROR", msg, nil);
  }
}

- (void)disconnect:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  if (_session == nil || _session.status != MQTTSessionStatusConnected) {
    reject(@"MQTT_DISCONNECT_ERROR", @"Client is not connected", nil); return;
  }
  [_session disconnect];
  dispatch_async(dispatch_get_main_queue(), ^{
    [self sendMqttEvent:@"onMqttDisconnected" body:@{@"message": @"Disconnected successfully"}];
  });
  _session = nil;
  resolve(@"Disconnected successfully");
}

- (void)subscribe:(NSString *)topic qos:(double)qos resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  if (_session == nil || _session.status != MQTTSessionStatusConnected) {
    reject(@"MQTT_SUBSCRIBE_ERROR", @"Client is not connected", nil); return;
  }
  [_session subscribeToTopic:topic atLevel:(MQTTQosLevel)(int)qos subscribeHandler:^(NSError *error, NSArray<NSNumber *> *gQoss) {
    if (error) { reject(@"MQTT_SUBSCRIBE_ERROR", error.localizedDescription, error); }
    else {
      dispatch_async(dispatch_get_main_queue(), ^{ [self sendMqttEvent:@"onMqttSubscribed" body:@{@"topic": topic}]; });
      resolve([NSString stringWithFormat:@"Subscribed to %@", topic]);
    }
  }];
}

- (void)unsubscribe:(NSString *)topic resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  if (_session == nil || _session.status != MQTTSessionStatusConnected) {
    reject(@"MQTT_UNSUBSCRIBE_ERROR", @"Client is not connected", nil); return;
  }
  [_session unsubscribeTopic:topic unsubscribeHandler:^(NSError *error) {
    if (error) { reject(@"MQTT_UNSUBSCRIBE_ERROR", error.localizedDescription, error); }
    else {
      dispatch_async(dispatch_get_main_queue(), ^{ [self sendMqttEvent:@"onMqttUnsubscribed" body:@{@"topic": topic}]; });
      resolve([NSString stringWithFormat:@"Unsubscribed from %@", topic]);
    }
  }];
}

- (void)publish:(NSString *)topic message:(NSString *)message qos:(double)qos resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  if (_session == nil || _session.status != MQTTSessionStatusConnected) {
    reject(@"MQTT_PUBLISH_ERROR", @"Client is not connected", nil); return;
  }
  NSData *data = [message dataUsingEncoding:NSUTF8StringEncoding];
  [_session publishData:data onTopic:topic retain:NO qos:(MQTTQosLevel)(int)qos publishHandler:^(NSError *error) {
    if (error) { reject(@"MQTT_PUBLISH_ERROR", error.localizedDescription, error); }
    else { resolve([NSString stringWithFormat:@"Message published to %@", topic]); }
  }];
}

#pragma mark - MQTTSessionDelegate

- (void)handleEvent:(MQTTSession *)session event:(MQTTSessionEvent)eventCode error:(NSError *)error
{
  dispatch_async(dispatch_get_main_queue(), ^{
    switch (eventCode) {
      case MQTTSessionEventConnected: {
        NSString *msg = @"Connected successfully";
        [self sendMqttEvent:@"onMqttConnected" body:@{@"message": msg}];
        if (self->_connectResolve) {
          self->_connectResolve(msg);
          self->_connectResolve = nil; self->_connectReject = nil;
        }
        break;
      }
      case MQTTSessionEventConnectionRefused:
      case MQTTSessionEventConnectionError: {
        NSString *msg = error.localizedDescription ?: @"Connection failed";
        [self sendMqttEvent:@"onMqttError" body:@{@"error": msg}];
        if (self->_connectReject) {
          self->_connectReject(@"MQTT_CONNECT_ERROR", msg, error);
          self->_connectResolve = nil; self->_connectReject = nil;
        }
        break;
      }
      case MQTTSessionEventConnectionClosed:
        [self sendMqttEvent:@"onMqttDisconnected" body:@{@"message": @"Connection closed"}];
        break;
      case MQTTSessionEventProtocolError:
        [self sendMqttEvent:@"onMqttError" body:@{@"error": error.localizedDescription ?: @"Protocol error"}];
        break;
      default: break;
    }
  });
}

- (void)newMessage:(MQTTSession *)session data:(NSData *)data onTopic:(NSString *)topic
               qos:(MQTTQosLevel)qos retained:(BOOL)retained mid:(unsigned int)mid
{
  NSString *payload = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  dispatch_async(dispatch_get_main_queue(), ^{
    [self sendMqttEvent:@"onMqttMessageReceived" body:@{
      @"topic":   topic   ?: @"",
      @"message": payload ?: @""
    }];
  });
}

- (void)connectionClosed:(MQTTSession *)session
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self sendMqttEvent:@"onMqttDisconnected" body:@{@"message": @"Connection closed"}];
  });
}

- (void)connectionError:(MQTTSession *)session error:(NSError *)error
{
  NSString *msg = error.localizedDescription ?: @"Connection error";
  dispatch_async(dispatch_get_main_queue(), ^{
    [self sendMqttEvent:@"onMqttError" body:@{@"error": msg}];
    if (self->_connectReject) {
      self->_connectReject(@"MQTT_CONNECT_ERROR", msg, error);
      self->_connectResolve = nil; self->_connectReject = nil;
    }
  });
}

- (void)connectionRefused:(MQTTSession *)session error:(NSError *)error
{
  NSString *msg = error.localizedDescription ?: @"Connection refused";
  dispatch_async(dispatch_get_main_queue(), ^{
    [self sendMqttEvent:@"onMqttError" body:@{@"error": msg}];
    if (self->_connectReject) {
      self->_connectReject(@"MQTT_CONNECT_ERROR", msg, error);
      self->_connectResolve = nil; self->_connectReject = nil;
    }
  });
}

#pragma mark - TurboModule

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeMqttClientSpecJSI>(params);
}

@end