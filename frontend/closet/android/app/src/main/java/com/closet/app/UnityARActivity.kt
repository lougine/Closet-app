package com.closet.app

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.unity3d.player.UnityPlayer
import com.unity3d.player.UnityPlayerActivity

class UnityARActivity : UnityPlayerActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Forward the payload JSON from React Native to UnityBridge GameObject
        val payload = intent.getStringExtra("payload") ?: return
        // Slight delay to let Unity initialize before sending message
        Handler(Looper.getMainLooper()).postDelayed({
            UnityPlayer.UnitySendMessage("UnityBridge", "ReceiveLaunchPayload", payload)
        }, 500)
    }

    // Called by Unity C# via AndroidJavaObject: activity.Call("onUnityEvent", json)
    fun onUnityEvent(json: String) {
        UnityBridgeModule.instance?.sendEvent("onUnityEvent", json)

        // If Unity says it closed, finish this Activity to return to RN
        if (json.contains("\"type\":\"closed\"")) {
            finish()
        }
    }
}
