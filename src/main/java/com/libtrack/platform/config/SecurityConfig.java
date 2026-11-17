package com.libtrack.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.security.config.Customizer;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import com.libtrack.platform.auth.StaffAccessDeniedException;
import com.libtrack.platform.auth.StaffIdentityService;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.MediaType;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableConfigurationProperties(CorsSettings.class)
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, StaffIdentityService staffIdentityService) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/api/v1/health").permitAll()
                        .anyRequest().access(staffAuthorizationManager(staffIdentityService)))
                .exceptionHandling(exceptions -> exceptions.accessDeniedHandler(staffDeniedHandler()))
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
                .build();
    }

    private AuthorizationManager<RequestAuthorizationContext> staffAuthorizationManager(StaffIdentityService identities) {
        return (authentication, context) -> {
            var current = authentication.get();
            if (current == null || !current.isAuthenticated() || !(current.getPrincipal() instanceof Jwt jwt))
                return new AuthorizationDecision(false);
            try {
                identities.requireCurrentStaff(jwt);
                return new AuthorizationDecision(true);
            } catch (StaffAccessDeniedException denied) {
                return new AuthorizationDecision(false);
            }
        };
    }

    private AccessDeniedHandler staffDeniedHandler() {
        return (request, response, denied) -> {
            response.setStatus(403);
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"title\":\"Staff access required\",\"status\":403,\"detail\":\"This Supabase account is not linked to an active LibTrack staff account.\"}");
        };
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(CorsSettings settings) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(settings.allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Request-Id"));
        configuration.setExposedHeaders(List.of("X-Request-Id"));
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
