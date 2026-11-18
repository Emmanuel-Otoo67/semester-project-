package com.libtrack.audit.api;

import com.libtrack.audit.service.AuditService;
import com.libtrack.platform.api.PageResult;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController @Validated @RequestMapping("/api/v1/audit")
public class AuditController {
    private final AuditService service;
    public AuditController(AuditService service){this.service=service;}
    @GetMapping public PageResult<Map<String,Object>> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="50") int size,@RequestParam(required=false) UUID actor,@RequestParam(required=false) String entityType,@RequestParam(required=false) String action){return service.list(page,size,actor,entityType,action);}
}
