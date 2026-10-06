package com.biit_timetable.alarms

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

/** Fires a scheduled class alarm, then re-arms it for the same time next week. */
class ClassAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    if (intent.action != ClassAlarmScheduler.ACTION_FIRE) return
    val event = JSONObject(intent.getStringExtra(ClassAlarmScheduler.EXTRA_EVENT) ?: return)
    val fireAt = intent.getLongExtra(ClassAlarmScheduler.EXTRA_FIRE_AT, 0L)
    val now = System.currentTimeMillis()

    // skip alarms delivered very late (phone was off): the class has already started
    if (now - fireAt < STALE_MS) {
      when (event.optString("type")) {
        "reminder" -> showReminder(ctx, event)
        "vibrate" -> ClassAlarmScheduler.setVibrate(ctx)
        "ring" -> ClassAlarmScheduler.restoreRinger(ctx)
      }
    } else if (event.optString("type") == "ring") {
      ClassAlarmScheduler.restoreRinger(ctx) // still undo vibrate, even if late
    }

    ClassAlarmScheduler.schedule(ctx, event, now + 60_000)
  }

  private fun showReminder(ctx: Context, event: JSONObject) {
    val manager = NotificationManagerCompat.from(ctx)
    if (!manager.areNotificationsEnabled()) return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Class reminders", NotificationManager.IMPORTANCE_HIGH)
      channel.description = "Alert 10 minutes before each class starts"
      ctx.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    val openApp = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.let {
      PendingIntent.getActivity(ctx, 0, it, PendingIntent.FLAG_IMMUTABLE)
    }

    val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_popup_reminder)
      .setContentTitle(event.optString("title"))
      .setContentText(event.optString("body"))
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setAutoCancel(true)
      .setContentIntent(openApp)
      .build()

    try {
      manager.notify(event.getInt("id"), notification)
    } catch (e: SecurityException) {
      // notification permission revoked
    }
  }

  companion object {
    private const val CHANNEL_ID = "class_reminders"
    private const val STALE_MS = 15 * 60 * 1000L
  }
}

/** Alarms are wiped on reboot and app update; put them back. */
class ClassAlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> ClassAlarmScheduler.scheduleStored(ctx)
    }
  }
}
