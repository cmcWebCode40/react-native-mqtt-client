#import <MqttClientSpec/MqttClientSpec.h>
#import <React/RCTEventEmitter.h>
#import <MQTTClient/MQTTClient.h>

@interface MqttClient : RCTEventEmitter <NativeMqttClientSpec, MQTTSessionDelegate>

@end
