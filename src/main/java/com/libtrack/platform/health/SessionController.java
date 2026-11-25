package com.libtrack.platform.health;

import com.libtrack.platform.auth.CurrentStaff;
import com.libtrack.platform.auth.StaffIdentityService;
import com.libtrack.platform.auth.StaffAccessDeniedException;
import com.libtrack.platform.auth.CurrentStudent;
import com.libtrack.platform.auth.StudentIdentityService;
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
    private final StudentIdentityService studentIdentityService;
    private final Environment environment;

    public SessionController(StaffIdentityService identityService, StudentIdentityService studentIdentityService, Environment environment) {
        this.identityService = identityService;
        this.studentIdentityService = studentIdentityService;
        this.environment = environment;
    }

    @GetMapping
    public Map<String, Object> session(@AuthenticationPrincipal Jwt jwt) {
        CurrentStaff staff;
        try {
            staff = identityService.requireCurrentStaff(jwt);
        } catch (StaffAccessDeniedException staffDenied) {
            CurrentStudent student = studentIdentityService.requireCurrentStudent(jwt);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("authenticated", true);
            response.put("studentId", student.id());
            response.put("libraryNumber", student.libraryNumber());
            response.put("displayName", student.displayName());
            response.put("programme", student.programme());
            response.put("level", student.level());
            response.put("email", student.email());
            response.put("phone", student.phone());
            response.put("role", "STUDENT");
            return response;
        }
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
