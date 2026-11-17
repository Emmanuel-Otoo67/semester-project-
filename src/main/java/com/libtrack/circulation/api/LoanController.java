package com.libtrack.circulation.api;

import com.libtrack.circulation.service.CirculationService;
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

@RestController @Validated @RequestMapping("/api/v1/loans")
public class LoanController {
    private final CirculationService service; private final StaffIdentityService identities;
    public LoanController(CirculationService service,StaffIdentityService identities){this.service=service;this.identities=identities;}
    @GetMapping public List<Map<String,Object>> list(@RequestParam(defaultValue="true") boolean current,@RequestParam(required=false) UUID memberId,@RequestParam(required=false) String barcode,@RequestParam(defaultValue="false") boolean overdue){return service.list(current,memberId,barcode,overdue);}
    @PostMapping("/checkout") @ResponseStatus(HttpStatus.CREATED) public Object checkout(@Valid @RequestBody CheckoutRequest request,@AuthenticationPrincipal Jwt jwt){return service.checkout(request.memberId(),request.copyBarcode(),identities.requireCurrentStaff(jwt).id());}
    @PostMapping("/{id}/renew") public Object renew(@PathVariable UUID id,@AuthenticationPrincipal Jwt jwt){return service.renew(id,identities.requireCurrentStaff(jwt).id());}
    @PostMapping("/{id}/return") @ResponseStatus(HttpStatus.NO_CONTENT) public void returnLoan(@PathVariable UUID id,@AuthenticationPrincipal Jwt jwt){service.returnLoan(id,identities.requireCurrentStaff(jwt).id());}
}
