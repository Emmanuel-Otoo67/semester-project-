package com.libtrack.audit.data;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

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
}
