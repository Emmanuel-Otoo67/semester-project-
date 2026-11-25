package com.libtrack.members.service;

import com.libtrack.audit.data.AuditRepository;
import com.libtrack.members.api.MemberNotFoundException;
import com.libtrack.members.api.MemberRecord;
import com.libtrack.members.api.MemberRequest;
import com.libtrack.members.data.MemberRepository;
import com.libtrack.platform.api.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service public class MemberService {
    private final MemberRepository repository; private final AuditRepository audit;
    public MemberService(MemberRepository repository,AuditRepository audit){this.repository=repository;this.audit=audit;}
    public PageResult<MemberRecord> list(String query,int page,int size){if(page<0||size<1||size>100)throw new IllegalArgumentException("Page must be zero or greater and size must be between 1 and 100.");return repository.list(query==null?"":query,page,size);}
    public MemberRecord get(UUID id){MemberRecord r=repository.get(id);if(r==null)throw new MemberNotFoundException("Member not found.");return r;}
    @Transactional public MemberRecord create(MemberRequest request,UUID actor){UUID id=repository.create(request);audit.record(actor,"MEMBER_CREATED","MEMBER",id);return get(id);}
    @Transactional public MemberRecord update(UUID id,MemberRequest request,UUID actor){repository.update(id,request);audit.record(actor,"MEMBER_UPDATED","MEMBER",id);return get(id);}
    @Transactional public MemberRecord linkStudentAccount(UUID id,UUID authUserId,UUID actor){repository.linkStudentAccount(id,authUserId);audit.record(actor,"STUDENT_ACCOUNT_LINKED","MEMBER",id);return get(id);}
}
