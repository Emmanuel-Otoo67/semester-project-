package com.libtrack.platform.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

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

    @Test
    void rejectsRemoteHostAddressOverrideOnLoopbackJdbcAuthority() {
        assertThrows(IllegalStateException.class,
                () -> LocalDevelopmentDataSourceGuard.assertLoopbackJdbcUrl(
                        "jdbc:postgresql://localhost:5433/libtrack?hostaddr=203.0.113.25"));
    }

    @Test
    void rejectsHostOverrideOnLoopbackJdbcAuthority() {
        assertThrows(IllegalStateException.class,
                () -> LocalDevelopmentDataSourceGuard.assertLoopbackJdbcUrl(
                        "jdbc:postgresql://localhost:5433/libtrack?host=database.example.com"));
    }

    @Test
    void allowsOnlyLoopbackServerAddresses() {
        assertDoesNotThrow(() -> LocalDevelopmentDataSourceGuard.assertLoopbackServerAddress("127.0.0.1"));
        assertDoesNotThrow(() -> LocalDevelopmentDataSourceGuard.assertLoopbackServerAddress("::1"));
        assertDoesNotThrow(() -> LocalDevelopmentDataSourceGuard.assertLoopbackServerAddress("localhost"));
        assertThrows(IllegalStateException.class,
                () -> LocalDevelopmentDataSourceGuard.assertLoopbackServerAddress("0.0.0.0"));
        assertThrows(IllegalStateException.class,
                () -> LocalDevelopmentDataSourceGuard.assertLoopbackServerAddress("192.0.2.10"));
        assertThrows(IllegalStateException.class,
                () -> LocalDevelopmentDataSourceGuard.assertLoopbackServerAddress(null));
    }

    @Test
    void startupGuardRejectsAnOverriddenWildcardBindAddress() {
        var environment = new MockEnvironment()
                .withProperty("spring.datasource.url", "jdbc:postgresql://127.0.0.1:5433/libtrack")
                .withProperty("spring.flyway.url", "jdbc:postgresql://127.0.0.1:5433/libtrack")
                .withProperty("server.address", "0.0.0.0");
        var guard = new LocalDevelopmentDataSourceGuard();
        guard.setEnvironment(environment);

        assertThrows(IllegalStateException.class,
                () -> guard.postProcessBeanFactory(mock(ConfigurableListableBeanFactory.class)));
    }
}
