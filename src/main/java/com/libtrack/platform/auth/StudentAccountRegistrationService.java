package com.libtrack.platform.auth;

import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class StudentAccountRegistrationService {
    private final StudentIdentityRepository students;

    public StudentAccountRegistrationService(StudentIdentityRepository students) {
        this.students = students;
    }

    public void register(StudentAccountRegistrationRequest request, org.springframework.security.oauth2.jwt.Jwt jwt) {
        final UUID authUserId;
        try {
            authUserId = UUID.fromString(jwt.getSubject());
        } catch (RuntimeException exception) {
            throw new StudentAccessDeniedException("This account cannot be linked to a student record.");
        }

        String accountEmail = jwt.getClaimAsString("email");
        if (accountEmail == null || accountEmail.isBlank()) {
            throw new StudentAccessDeniedException("This sign-in does not include an email address. Sign out and create a student account with email and password.");
        }

        if (!students.registerStudent(request, accountEmail.trim(), authUserId)) {
            throw new StudentAccessDeniedException("This student number is already in use, or the account is not eligible for a student profile. Check the details or contact library staff.");
        }
    }
}
