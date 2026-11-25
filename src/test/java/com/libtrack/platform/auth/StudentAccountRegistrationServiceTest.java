package com.libtrack.platform.auth;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class StudentAccountRegistrationServiceTest {
    private static final UUID AUTH_ID = UUID.fromString("e656db25-382b-4d50-8910-9b1626039f93");
    private static final String EMAIL = "student@example.edu";
    private final StudentIdentityRepository students = mock(StudentIdentityRepository.class);

    @Test
    void linksOnlyAfterSupabaseConfirmsTheTokenAndEmail() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://project.supabase.co/auth/v1/user"))
                .andExpect(header("apikey", "public-key"))
                .andExpect(header("Authorization", "Bearer test-token"))
                .andRespond(withSuccess("""
                        {"id":"%s","email":"%s","email_confirmed_at":"2026-11-25T12:00:00Z"}
                        """.formatted(AUTH_ID, EMAIL), org.springframework.http.MediaType.APPLICATION_JSON));
        when(students.linkByVerifiedEmail("S-101", EMAIL, AUTH_ID)).thenReturn(true);
        StudentAccountRegistrationService service = new StudentAccountRegistrationService(
                students, builder, "https://project.supabase.co/auth/v1", "public-key");

        service.register(" S-101 ", jwt());

        server.verify();
        verify(students).linkByVerifiedEmail("S-101", EMAIL, AUTH_ID);
    }

    @Test
    void refusesAnEmailSupabaseHasNotConfirmed() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://project.supabase.co/auth/v1/user"))
                .andRespond(withSuccess("{\"id\":\"%s\",\"email\":\"%s\"}".formatted(AUTH_ID, EMAIL),
                        org.springframework.http.MediaType.APPLICATION_JSON));
        StudentAccountRegistrationService service = new StudentAccountRegistrationService(
                students, builder, "https://project.supabase.co/auth/v1", "public-key");

        StudentAccessDeniedException error = assertThrows(StudentAccessDeniedException.class,
                () -> service.register("S-101", jwt()));

        assertTrue(error.getMessage().contains("Confirm your email"));
        verifyNoInteractions(students);
        server.verify();
    }

    @Test
    void refusesWhenTheRosterNumberAndVerifiedEmailDoNotMatch() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://project.supabase.co/auth/v1/user"))
                .andRespond(withSuccess("""
                        {"id":"%s","email":"%s","email_confirmed_at":"2026-11-25T12:00:00Z"}
                        """.formatted(AUTH_ID, EMAIL), org.springframework.http.MediaType.APPLICATION_JSON));
        when(students.linkByVerifiedEmail("S-999", EMAIL, AUTH_ID)).thenReturn(false);
        StudentAccountRegistrationService service = new StudentAccountRegistrationService(
                students, builder, "https://project.supabase.co/auth/v1", "public-key");

        assertThrows(StudentAccessDeniedException.class, () -> service.register("S-999", jwt()));
        verify(students).linkByVerifiedEmail("S-999", EMAIL, AUTH_ID);
        server.verify();
    }

    private static Jwt jwt() {
        return Jwt.withTokenValue("test-token").header("alg", "ES256")
                .subject(AUTH_ID.toString()).issuedAt(Instant.now().minusSeconds(60))
                .expiresAt(Instant.now().plusSeconds(60)).build();
    }
}
