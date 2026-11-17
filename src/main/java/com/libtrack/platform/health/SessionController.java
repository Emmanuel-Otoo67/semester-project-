package com.libtrack.platform.health;

import com.libtrack.platform.auth.CurrentStaff;
import com.libtrack.platform.auth.StaffIdentityService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/session")
public class SessionController {
    private final StaffIdentityService identityService;

    public SessionController(StaffIdentityService identityService) {
        this.identityService = identityService;
    }

    @GetMapping
    public Map<String, Object> session(@AuthenticationPrincipal Jwt jwt) {
        CurrentStaff staff = identityService.requireCurrentStaff(jwt);
        return Map.of(
                "authenticated", true,
                "staffId", staff.id(),
                "displayName", staff.displayName(),
                "role", staff.role());
    }
}
