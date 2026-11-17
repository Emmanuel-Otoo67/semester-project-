package com.libtrack.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "libtrack.cors")
public record CorsSettings(List<String> allowedOrigins) {}
