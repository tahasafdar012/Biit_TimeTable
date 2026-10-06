package com.biit_timetable.alarms

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

/** JS side: NativeModules.ClassAlarms (see src/services/classAlerts.js). */
class ClassAlarmsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "ClassAlarms"

  @ReactMethod
  fun setSchedule(eventsJson: String, promise: Promise) {
    try {
      ClassAlarmScheduler.replaceAll(reactApplicationContext, eventsJson)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_SCHEDULE", e)
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    try {
      ClassAlarmScheduler.clear(reactApplicationContext)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_CLEAR", e)
    }
  }

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    promise.resolve(ClassAlarmScheduler.canScheduleExact(reactApplicationContext))
  }

  /** Android 12+: the "Alarms & reminders" screen for this app, for on-time alerts. */
  @ReactMethod
  fun openExactAlarmSettings() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
      .setData(Uri.parse("package:" + reactApplicationContext.packageName))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(intent)
  }
}

class ClassAlarmsPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(ClassAlarmsModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
