package com.gym4me.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.phone.SmsRetriever;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.common.api.Status;

/** Receives only app-addressed SMS via Play services. No SMS inbox permission. */
@CapacitorPlugin(name = "SmsOtp")
public class SmsOtpPlugin extends Plugin {
    private BroadcastReceiver receiver;
    private String requestId;

    @PluginMethod
    public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopReceiver();
            requestId = call.getString("id");
            if (requestId == null) { call.reject("Missing request id"); return; }
            final String id = requestId;
            receiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (!SmsRetriever.SMS_RETRIEVED_ACTION.equals(intent.getAction())) return;
                    Bundle extras = intent.getExtras();
                    if (extras == null) return;
                    Status status = (Status) extras.get(SmsRetriever.EXTRA_STATUS);
                    if (status == null) return;
                    if (status.getStatusCode() == CommonStatusCodes.SUCCESS) {
                        String code = SmsOtpCode.extract(extras.getString(SmsRetriever.EXTRA_SMS_MESSAGE));
                        stopReceiver();
                        if (code != null) {
                            JSObject result = new JSObject();
                            result.put("code", code);
                            notifyListeners("codeReceived", result);
                        }
                    } else if (status.getStatusCode() == CommonStatusCodes.TIMEOUT) {
                        stopReceiver();
                    }
                }
            };
            try {
                ContextCompat.registerReceiver(getContext(), receiver,
                    new IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION),
                    SmsRetriever.SEND_PERMISSION, null, ContextCompat.RECEIVER_EXPORTED);
                SmsRetriever.getClient(getContext()).startSmsRetriever()
                    .addOnSuccessListener(ignored -> call.resolve())
                    .addOnFailureListener(error -> {
                        if (id.equals(requestId)) stopReceiver();
                        call.reject("SMS retrieval unavailable");
                    });
            } catch (Exception ignored) {
                stopReceiver();
                call.reject("SMS retrieval unavailable");
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (call.getString("id") != null && call.getString("id").equals(requestId)) stopReceiver();
            call.resolve();
        });
    }

    private void stopReceiver() {
        if (receiver != null) {
            try { getContext().unregisterReceiver(receiver); }
            catch (IllegalArgumentException ignored) { /* Registration failed or already removed. */ }
            receiver = null;
            requestId = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopReceiver();
    }
}
