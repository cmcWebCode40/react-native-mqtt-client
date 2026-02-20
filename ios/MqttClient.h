#ifdef RCT_NEW_ARCH_ENABLED
#import <MqttClientSpec/MqttClientSpec.h>
#import <React/RCTEventEmitter.h>

@interface MqttClient : RCTEventEmitter <NativeMqttClientSpec>
#else
#import <React/RCTEventEmitter.h>

@interface MqttClient : RCTEventEmitter
#endif

@end
