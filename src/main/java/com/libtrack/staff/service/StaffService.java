package com.libtrack.staff.service;

import com.libtrack.audit.data.AuditRepository;
import com.libtrack.platform.auth.CurrentStaff;
import com.libtrack.staff.api.StaffController.LinkRequest;
import com.libtrack.staff.api.StaffController.UpdateRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service public class StaffService {
    private final JdbcTemplate jdbc; private final AuditRepository audit;
    public StaffService(JdbcTemplate jdbc,AuditRepository audit){this.jdbc=jdbc;this.audit=audit;}
    public record StaffRow(UUID id,UUID authUserId,String email,String displayName,String role,boolean active){}
    public List<StaffRow> list(CurrentStaff actor){return jdbc.query("select id,auth_user_id,login_identifier,display_name,case when role='LIBRARIAN' then 'ADMIN' else role end as role,active from staff_users order by display_name",(rs,n)->new StaffRow(rs.getObject("id",UUID.class),rs.getObject("auth_user_id",UUID.class),rs.getString("login_identifier"),rs.getString("display_name"),rs.getString("role"),rs.getBoolean("active")));}
    @Transactional public StaffRow link(LinkRequest request,CurrentStaff actor){
        jdbc.execute("lock table staff_users in share row exclusive mode");
        UUID id=jdbc.queryForObject("insert into staff_users(auth_user_id,login_identifier,display_name,role) values (?,?,?,'ADMIN') returning id",UUID.class,request.authUserId(),request.email().trim().toLowerCase(),request.displayName().trim());
        audit.record(actor.id(),"STAFF_LINKED","STAFF_USER",id);return get(id);
    }
    @Transactional public StaffRow update(UUID id,UpdateRequest request,CurrentStaff actor){
        jdbc.execute("lock table staff_users in share row exclusive mode");
        int changed=jdbc.update("update staff_users set display_name=?,active=?,updated_at=now() where id=?",request.displayName().trim(),request.active(),id);
        if(changed==0)throw new IllegalArgumentException("Staff account not found.");
        Integer admins=jdbc.queryForObject("select count(*) from staff_users where active=true and role='ADMIN'",Integer.class);
        if(admins==null||admins<1)throw new IllegalArgumentException("At least one active administrator must remain.");
        audit.record(actor.id(),"STAFF_UPDATED","STAFF_USER",id);return get(id);
    }
    private StaffRow get(UUID id){return jdbc.queryForObject("select id,auth_user_id,login_identifier,display_name,case when role='LIBRARIAN' then 'ADMIN' else role end as role,active from staff_users where id=?",(rs,n)->new StaffRow(rs.getObject("id",UUID.class),rs.getObject("auth_user_id",UUID.class),rs.getString("login_identifier"),rs.getString("display_name"),rs.getString("role"),rs.getBoolean("active")),id);}
}
