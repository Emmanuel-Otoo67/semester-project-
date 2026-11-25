package com.libtrack.platform.auth;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class StudentIdentityService {
    private final StudentIdentityRepository repository;

    public StudentIdentityService(StudentIdentityRepository repository) {
        this.repository = repository;
    }

    public CurrentStudent requireCurrentStudent(Jwt jwt) {
        UUID authUserId;
        try {
            authUserId = UUID.fromString(jwt.getSubject());
        } catch (RuntimeException exception) {
            throw new StudentAccessDeniedException("This access token does not identify a valid LibTrack student account.");
        }
        return repository.findActiveByAuthUserId(authUserId).orElseThrow(() ->
                new StudentAccessDeniedException("This Supabase account is not linked to an active LibTrack student."));
    }
}
