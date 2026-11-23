package com.libtrack.platform.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalDevelopmentDataSourceGuardTest {
    @Test
    void acceptsIpv4Loopback() {
        assertDoesNotThrow(() -> LocalDevelopmentDataSourceGuard.assertLoopbackJdbcUrl(
                "jdbc:postgresql://127.0.0.1:5433/libtrack"));
    }

    @Test
    void acceptsLocalhost() {
        assertDoesNotThrow(() -> LocalDevelopmentDataSourceGuard.assertLoopbackJdbcUrl(
                "jdbc:postgresql://localhost:5433/libtrack"));
    }

    @Test
    void acceptsIpv6Loopback() {
        assertDoesNotThrow(() -> LocalDevelopmentDataSourceGuard.assertLoopbackJdbcUrl(
                "jdbc:postgresql://[::1]:5433/libtrack"));
    }

    @Test
    void rejectsRemoteHostWithoutExposingCredentials() {
        var error = assertThrows(IllegalStateException.class,
                () -> LocalDevelopmentDataSourceGuard.assertLoopbackJdbcUrl(
                        "jdbc:postgresql://user:secret@db.example.com:5432/libtrack"));

        assertTrue(error.getMessage().contains("localhost"));
        assertTrue(!error.getMessage().contains("secret"));
    }

    @Test
    void rejectsMalformedAndNonPostgresqlUrls() {
        assertThrows(IllegalStateException.class,
                () -> LocalDevelopmentDataSourceGuard.assertLoopbackJdbcUrl("not-a-jdbc-url"));
        assertThrows(IllegalStateException.class,
                () -> LocalDevelopmentDataSourceGuard.assertLoopbackJdbcUrl("jdbc:mysql://localhost/libtrack"));
    }
}
