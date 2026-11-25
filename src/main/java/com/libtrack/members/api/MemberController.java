package com.libtrack.members.api;

import com.libtrack.members.service.MemberService;
import com.libtrack.platform.api.PageResult;
import com.libtrack.platform.auth.StaffIdentityService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @Validated @RequestMapping("/api/v1/members")
public class MemberController {
    private final MemberService service; private final StaffIdentityService identities;
    public MemberController(MemberService service,StaffIdentityService identities){this.service=service;this.identities=identities;}
    @GetMapping public PageResult<MemberRecord> list(@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size){return service.list(query,page,size);}
    @GetMapping("/{id}") public MemberRecord get(@PathVariable UUID id){return service.get(id);}
    @PutMapping("/{id}") public MemberRecord update(@PathVariable UUID id,@Valid @RequestBody MemberRequest request,@AuthenticationPrincipal Jwt jwt){return service.update(id,request,identities.requireCurrentStaff(jwt).id());}
}
