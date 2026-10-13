package com.gym4me.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class SmsOtpCodeTest {
    @Test public void extractsOnlyTheBrandedFiveDigitCode() {
        assertEquals("12345", SmsOtpCode.extract("<#> کد Gym4Me: 12345\nاین کد را در اختیار دیگران نگذارید.\nz5rk2X8HKrl"));
        assertNull(SmsOtpCode.extract(null));
        assertNull(SmsOtpCode.extract("Another app: 12345"));
        assertNull(SmsOtpCode.extract("Gym4Me: 123456"));
        assertNull(SmsOtpCode.extract("Gym4Me\n12345hashXY"));
    }
}
