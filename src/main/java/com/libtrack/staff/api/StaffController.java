package com.libtrack.staff.api;

import com.libtrack.platform.auth.CurrentStaff;
import com.libtrack.platform.auth.StaffIdentityService;
import com.libtrack.platform.auth.StaffRole;
import com.libtrack.staff.service.StaffService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @Validated @RequestMapping("/api/v1/staff")
public class StaffController {
    private final StaffService service; private final StaffIdentityService identities;
    public StaffController(StaffService service,StaffIdentityService identities){this.service=service;this.identities=identities;}
    @GetMapping public List<StaffService.StaffRow> list(@AuthenticationPrincipal Jwt jwt){return service.list(admin(jwt));}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public StaffService.StaffRow link(@Valid @RequestBody LinkRequest request,@AuthenticationPrincipal Jwt jwt){return service.link(request,admin(jwt));}
    @PatchMapping("/{id}") public StaffService.StaffRow update(@PathVariable UUID id,@Valid @RequestBody UpdateRequest request,@AuthenticationPrincipal Jwt jwt){return service.update(id,request,admin(jwt));}
    private CurrentStaff admin(Jwt jwt){CurrentStaff staff=identities.requireCurrentStaff(jwt);if(staff.role()!=StaffRole.ADMIN)throw new org.springframework.security.access.AccessDeniedException("Only a LibTrack administrator can manage staff accounts.");return staff;}
    public record LinkRequest(@NotNull UUID authUserId,@NotBlank @Email @Size(max=190) String email,@NotBlank @Size(max=160) String displayName,@NotNull StaffRole role){}
    public record UpdateRequest(@NotBlank @Size(max=160) String displayName,@NotNull StaffRole role,@NotNull Boolean active){}
}
