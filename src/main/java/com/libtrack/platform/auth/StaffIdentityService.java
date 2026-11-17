package com.libtrack.platform.auth;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class StaffIdentityService {
    private final StaffIdentityRepository repository;

    public StaffIdentityService(StaffIdentityRepository repository) {
        this.repository = repository;
    }

    public CurrentStaff requireCurrentStaff(Jwt jwt) {
        UUID authUserId;
        try {
            authUserId = UUID.fromString(jwt.getSubject());
        } catch (RuntimeException exception) {
            throw new StaffAccessDeniedException("This access token does not identify a valid LibTrack staff account.");
        }
        return repository.findActiveByAuthUserId(authUserId).orElseThrow(() ->
                new StaffAccessDeniedException("This Supabase account is not linked to an active LibTrack staff account."));
    }
}
