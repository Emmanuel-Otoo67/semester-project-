package com.libtrack.platform.config;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.DefaultApplicationArguments;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalDevelopmentStaffInitializerTest {
    @Test
    void repeatedlyUpsertsTheDeterministicLocalAdministrator() throws Exception {
        var jdbc = new RecordingJdbcTemplate();
        var initializer = new LocalDevelopmentStaffInitializer(jdbc);

        initializer.run(new DefaultApplicationArguments(new String[0]));
        initializer.run(new DefaultApplicationArguments(new String[0]));

        assertEquals(2, jdbc.calls.size());
        for (var call : jdbc.calls) {
            var sql = call.sql().toLowerCase();
            assertTrue(sql.contains("on conflict (login_identifier)"));
            assertTrue(sql.contains("values (?, ?, ?, 'admin', true, null)"));
            assertEquals(UUID.fromString("00000000-0000-0000-0000-000000000001"), call.args()[0]);
            assertEquals("local-admin@libtrack.local", call.args()[1]);
            assertEquals("Local Development Admin", call.args()[2]);
        }
    }

    private record Call(String sql, Object[] args) {}

    private static final class RecordingJdbcTemplate extends JdbcTemplate {
        private final List<Call> calls = new ArrayList<>();

        @Override
        public int update(String sql, Object... args) {
            calls.add(new Call(sql, args));
            return 1;
        }
    }
}
