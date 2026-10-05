package com.todolistapp.app;

import android.app.Notification;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

// Notificaciones fijas de las tareas ancladas (spec 9.6, Opción 2). La app guarda la lista en
// SharedPreferences cada vez que reconcilia; así se pueden volver a mostrar al reiniciar el
// teléfono o al actualizar la app (PinnedNotificationReceiver) sin abrir la app. Si el usuario
// la descarta (Android 14 o más permite deslizar las "en curso"), se vuelve a mostrar: solo se
// quita desanclando desde la app.
final class PinnedNotifications {

    static final String CHANNEL_ID = "pinned";
    static final String ACTION_OPEN = "com.todolistapp.app.OPEN_PINNED";
    static final String ACTION_DISMISSED = "com.todolistapp.app.PINNED_DISMISSED";
    static final String EXTRA_TASK_ID = "todoPinnedTaskId";
    static final String EXTRA_ID = "todoPinnedId";

    private static final String PREFS = "todo_pinned_notifications";
    private static final String KEY_ITEMS = "items";

    private PinnedNotifications() {}

    static JSONArray load(Context context) {
        String raw = prefs(context).getString(KEY_ITEMS, "[]");
        try {
            return new JSONArray(raw);
        } catch (JSONException error) {
            return new JSONArray();
        }
    }

    /** Reemplaza la lista: quita las que ya no están y muestra (o actualiza) las demás. */
    static void sync(Context context, JSONArray items) {
        Set<Integer> keep = ids(items);
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        for (Integer id : ids(load(context))) {
            if (!keep.contains(id)) manager.cancel(id);
        }
        prefs(context).edit().putString(KEY_ITEMS, items.toString()).apply();
        postAll(context);
    }

    static void postAll(Context context) {
        JSONArray items = load(context);
        for (int index = 0; index < items.length(); index++) {
            JSONObject item = items.optJSONObject(index);
            if (item != null) post(context, item);
        }
    }

    /** Vuelve a mostrar una anclada que se descartó, si sigue en la lista. */
    static void repost(Context context, int id) {
        JSONArray items = load(context);
        for (int index = 0; index < items.length(); index++) {
            JSONObject item = items.optJSONObject(index);
            if (item != null && item.optInt("id", Integer.MIN_VALUE) == id) {
                post(context, item);
                return;
            }
        }
    }

    private static void post(Context context, JSONObject item) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return;
        int id = item.optInt("id", Integer.MIN_VALUE);
        String taskId = item.optString("taskId", "");
        if (id == Integer.MIN_VALUE || taskId.isEmpty()) return;
        String title = item.optString("title", "");
        String body = item.optString("body", "");

        Intent open = new Intent(context, MainActivity.class);
        open.setAction(ACTION_OPEN);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        open.putExtra(EXTRA_TASK_ID, taskId);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent content = PendingIntent.getActivity(context, id, open, flags);

        Intent dismissed = new Intent(context, PinnedNotificationReceiver.class);
        dismissed.setAction(ACTION_DISMISSED);
        dismissed.putExtra(EXTRA_ID, id);
        PendingIntent delete = PendingIntent.getBroadcast(context, id, dismissed, flags);

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setColor(ContextCompat.getColor(context, R.color.notification_accent))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setContentIntent(content)
            .setDeleteIntent(delete)
            .build();
        try {
            manager.notify(id, notification);
        } catch (SecurityException error) {
            // Sin permiso de notificaciones: la lista queda guardada para cuando lo haya.
        }
    }

    private static Set<Integer> ids(JSONArray items) {
        Set<Integer> result = new HashSet<>();
        for (int index = 0; index < items.length(); index++) {
            JSONObject item = items.optJSONObject(index);
            if (item != null && item.has("id")) result.add(item.optInt("id"));
        }
        return result;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
