package com.libtrack.platform.config;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.EnvironmentAware;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.net.URLDecoder;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Component
@Profile("local-dev")
public class LocalDevelopmentDataSourceGuard implements BeanFactoryPostProcessor, EnvironmentAware {
    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void postProcessBeanFactory(
            org.springframework.beans.factory.config.ConfigurableListableBeanFactory beanFactory) {
        assertLoopbackServerAddress(environment.getProperty("server.address"));
        assertLoopbackJdbcUrl(environment.getProperty("spring.datasource.url"));
        assertLoopbackJdbcUrl(environment.getProperty("spring.flyway.url"));
    }

    public static void assertLoopbackServerAddress(String address) {
        if (address == null) {
            throw new IllegalStateException(
                    "Local development requires the API server to bind to 127.0.0.1, ::1, or localhost.");
        }
        String normalized = address.trim().toLowerCase(Locale.ROOT);
        if (!normalized.equals("127.0.0.1") && !normalized.equals("::1") && !normalized.equals("localhost")) {
            throw new IllegalStateException(
                    "Local development requires the API server to bind to 127.0.0.1, ::1, or localhost.");
        }
    }

    public static void assertLoopbackJdbcUrl(String jdbcUrl) {
        try {
            if (jdbcUrl == null || !jdbcUrl.startsWith("jdbc:postgresql://")) {
                throw new IllegalArgumentException();
            }
            URI uri = URI.create(jdbcUrl.substring("jdbc:".length()));
            String host = uri.getHost();
            if (host == null || uri.getRawAuthority() == null || uri.getRawAuthority().contains(",")
                    || uri.getRawFragment() != null) {
                throw new IllegalArgumentException();
            }
            rejectHostOverrideParameters(uri.getRawQuery());
            host = host.toLowerCase();
            if (host.startsWith("[") && host.endsWith("]")) {
                host = host.substring(1, host.length() - 1);
            }
            if (!host.equals("localhost") && !host.equals("127.0.0.1") && !host.equals("::1")) {
                throw new IllegalArgumentException();
            }
        } catch (RuntimeException invalidUrl) {
            throw new IllegalStateException(
                    "Local development requires a valid PostgreSQL JDBC URL using localhost, 127.0.0.1, or [::1].",
                    invalidUrl);
        }
    }

    private static void rejectHostOverrideParameters(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) return;
        for (String parameter : rawQuery.split("&")) {
            String rawName = parameter.split("=", 2)[0];
            String name = URLDecoder.decode(rawName, StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
            if (name.equals("host") || name.equals("hostaddr")) {
                throw new IllegalArgumentException();
            }
        }
    }
}
