package com.libtrack.audit.service;

import com.libtrack.audit.data.AuditRepository;
import com.libtrack.platform.api.PageResult;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.UUID;

@Service public class AuditService {
    private final AuditRepository repository;
    public AuditService(AuditRepository repository){this.repository=repository;}
    public PageResult<Map<String,Object>> list(int page,int size,UUID actor,String entityType,String action){if(page<0||size<1||size>100)throw new IllegalArgumentException("Page must be zero or greater and size must be between 1 and 100.");return repository.list(page,size,actor,entityType,action);}
}
