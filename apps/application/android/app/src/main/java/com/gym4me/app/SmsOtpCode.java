package com.gym4me.app;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class SmsOtpCode {
    private static final Pattern CODE = Pattern.compile("Gym4Me[^\\r\\n]*?\\b([0-9]{5})\\b", Pattern.CASE_INSENSITIVE);
    static String extract(String message) {
        if (message == null) return null;
        Matcher match = CODE.matcher(message);
        return match.find() ? match.group(1) : null;
    }
}
