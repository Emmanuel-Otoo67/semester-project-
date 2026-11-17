package com.libtrack.catalog.api;

import com.libtrack.catalog.service.CatalogService;
import com.libtrack.platform.api.PageResult;
import com.libtrack.platform.auth.CurrentStaff;
import com.libtrack.platform.auth.StaffIdentityService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @Validated @RequestMapping("/api/v1/catalog/books")
public class BookController {
    private final CatalogService service; private final StaffIdentityService identities;
    public BookController(CatalogService service, StaffIdentityService identities){this.service=service;this.identities=identities;}
    @GetMapping public PageResult<BookSummary> list(@RequestParam(defaultValue="") String query,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size){return service.list(query,page,size);}
    @GetMapping("/{id}") public BookSummary get(@PathVariable UUID id){return service.get(id);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public BookSummary create(@Valid @RequestBody BookRequest request,@AuthenticationPrincipal Jwt jwt){return service.create(request,staff(jwt).id());}
    @PutMapping("/{id}") public BookSummary update(@PathVariable UUID id,@Valid @RequestBody BookRequest request,@AuthenticationPrincipal Jwt jwt){return service.update(id,request,staff(jwt).id());}
    @GetMapping("/{id}/copies") public List<Map<String,Object>> copies(@PathVariable UUID id){return service.copies(id);}
    @PostMapping("/{id}/copies") @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> addCopy(@PathVariable UUID id,@Valid @RequestBody CopyRequest request,@AuthenticationPrincipal Jwt jwt){return service.addCopy(id,request.barcode(),staff(jwt).id());}
    private CurrentStaff staff(Jwt jwt){return identities.requireCurrentStaff(jwt);}
    public record CopyRequest(@NotBlank @Size(max=80) String barcode){}
}
