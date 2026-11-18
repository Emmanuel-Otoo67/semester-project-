package com.libtrack.audit.data;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.libtrack.platform.api.PageResult;

@Repository
public class AuditRepository {
    private final JdbcTemplate jdbc;
    public AuditRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void record(UUID actor, String action, String entityType, UUID entityId) {
        jdbc.update("insert into audit_events(actor_staff_id,action,entity_type,entity_id) values (?,?,?,?)",
                actor, action, entityType, entityId);
    }

    public List<Map<String, Object>> recent(int limit) {
        return jdbc.queryForList("""
                select e.id, e.action, e.entity_type as "entityType", e.entity_id as "entityId",
                       e.occurred_at as "occurredAt", s.display_name as "actorName"
                from audit_events e left join staff_users s on s.id=e.actor_staff_id
                order by e.occurred_at desc limit ?
                """, limit);
    }

    public PageResult<Map<String,Object>> list(int page,int size,UUID actor,String entityType,String action){
        String entity=entityType==null?"":entityType.trim(), actionFilter=action==null?"":action.trim();
        long total=jdbc.queryForObject("select count(*) from audit_events where (?::uuid is null or actor_staff_id=?) and (?='' or entity_type ilike ?) and (?='' or action ilike ?)",Long.class,actor,actor,entity,entity,actionFilter,actionFilter);
        List<Map<String,Object>> items=jdbc.queryForList("""
            select e.id,e.actor_staff_id as \"actorStaffId\",s.display_name as \"actorName\",e.action,
              e.entity_type as \"entityType\",e.entity_id as \"entityId\",e.details,e.occurred_at as \"occurredAt\"
            from audit_events e left join staff_users s on s.id=e.actor_staff_id
            where (?::uuid is null or e.actor_staff_id=?) and (?='' or e.entity_type ilike ?) and (?='' or e.action ilike ?)
            order by e.occurred_at desc,e.id desc limit ? offset ?
            """,actor,actor,entity,entity,actionFilter,actionFilter,size,(long)page*size);
        return new PageResult<>(items,page,size,total);
    }
}
