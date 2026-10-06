package com.biit_timetable.alarms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/**
 * Weekly class alarms: reminders before a class, and switching the ringer to vibrate
 * during class. JS sends the full list of events; each event has an `at` time for this
 * week and repeats every 7 days. The list is kept in SharedPreferences so the alarms can
 * be restored after a reboot, and each alarm re-arms itself for next week when it fires.
 *
 * Event JSON: { id, type: "reminder" | "vibrate" | "ring", at (epoch ms), title?, body? }
 */
object ClassAlarmScheduler {
  const val ACTION_FIRE = "com.biit_timetable.alarms.FIRE"
  const val EXTRA_EVENT = "event"
  const val EXTRA_FIRE_AT = "fireAt"

  private const val PREFS = "class_alarms"
  private const val KEY_EVENTS = "events"
  private const val KEY_IDS = "scheduledIds"
  private const val KEY_WE_SET_VIBRATE = "weSetVibrate"
  private const val WEEK_MS = 7L * 24 * 60 * 60 * 1000

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Replace every scheduled alarm with this list (a JSON array string). */
  fun replaceAll(ctx: Context, eventsJson: String) {
    cancelAll(ctx)
    val events = JSONArray(eventsJson)
    prefs(ctx).edit().putString(KEY_EVENTS, events.toString()).apply()
    // vibrate turned off (or no classes left) while the phone is in vibrate because of us
    if (!hasType(events, "vibrate")) restoreRinger(ctx)
    scheduleStored(ctx)
  }

  fun clear(ctx: Context) {
    cancelAll(ctx)
    prefs(ctx).edit().remove(KEY_EVENTS).remove(KEY_IDS).apply()
    restoreRinger(ctx)
  }

  /** (Re)schedule the saved list, e.g. after a reboot. */
  fun scheduleStored(ctx: Context) {
    val events = JSONArray(prefs(ctx).getString(KEY_EVENTS, "[]"))
    val ids = ArrayList<Int>()
    for (i in 0 until events.length()) {
      val event = events.getJSONObject(i)
      schedule(ctx, event, System.currentTimeMillis())
      ids.add(event.getInt("id"))
    }
    prefs(ctx).edit().putString(KEY_IDS, ids.joinToString(",")).apply()
  }

  /** Schedule the event's next weekly occurrence after [after]. */
  fun schedule(ctx: Context, event: JSONObject, after: Long) {
    val fireAt = nextOccurrence(event.getLong("at"), after)
    val alarmManager = ctx.getSystemService(AlarmManager::class.java)
    val pending = pendingIntent(ctx, event.getInt("id"), event.toString(), fireAt)
    if (canScheduleExact(ctx)) {
      alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pending)
    } else {
      // without the "Alarms & reminders" permission Android may deliver a few minutes late
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pending)
    }
  }

  fun canScheduleExact(ctx: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
      ctx.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()

  /** Class started: vibrate, but only if the phone is on normal ring (don't touch silent). */
  fun setVibrate(ctx: Context) {
    val audio = ctx.getSystemService(AudioManager::class.java)
    if (audio.ringerMode != AudioManager.RINGER_MODE_NORMAL) return
    try {
      audio.ringerMode = AudioManager.RINGER_MODE_VIBRATE
      prefs(ctx).edit().putBoolean(KEY_WE_SET_VIBRATE, true).apply()
    } catch (e: SecurityException) {
      // some phones block this without Do Not Disturb access; nothing else to do
    }
  }

  /** Class ended: ring again, but only if we were the ones who switched to vibrate. */
  fun restoreRinger(ctx: Context) {
    val p = prefs(ctx)
    if (!p.getBoolean(KEY_WE_SET_VIBRATE, false)) return
    p.edit().putBoolean(KEY_WE_SET_VIBRATE, false).apply()
    val audio = ctx.getSystemService(AudioManager::class.java)
    if (audio.ringerMode != AudioManager.RINGER_MODE_VIBRATE) return // user changed it meanwhile
    try {
      audio.ringerMode = AudioManager.RINGER_MODE_NORMAL
    } catch (e: SecurityException) {
    }
  }

  private fun nextOccurrence(at: Long, after: Long): Long {
    if (at > after) return at
    val weeks = (after - at) / WEEK_MS + 1
    return at + weeks * WEEK_MS
  }

  private fun hasType(events: JSONArray, type: String): Boolean {
    for (i in 0 until events.length()) if (events.getJSONObject(i).optString("type") == type) return true
    return false
  }

  private fun pendingIntent(ctx: Context, id: Int, eventJson: String?, fireAt: Long): PendingIntent {
    // extras don't affect matching, so cancel() finds the alarm by request code alone
    val intent = Intent(ctx, ClassAlarmReceiver::class.java).setAction(ACTION_FIRE)
    if (eventJson != null) intent.putExtra(EXTRA_EVENT, eventJson).putExtra(EXTRA_FIRE_AT, fireAt)
    return PendingIntent.getBroadcast(
      ctx, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun cancelAll(ctx: Context) {
    val alarmManager = ctx.getSystemService(AlarmManager::class.java)
    prefs(ctx).getString(KEY_IDS, "")!!
      .split(",")
      .mapNotNull { it.toIntOrNull() }
      .forEach { alarmManager.cancel(pendingIntent(ctx, it, null, 0)) }
  }
}
