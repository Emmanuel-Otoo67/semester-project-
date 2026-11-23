package com.libtrack.platform.health;

import com.libtrack.platform.auth.CurrentStaff;
import com.libtrack.platform.auth.StaffIdentityService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/session")
public class SessionController {
    private final StaffIdentityService identityService;
    private final Environment environment;

    public SessionController(StaffIdentityService identityService, Environment environment) {
        this.identityService = identityService;
        this.environment = environment;
    }

    @GetMapping
    public Map<String, Object> session(@AuthenticationPrincipal Jwt jwt) {
        CurrentStaff staff = identityService.requireCurrentStaff(jwt);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("authenticated", true);
        response.put("staffId", staff.id());
        response.put("displayName", staff.displayName());
        response.put("role", staff.role());
        if (environment.acceptsProfiles(Profiles.of("local-dev"))) {
            response.put("localDevelopment", true);
        }
        return response;
    }
}
