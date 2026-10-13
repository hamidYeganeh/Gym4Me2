package com.gym4me.app;

import android.content.Context;
import android.security.NetworkSecurityPolicy;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.net.URL;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLHandshakeException;
import static org.junit.Assert.*;
import static org.junit.Assume.assumeTrue;

/** Run on the isolated staging variant with adb reverse tcp:7443 tcp:7443. */
@RunWith(AndroidJUnit4.class)
public class StagingConnectivityTest {
    @Before public void stagingOnly() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assumeTrue(context.getPackageName().equals("com.gym4me.app.staging"));
    }
    private HttpsURLConnection connection(String host, String path) throws Exception {
        HttpsURLConnection conn = (HttpsURLConnection) new URL("https://" + host + ":7443/api/v1/" + path).openConnection();
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(10000);
        conn.setInstanceFollowRedirects(false);
        return conn;
    }
    @Test public void trustedLocalhostReachesHealthyDatabaseAndStorage() throws Exception {
        HttpsURLConnection conn = connection("localhost", "system/health/ready");
        try {
            assertEquals(200, conn.getResponseCode());
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (InputStream input = conn.getInputStream()) {
                byte[] buffer = new byte[4096];
                int length;
                while ((length = input.read(buffer)) != -1) {
                    bytes.write(buffer, 0, length);
                    assertTrue("Unexpectedly large readiness response", bytes.size() <= 65536);
                }
            }
            String body = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
            JSONObject health = new JSONObject(body);
            assertEquals("gym4me-api", health.getString("service"));
            assertEquals("up", health.getJSONObject("checks").getString("database"));
            assertEquals("up", health.getJSONObject("checks").getString("storage"));
        } finally { conn.disconnect(); }
    }
    @Test public void nativeAccountRequiresSession() throws Exception {
        HttpsURLConnection conn = connection("localhost", "profile/account");
        conn.setRequestProperty("x-gym-client", "application");
        conn.setRequestProperty("x-gym-platform", "native");
        conn.setRequestProperty("Origin", "https://localhost");
        try { assertEquals(401, conn.getResponseCode()); }
        finally { conn.disconnect(); }
    }
    @Test public void localCaIsNotTrustedOutsideExactLocalhostDomain() throws Exception {
        // Certificate includes the IP, so a failure here proves the CA's domain
        // scope, not just hostname mismatch. Never install a permissive verifier.
        HttpsURLConnection conn = connection("127.0.0.1", "system/health/ready");
        try {
            conn.getResponseCode();
            fail("Local CA unexpectedly trusted outside localhost");
        } catch (SSLHandshakeException expected) {
            assertNotNull(expected.getCause());
        } finally { conn.disconnect(); }
        assertFalse(NetworkSecurityPolicy.getInstance().isCleartextTrafficPermitted("localhost"));
    }
}
