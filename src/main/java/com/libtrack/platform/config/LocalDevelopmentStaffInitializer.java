package com.libtrack.platform.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import com.libtrack.platform.auth.StaffIdentityRepository;

import java.util.UUID;

@Component
@Profile("local-dev")
public class LocalDevelopmentStaffInitializer implements ApplicationRunner {
    public static final UUID LOCAL_ADMIN_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    public static final String LOCAL_ADMIN_LOGIN = StaffIdentityRepository.LOCAL_DEVELOPMENT_LOGIN;
    public static final String LOCAL_ADMIN_DISPLAY_NAME = "Local Development Admin";

    private static final String UPSERT_LOCAL_ADMIN = """
            insert into staff_users (id, login_identifier, display_name, role, active, auth_user_id)
            values (?, ?, ?, 'ADMIN', true, null)
            on conflict (login_identifier) do update
            set id = excluded.id,
                display_name = excluded.display_name,
                role = 'ADMIN',
                active = true,
                auth_user_id = null,
                updated_at = now()
            """;

    private final JdbcTemplate jdbc;

    public LocalDevelopmentStaffInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.update(UPSERT_LOCAL_ADMIN, LOCAL_ADMIN_ID, LOCAL_ADMIN_LOGIN, LOCAL_ADMIN_DISPLAY_NAME);
    }
}
