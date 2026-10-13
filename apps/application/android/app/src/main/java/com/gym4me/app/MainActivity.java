package com.gym4me.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmsOtpPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
