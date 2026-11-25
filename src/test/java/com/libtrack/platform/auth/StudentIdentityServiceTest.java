package com.libtrack.platform.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StudentIdentityServiceTest {
    private final StudentIdentityRepository repository = mock(StudentIdentityRepository.class);
    private final StudentIdentityService service = new StudentIdentityService(repository);
    private static final UUID AUTH_ID = UUID.fromString("1226f8b7-8a70-48f7-9f35-65ed5b208252");

    @Test
    void resolvesStudentFromServerOwnedMemberLink() {
        CurrentStudent student = new CurrentStudent(UUID.randomUUID(), AUTH_ID, "S-101", "Ama Mensah",
                "Computer Science", "Level 300", "ama@example.edu", null);
        when(repository.findActiveByAuthUserId(AUTH_ID)).thenReturn(Optional.of(student));

        assertEquals(student, service.requireCurrentStudent(jwt(AUTH_ID, "ADMIN")));
        verify(repository).findActiveByAuthUserId(AUTH_ID);
    }

    @Test
    void rejectsUnlinkedSupabaseAccountEvenWhenMetadataClaimsAdmin() {
        when(repository.findActiveByAuthUserId(AUTH_ID)).thenReturn(Optional.empty());
        StudentAccessDeniedException error = assertThrows(StudentAccessDeniedException.class,
                () -> service.requireCurrentStudent(jwt(AUTH_ID, "ADMIN")));
        assertEquals("This Supabase account is not linked to an active LibTrack student.", error.getMessage());
    }

    @Test
    void rejectsTokensWithoutValidSubject() {
        Jwt token = Jwt.withTokenValue("token").header("alg", "ES256")
                .issuedAt(Instant.now().minusSeconds(60)).expiresAt(Instant.now().plusSeconds(60)).build();
        assertThrows(StudentAccessDeniedException.class, () -> service.requireCurrentStudent(token));
        verifyNoInteractions(repository);
    }

    private static Jwt jwt(UUID subject, String untrustedRole) {
        return Jwt.withTokenValue("token").header("alg", "ES256")
                .claim("sub", subject.toString())
                .claim("user_metadata", java.util.Map.of("role", untrustedRole))
                .issuedAt(Instant.now().minusSeconds(60)).expiresAt(Instant.now().plusSeconds(60)).build();
    }
}
