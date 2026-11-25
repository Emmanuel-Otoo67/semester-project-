package com.libtrack.platform.auth;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/student-registration", "/api/v1/student-registration/"})
public class StudentAccountRegistrationController {
    private final StudentAccountRegistrationService registration;

    public StudentAccountRegistrationController(StudentAccountRegistrationService registration) {
        this.registration = registration;
    }

    @PostMapping
    public Map<String, String> register(@Valid @RequestBody StudentAccountRegistrationRequest request,
                                        @AuthenticationPrincipal Jwt jwt) {
        registration.register(request, jwt);
        return Map.of("status", "created", "message", "Student account and profile are ready.");
    }
}
