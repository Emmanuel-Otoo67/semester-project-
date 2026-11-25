package com.libtrack.platform.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;

@Service
public class StudentAccountRegistrationService {
    private final StudentIdentityRepository students;
    private final RestClient authClient;
    private final String publishableKey;

    public StudentAccountRegistrationService(StudentIdentityRepository students,
            RestClient.Builder restClientBuilder,
            @Value("${supabase.auth.issuer-uri}") String issuer,
            @Value("${supabase.auth.publishable-key:}") String publishableKey) {
        this.students = students;
        this.authClient = restClientBuilder.baseUrl(issuer.replaceAll("/$", "") + "/").build();
        this.publishableKey = publishableKey;
    }

    public void register(String indexNumber, org.springframework.security.oauth2.jwt.Jwt jwt) {
        final UUID authUserId;
        try {
            authUserId = UUID.fromString(jwt.getSubject());
        } catch (RuntimeException exception) {
            throw new StudentAccessDeniedException("This account cannot be linked to a student record.");
        }

        if (publishableKey.isBlank()) {
            throw new IllegalStateException("SUPABASE_AUTH_PUBLISHABLE_KEY must be configured to verify student email addresses.");
        }
        Map<?, ?> user;
        try {
            user = authClient.get().uri("user")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.getTokenValue())
                    .header("apikey", publishableKey)
                    .retrieve().body(Map.class);
        } catch (Exception exception) {
            throw new StudentAccessDeniedException("Could not verify your email with Supabase. Please sign in again and retry.");
        }

        if (user == null || !authUserId.toString().equals(String.valueOf(user.get("id")))) {
            throw new StudentAccessDeniedException("Supabase could not confirm this account.");
        }
        String confirmedAt = user.get("email_confirmed_at") == null
                ? (user.get("confirmed_at") == null ? null : String.valueOf(user.get("confirmed_at")))
                : String.valueOf(user.get("email_confirmed_at"));
        if (confirmedAt == null || confirmedAt.isBlank()) {
            throw new StudentAccessDeniedException("Confirm your email address before linking your student account.");
        }
        String verifiedEmail = user.get("email") == null ? "" : String.valueOf(user.get("email")).trim();
        if (verifiedEmail.isBlank()) {
            throw new StudentAccessDeniedException("Supabase did not return a verified email address for this account.");
        }

        if (!students.linkByVerifiedEmail(indexNumber.trim(), verifiedEmail, authUserId)) {
            throw new StudentAccessDeniedException("We couldn't match that student index number and verified email to an active student record. Check both details with the library.");
        }
    }
}
