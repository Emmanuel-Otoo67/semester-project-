package com.libtrack.platform.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StaffIdentityServiceTest {
    private final StaffIdentityRepository repository = mock(StaffIdentityRepository.class);
    private final StaffIdentityService service = new StaffIdentityService(repository);
    private static final UUID AUTH_ID = UUID.fromString("c9f46857-346d-4b4e-a151-d06c764ea8df");
    private static final UUID STAFF_ID = UUID.fromString("1f91c6f5-09a5-49dc-82ef-29a2a9135f0b");

    @Test
    void resolvesRoleFromStaffRecordAndNotUserMetadata() {
        CurrentStaff staff = new CurrentStaff(STAFF_ID, AUTH_ID, "Ada Librarian", StaffRole.LIBRARIAN);
        when(repository.findActiveByAuthUserId(AUTH_ID)).thenReturn(Optional.of(staff));

        CurrentStaff actual = service.requireCurrentStaff(jwt(AUTH_ID, "ADMIN"));

        assertEquals(staff, actual);
        verify(repository).findActiveByAuthUserId(AUTH_ID);
    }

    @Test
    void deniesAuthenticatedSupabaseUserWithoutStaffMapping() {
        when(repository.findActiveByAuthUserId(AUTH_ID)).thenReturn(Optional.empty());

        StaffAccessDeniedException error = assertThrows(StaffAccessDeniedException.class,
                () -> service.requireCurrentStaff(jwt(AUTH_ID, "ADMIN")));

        assertEquals("This Supabase account is not linked to an active LibTrack staff account.", error.getMessage());
    }

    @Test
    void rejectsMissingOrInvalidSubject() {
        assertThrows(StaffAccessDeniedException.class, () -> service.requireCurrentStaff(
                Jwt.withTokenValue("token").header("alg", "RS256")
                        .issuedAt(Instant.now().minusSeconds(60)).expiresAt(Instant.now().plusSeconds(60)).build()));
        verifyNoInteractions(repository);
    }

    private static Jwt jwt(UUID subject, String untrustedRole) {
        return Jwt.withTokenValue("token").header("alg", "RS256")
                .claim("sub", subject.toString())
                .claim("user_metadata", java.util.Map.of("role", untrustedRole))
                .issuedAt(Instant.now().minusSeconds(60)).expiresAt(Instant.now().plusSeconds(60)).build();
    }
}
