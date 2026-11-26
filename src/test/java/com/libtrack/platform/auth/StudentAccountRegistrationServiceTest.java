package com.libtrack.platform.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StudentAccountRegistrationServiceTest {
    private static final UUID AUTH_ID = UUID.fromString("e656db25-382b-4d50-8910-9b1626039f93");
    private static final String EMAIL = "student@example.edu";
    private final StudentIdentityRepository students = mock(StudentIdentityRepository.class);
    private final StudentAccountRegistrationService service = new StudentAccountRegistrationService(students);
    private static final StudentAccountRegistrationRequest REQUEST = new StudentAccountRegistrationRequest(
            "S-101", "Ama", "Mensah", "Computer Science", "Level 300", "+233241234567");

    @Test
    void createsStudentProfileAsPartOfAccountRegistration() {
        when(students.registerStudent(REQUEST, EMAIL, AUTH_ID)).thenReturn(true);

        service.register(REQUEST, jwt(EMAIL));

        verify(students).registerStudent(REQUEST, EMAIL, AUTH_ID);
    }

    @Test
    void explainsWhenStudentNumberIsUnavailable() {
        when(students.registerStudent(REQUEST, EMAIL, AUTH_ID)).thenReturn(false);

        StudentAccessDeniedException error = assertThrows(StudentAccessDeniedException.class,
                () -> service.register(REQUEST, jwt(EMAIL)));
        assertTrue(error.getMessage().contains("student number"));
        verify(students).registerStudent(REQUEST, EMAIL, AUTH_ID);
    }

    private static Jwt jwt(String email) {
        return Jwt.withTokenValue("test-token").header("alg", "ES256")
                .subject(AUTH_ID.toString()).claim("email", email).issuedAt(Instant.now().minusSeconds(60))
                .expiresAt(Instant.now().plusSeconds(60)).build();
    }
}
