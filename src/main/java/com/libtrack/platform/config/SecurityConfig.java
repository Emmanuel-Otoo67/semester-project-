package com.libtrack.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
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
import com.libtrack.platform.auth.StudentIdentityService;
import com.libtrack.platform.auth.StudentAccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.MediaType;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableConfigurationProperties(CorsSettings.class)
public class SecurityConfig {
    @Bean
    @Profile("local-dev")
    SecurityFilterChain localDevelopmentSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }

    @Bean
    @Profile("!local-dev")
    SecurityFilterChain securityFilterChain(HttpSecurity http, StaffIdentityService staffIdentityService, StudentIdentityService studentIdentityService) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/api/v1/health").permitAll()
                        .requestMatchers("/api/v1/student-registration", "/api/v1/student-registration/**").authenticated()
                        .requestMatchers("/api/v1/session").access(sessionAuthorizationManager(staffIdentityService, studentIdentityService))
                        .requestMatchers("/api/v1/student/**").access(studentAuthorizationManager(studentIdentityService))
                        .anyRequest().access(staffAuthorizationManager(staffIdentityService)))
                .exceptionHandling(exceptions -> exceptions.accessDeniedHandler(staffDeniedHandler()))
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
                .build();
    }

    private AuthorizationManager<RequestAuthorizationContext> sessionAuthorizationManager(StaffIdentityService staff, StudentIdentityService students) {
        return (authentication, context) -> {
            var current = authentication.get();
            if (current == null || !current.isAuthenticated() || !(current.getPrincipal() instanceof Jwt jwt)) return new AuthorizationDecision(false);
            try { staff.requireCurrentStaff(jwt); return new AuthorizationDecision(true); }
            catch (StaffAccessDeniedException denied) {
                try { students.requireCurrentStudent(jwt); return new AuthorizationDecision(true); }
                catch (StudentAccessDeniedException ignored) { return new AuthorizationDecision(false); }
            }
        };
    }

    private AuthorizationManager<RequestAuthorizationContext> studentAuthorizationManager(StudentIdentityService identities) {
        return (authentication, context) -> {
            var current = authentication.get();
            if (current == null || !current.isAuthenticated() || !(current.getPrincipal() instanceof Jwt jwt)) return new AuthorizationDecision(false);
            try { identities.requireCurrentStudent(jwt); return new AuthorizationDecision(true); }
            catch (StudentAccessDeniedException denied) { return new AuthorizationDecision(false); }
        };
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
            if (request.getRequestURI().equals("/api/v1/student-registration")
                    || request.getRequestURI().startsWith("/api/v1/student-registration/")) {
                response.getWriter().write("{\"title\":\"Student signup required\",\"status\":403,\"detail\":\"Sign in with the student account you are creating, then submit the student signup form again.\"}");
            } else if (request.getRequestURI().startsWith("/api/v1/student/")) {
                response.getWriter().write("{\"title\":\"Student access required\",\"status\":403,\"detail\":\"This Supabase account is not linked to an active LibTrack student.\"}");
            } else if (request.getRequestURI().equals("/api/v1/session")) {
                response.getWriter().write("{\"title\":\"LibTrack profile not found\",\"status\":403,\"detail\":\"This account does not have a LibTrack profile yet. Students can create their account and profile together from the student signup form.\"}");
            } else {
                response.getWriter().write("{\"title\":\"Staff access required\",\"status\":403,\"detail\":\"This Supabase account is not linked to an active LibTrack staff account.\"}");
            }
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
