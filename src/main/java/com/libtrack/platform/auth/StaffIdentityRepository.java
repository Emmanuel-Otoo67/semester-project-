package com.libtrack.platform.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class StaffIdentityRepository {
    private final JdbcTemplate jdbc;

    public StaffIdentityRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<CurrentStaff> findActiveByAuthUserId(UUID authUserId) {
        return jdbc.query("""
                select id, auth_user_id, display_name, role
                from staff_users
                where auth_user_id = ? and active = true
                """, result -> result.next()
                ? Optional.of(new CurrentStaff(result.getObject("id", UUID.class),
                        result.getObject("auth_user_id", UUID.class), result.getString("display_name"),
                        StaffRole.valueOf(result.getString("role"))))
                : Optional.empty(), authUserId);
    }
}
