package com.todolistapp.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Vuelve a mostrar las tareas ancladas al reiniciar el teléfono o al actualizar la app, y la
// que el usuario descartó de la barra (spec 9.6: solo se quitan desanclando desde la app).
public class PinnedNotificationReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (PinnedNotifications.ACTION_DISMISSED.equals(action)) {
            int id = intent.getIntExtra(PinnedNotifications.EXTRA_ID, Integer.MIN_VALUE);
            if (id != Integer.MIN_VALUE) PinnedNotifications.repost(context, id);
        } else if (
            Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
        ) {
            PinnedNotifications.postAll(context);
        }
    }
}
