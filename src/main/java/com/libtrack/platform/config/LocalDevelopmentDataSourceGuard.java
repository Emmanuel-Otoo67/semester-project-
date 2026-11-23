package com.libtrack.platform.config;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.EnvironmentAware;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.net.URI;

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
        assertLoopbackJdbcUrl(environment.getProperty("spring.datasource.url"));
        assertLoopbackJdbcUrl(environment.getProperty("spring.flyway.url"));
    }

    public static void assertLoopbackJdbcUrl(String jdbcUrl) {
        try {
            if (jdbcUrl == null || !jdbcUrl.startsWith("jdbc:postgresql://")) {
                throw new IllegalArgumentException();
            }
            String host = URI.create(jdbcUrl.substring("jdbc:".length())).getHost();
            if (host == null) {
                throw new IllegalArgumentException();
            }
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
}
