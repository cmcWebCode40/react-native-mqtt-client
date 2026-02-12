package com.mqttclient

import com.facebook.react.bridge.ReactApplicationContext

class MqttClientModule(reactContext: ReactApplicationContext) :
  NativeMqttClientSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeMqttClientSpec.NAME
  }
}
