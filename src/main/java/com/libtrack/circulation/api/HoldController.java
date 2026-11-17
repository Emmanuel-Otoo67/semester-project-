package com.libtrack.circulation.api;

import com.libtrack.circulation.service.HoldService;
import com.libtrack.platform.auth.StaffIdentityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @Validated @RequestMapping("/api/v1/holds")
public class HoldController {
    private final HoldService service; private final StaffIdentityService identities;
    public HoldController(HoldService service,StaffIdentityService identities){this.service=service;this.identities=identities;}
    @GetMapping public List<Map<String,Object>> list(@RequestParam(defaultValue="ALL") String status){return service.list(status);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> create(@Valid @RequestBody HoldRequest request,@AuthenticationPrincipal Jwt jwt){UUID id=service.create(request.memberId(),request.bookId(),identities.requireCurrentStaff(jwt).id());return Map.of("id",id,"status","QUEUED");}
    @PostMapping("/{id}/cancel") @ResponseStatus(HttpStatus.NO_CONTENT) public void cancel(@PathVariable UUID id,@AuthenticationPrincipal Jwt jwt){service.cancel(id,identities.requireCurrentStaff(jwt).id());}
    @PostMapping("/{id}/fulfill") @ResponseStatus(HttpStatus.CREATED) public Object fulfill(@PathVariable UUID id,@AuthenticationPrincipal Jwt jwt){return service.fulfill(id,identities.requireCurrentStaff(jwt).id());}
}
