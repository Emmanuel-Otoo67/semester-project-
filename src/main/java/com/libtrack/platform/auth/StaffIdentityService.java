package com.libtrack.platform.auth;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class StaffIdentityService {
    private final StaffIdentityRepository repository;
    private final Environment environment;

    public StaffIdentityService(StaffIdentityRepository repository, Environment environment) {
        this.repository = repository;
        this.environment = environment;
    }

    public CurrentStaff requireCurrentStaff(Jwt jwt) {
        if (environment.acceptsProfiles(Profiles.of("local-dev"))) {
            return repository.findLocalDevelopmentAdmin().orElseThrow(() ->
                    new StaffAccessDeniedException("The local development administrator is missing or inactive."));
        }

        UUID authUserId;
        try {
            authUserId = UUID.fromString(jwt.getSubject());
        } catch (RuntimeException exception) {
            throw new StaffAccessDeniedException("This access token does not identify a valid LibTrack staff account.");
        }
        return repository.findActiveByAuthUserId(authUserId).orElseThrow(() ->
                new StaffAccessDeniedException("This Supabase account is not linked to an active LibTrack staff account."));
    }

    public CurrentStaff requireAdministrator(Jwt jwt) {
        CurrentStaff staff = requireCurrentStaff(jwt);
        if (staff.role() != StaffRole.ADMIN) {
            throw new StaffAccessDeniedException("Administrator access is required to link a student account.");
        }
        return staff;
    }
}
