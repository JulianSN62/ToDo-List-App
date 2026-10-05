package com.todolistapp.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins propios de la app: se registran antes de crear el puente.
        registerPlugin(DeviceSettingsPlugin.class);
        registerPlugin(PinnedNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
