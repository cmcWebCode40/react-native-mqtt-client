package com.mqttclient

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.eclipse.paho.client.mqttv3.IMqttActionListener
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken
import org.eclipse.paho.client.mqttv3.IMqttToken
import org.eclipse.paho.client.mqttv3.MqttCallback
import org.eclipse.paho.client.mqttv3.MqttAsyncClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttException
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import java.util.UUID

class MqttClientModule(private val reactContext: ReactApplicationContext) :
  NativeMqttClientSpec(reactContext) {

  private var mqttClient: MqttAsyncClient? = null
  private var listenerCount = 0

  companion object {
    const val NAME = NativeMqttClientSpec.NAME
  }

  private fun sendEvent(eventName: String, params: WritableMap?) {
    if (listenerCount > 0) {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
    }
  }

  override fun addListener(eventName: String?) {
    listenerCount++
  }

  override fun removeListeners(count: Double) {
    listenerCount -= count.toInt()
    if (listenerCount < 0) {
      listenerCount = 0
    }
  }

  override fun connect(brokerUrl: String, username: String, password: String, promise: Promise) {
    try {
      val clientId = "ReactNativeMqtt_" + UUID.randomUUID().toString().substring(0, 8)
      val persistence = MemoryPersistence()

      mqttClient = MqttAsyncClient(brokerUrl, clientId, persistence)

      val options = MqttConnectOptions().apply {
        isCleanSession = true
        connectionTimeout = 30
        keepAliveInterval = 60
        isAutomaticReconnect = true
        if (username.isNotEmpty()) {
          userName = username
        }
        if (password.isNotEmpty()) {
          setPassword(password.toCharArray())
        }
      }

      mqttClient?.setCallback(object : MqttCallback {
        override fun connectionLost(cause: Throwable?) {
          val params = Arguments.createMap().apply {
            putString("message", cause?.message ?: "Connection lost")
          }
          sendEvent("onMqttDisconnected", params)
        }

        override fun messageArrived(topic: String?, message: MqttMessage?) {
          val params = Arguments.createMap().apply {
            putString("topic", topic ?: "")
            putString("message", message?.toString() ?: "")
          }
          sendEvent("onMqttMessageReceived", params)
        }

        override fun deliveryComplete(token: IMqttDeliveryToken?) {
          // Delivery complete - no action needed
        }
      })

      mqttClient?.connect(options, null, object : IMqttActionListener {
        override fun onSuccess(asyncActionToken: IMqttToken?) {
          val params = Arguments.createMap().apply {
            putString("message", "Connected to $brokerUrl")
          }
          sendEvent("onMqttConnected", params)
          promise.resolve("Connected to $brokerUrl")
        }

        override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
          val errorMsg = exception?.message ?: "Connection failed"
          val params = Arguments.createMap().apply {
            putString("error", errorMsg)
          }
          sendEvent("onMqttError", params)
          promise.reject("MQTT_CONNECT_ERROR", errorMsg, exception)
        }
      })
    } catch (e: MqttException) {
      val params = Arguments.createMap().apply {
        putString("error", e.message ?: "Connection error")
      }
      sendEvent("onMqttError", params)
      promise.reject("MQTT_CONNECT_ERROR", e.message, e)
    }
  }

  override fun disconnect(promise: Promise) {
    try {
      if (mqttClient == null || !mqttClient!!.isConnected) {
        promise.reject("MQTT_DISCONNECT_ERROR", "Client is not connected")
        return
      }

      mqttClient?.disconnect(null, object : IMqttActionListener {
        override fun onSuccess(asyncActionToken: IMqttToken?) {
          val params = Arguments.createMap().apply {
            putString("message", "Disconnected successfully")
          }
          sendEvent("onMqttDisconnected", params)
          mqttClient?.close()
          mqttClient = null
          promise.resolve("Disconnected successfully")
        }

        override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
          val errorMsg = exception?.message ?: "Disconnect failed"
          promise.reject("MQTT_DISCONNECT_ERROR", errorMsg, exception)
        }
      })
    } catch (e: MqttException) {
      promise.reject("MQTT_DISCONNECT_ERROR", e.message, e)
    }
  }

  override fun subscribe(topic: String, qos: Double, promise: Promise) {
    try {
      if (mqttClient == null || !mqttClient!!.isConnected) {
        promise.reject("MQTT_SUBSCRIBE_ERROR", "Client is not connected")
        return
      }

      mqttClient?.subscribe(topic, qos.toInt(), null, object : IMqttActionListener {
        override fun onSuccess(asyncActionToken: IMqttToken?) {
          val params = Arguments.createMap().apply {
            putString("topic", topic)
          }
          sendEvent("onMqttSubscribed", params)
          promise.resolve("Subscribed to $topic")
        }

        override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
          val errorMsg = exception?.message ?: "Subscribe failed"
          promise.reject("MQTT_SUBSCRIBE_ERROR", errorMsg, exception)
        }
      })
    } catch (e: MqttException) {
      promise.reject("MQTT_SUBSCRIBE_ERROR", e.message, e)
    }
  }

  override fun unsubscribe(topic: String, promise: Promise) {
    try {
      if (mqttClient == null || !mqttClient!!.isConnected) {
        promise.reject("MQTT_UNSUBSCRIBE_ERROR", "Client is not connected")
        return
      }

      mqttClient?.unsubscribe(topic, null, object : IMqttActionListener {
        override fun onSuccess(asyncActionToken: IMqttToken?) {
          val params = Arguments.createMap().apply {
            putString("topic", topic)
          }
          sendEvent("onMqttUnsubscribed", params)
          promise.resolve("Unsubscribed from $topic")
        }

        override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
          val errorMsg = exception?.message ?: "Unsubscribe failed"
          promise.reject("MQTT_UNSUBSCRIBE_ERROR", errorMsg, exception)
        }
      })
    } catch (e: MqttException) {
      promise.reject("MQTT_UNSUBSCRIBE_ERROR", e.message, e)
    }
  }

  override fun publish(topic: String, message: String, qos: Double, promise: Promise) {
    try {
      if (mqttClient == null || !mqttClient!!.isConnected) {
        promise.reject("MQTT_PUBLISH_ERROR", "Client is not connected")
        return
      }

      val mqttMessage = MqttMessage().apply {
        payload = message.toByteArray()
        this.qos = qos.toInt()
        isRetained = false
      }

      mqttClient?.publish(topic, mqttMessage, null, object : IMqttActionListener {
        override fun onSuccess(asyncActionToken: IMqttToken?) {
          promise.resolve("Message published to $topic")
        }

        override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
          val errorMsg = exception?.message ?: "Publish failed"
          promise.reject("MQTT_PUBLISH_ERROR", errorMsg, exception)
        }
      })
    } catch (e: MqttException) {
      promise.reject("MQTT_PUBLISH_ERROR", e.message, e)
    }
  }
}
