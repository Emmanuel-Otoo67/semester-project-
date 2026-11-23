package com.libtrack.platform.config;

import org.springframework.beans.factory.annotation.Value;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.client.RestClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;

@Configuration
@Profile("!local-dev")
public class SupabaseJwtConfiguration {
    @Bean
    JwtDecoder jwtDecoder(
            @Value("${supabase.auth.issuer-uri}") String issuer,
            @Value("${supabase.auth.audience:authenticated}") String audience,
            @Value("${supabase.auth.jwt-mode:JWKS}") String jwtMode,
            @Value("${supabase.auth.publishable-key:}") String publishableKey,
            RestClient.Builder restClientBuilder,
            ObjectMapper mapper) {
        if ("LEGACY_HS256".equalsIgnoreCase(jwtMode)) {
            if (publishableKey.isBlank()) throw new IllegalStateException("SUPABASE_AUTH_PUBLISHABLE_KEY is required for LEGACY_HS256 validation.");
            return new com.libtrack.platform.auth.LegacySupabaseJwtDecoder(issuer, audience, publishableKey, restClientBuilder, mapper);
        }
        if (!"JWKS".equalsIgnoreCase(jwtMode)) throw new IllegalStateException("SUPABASE_AUTH_JWT_MODE must be JWKS or LEGACY_HS256.");
        var decoder = NimbusJwtDecoder.withJwkSetUri(issuer.replaceAll("/$", "") + "/.well-known/jwks.json").build();
        OAuth2TokenValidator<Jwt> issuerAndTime = JwtValidators.createDefaultWithIssuer(issuer);
        OAuth2TokenValidator<Jwt> audienceValidator = jwt -> jwt.getAudience().contains(audience)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new org.springframework.security.oauth2.core.OAuth2Error(
                        "invalid_token", "The access token is not intended for this API.", null));
        decoder.setJwtValidator(jwt -> {
            var issuerResult = issuerAndTime.validate(jwt);
            return issuerResult.hasErrors() ? issuerResult : audienceValidator.validate(jwt);
        });
        return decoder;
    }
}
