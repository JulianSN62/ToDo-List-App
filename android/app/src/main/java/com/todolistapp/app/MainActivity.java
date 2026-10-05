package com.todolistapp.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins propios de la app: se registran antes de crear el puente.
        registerPlugin(DeviceSettingsPlugin.class);
        registerPlugin(PinnedNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
        // Pantalla de borde a borde también antes de Android 15 (desde el 15 es obligatoria):
        // barras transparentes y la app dibuja detrás, con las áreas seguras por CSS
        // (plugin SystemBars). Sin esto, en Android 12 a 14 las barras quedaban grises.
        EdgeToEdge.enable(this);
    }
}
