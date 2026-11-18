package com.libtrack.settings.api;

import com.libtrack.platform.auth.CurrentStaff;
import com.libtrack.platform.auth.StaffIdentityService;
import com.libtrack.platform.auth.StaffRole;
import com.libtrack.settings.service.SettingsService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @Validated @RequestMapping("/api/v1/settings")
public class SettingsController {
    private final SettingsService settings; private final StaffIdentityService identities;
    public SettingsController(SettingsService settings,StaffIdentityService identities){this.settings=settings;this.identities=identities;}
    @GetMapping public Map<String,Object> read(){return settings.read();}
    @PutMapping("/{key}") public Map<String,Object> update(@PathVariable String key,@RequestBody Map<String,Object> value,@AuthenticationPrincipal Jwt jwt){CurrentStaff staff=identities.requireCurrentStaff(jwt);if(staff.role()!=StaffRole.ADMIN)throw new AccessDeniedException("Only a LibTrack administrator can update library policy.");return settings.update(key,value,staff);}
}
