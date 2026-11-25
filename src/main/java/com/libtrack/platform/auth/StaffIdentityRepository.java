package com.libtrack.platform.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class StaffIdentityRepository {
    public static final String LOCAL_DEVELOPMENT_LOGIN = "local-admin@libtrack.local";

    private final JdbcTemplate jdbc;

    public StaffIdentityRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<CurrentStaff> findActiveByAuthUserId(UUID authUserId) {
        return jdbc.query("""
                select id, auth_user_id, display_name,
                       case when role='LIBRARIAN' then 'ADMIN' else role end as role
                from staff_users
                where auth_user_id = ? and active = true
                """, result -> result.next()
                ? Optional.of(new CurrentStaff(result.getObject("id", UUID.class),
                        result.getObject("auth_user_id", UUID.class), result.getString("display_name"),
                        StaffRole.valueOf(result.getString("role"))))
                : Optional.empty(), authUserId);
    }

    public Optional<CurrentStaff> findLocalDevelopmentAdmin() {
        return jdbc.query("""
                select id, auth_user_id, display_name,
                       case when role='LIBRARIAN' then 'ADMIN' else role end as role
                from staff_users
                where login_identifier = ? and active = true
                """, result -> result.next()
                ? Optional.of(new CurrentStaff(result.getObject("id", UUID.class),
                        result.getObject("auth_user_id", UUID.class), result.getString("display_name"),
                        StaffRole.valueOf(result.getString("role"))))
                : Optional.empty(), LOCAL_DEVELOPMENT_LOGIN);
    }
}
