package com.todolistapp.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Ajustes del sistema que el plugin oficial de notificaciones no cubre (Ajustes → Notificaciones,
// spec 9.5): saber si Android optimiza la batería de la app y abrir las pantallas para cambiarlo.
@CapacitorPlugin(name = "DeviceSettings")
public class DeviceSettingsPlugin extends Plugin {

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        JSObject result = new JSObject();
        result.put(
            "value",
            power != null && power.isIgnoringBatteryOptimizations(getContext().getPackageName())
        );
        call.resolve(result);
    }

    // Lista de apps con optimización de batería. No hace falta ningún permiso: pedir la exclusión
    // directa necesita REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, que Google Play restringe.
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        open(call, new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            open(call, intent);
        } else {
            open(call, appDetails());
        }
    }

    private Intent appDetails() {
        return new Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:" + getContext().getPackageName())
        );
    }

    // Si el fabricante no tiene esa pantalla, se abre la ficha de la app.
    private void open(PluginCall call, Intent intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (Exception error) {
            Intent fallback = appDetails();
            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(fallback);
            } catch (Exception ignored) {
                call.reject("No se pudo abrir el ajuste del sistema");
                return;
            }
        }
        call.resolve();
    }
}
