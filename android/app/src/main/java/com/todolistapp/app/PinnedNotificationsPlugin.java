package com.todolistapp.app;

import android.content.Intent;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

// Puente con la app para las tareas ancladas (PinnedNotifications.java): sync() recibe la lista
// completa en cada reconciliación y el evento "tap" avisa qué tarea abrir al tocar una.
@CapacitorPlugin(name = "PinnedNotifications")
public class PinnedNotificationsPlugin extends Plugin {

    @Override
    public void load() {
        // La app pudo arrancar desde una anclada (la actividad no existía).
        if (getActivity() != null) handleTap(getActivity().getIntent());
    }

    @PluginMethod
    public void sync(PluginCall call) {
        JSArray items = call.getArray("items", new JSArray());
        PinnedNotifications.sync(getContext(), items == null ? new JSONArray() : items);
        call.resolve();
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handleTap(intent);
    }

    private void handleTap(Intent intent) {
        if (intent == null || !PinnedNotifications.ACTION_OPEN.equals(intent.getAction())) return;
        String taskId = intent.getStringExtra(PinnedNotifications.EXTRA_TASK_ID);
        // Se consume una sola vez (si no, se volvería a abrir al recrear la actividad).
        intent.removeExtra(PinnedNotifications.EXTRA_TASK_ID);
        if (taskId == null || taskId.isEmpty()) return;
        JSObject data = new JSObject();
        data.put("taskId", taskId);
        // Se retiene hasta que la app registre el listener (arranque desde la notificación).
        notifyListeners("tap", data, true);
    }
}
