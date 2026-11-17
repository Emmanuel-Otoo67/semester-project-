package com.libtrack.platform.health;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/session")
public class SessionController {
    @GetMapping
    public Map<String, Object> session(Authentication authentication) {
        return Map.of(
                "authenticated", authentication.isAuthenticated(),
                "username", authentication.getName(),
                "roles", authentication.getAuthorities().stream().map(authority -> authority.getAuthority()).toList());
    }
}
