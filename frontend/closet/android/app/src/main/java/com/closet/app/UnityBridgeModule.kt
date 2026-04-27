package com.closet.app

import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule


class UnityBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "UnityBridge"

    // Called from JS: ARService.openWithProduct(...)
    @ReactMethod
    fun launchAR(payload: String) {
        val currentActivity = reactContext.currentActivity ?: return
        val intent = Intent(currentActivity, UnityARActivity::class.java)
        intent.putExtra("payload", payload)
        currentActivity.startActivity(intent)
    }

    // Called from UnityARActivity when Unity fires an event back
    fun sendEvent(eventName: String, data: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    @ReactMethod
    fun addListener(eventName: String) { /* required for RN event emitter */ }

    @ReactMethod
    fun removeListeners(count: Int) { /* required for RN event emitter */ }

    companion object {
        var instance: UnityBridgeModule? = null
    }

    init {
        instance = this
    }
}
