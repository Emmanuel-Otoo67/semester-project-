package com.libtrack.attendance.data;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AttendanceSchemaTest {
    private static final Path MIGRATION = Path.of(
            "src/main/resources/db/migration/V5__student_profile_and_library_visits.sql");

    @Test
    void migrationAddsStudentDetailsAndConstrainedVisitRecords() throws IOException {
        String sql = Files.readString(MIGRATION).toLowerCase(Locale.ROOT);

        assertTrue(sql.contains("add column programme"));
        assertTrue(sql.contains("add column level"));
        assertTrue(sql.contains("create table public.library_visits"));
        assertTrue(sql.contains("references public.members(id)"));
        assertTrue(sql.contains("references public.staff_users(id)"));
        assertTrue(sql.contains("checked_out_at >= checked_in_at"));
        assertTrue(sql.contains("where checked_out_at is null"));
        assertTrue(sql.contains("enable row level security"));
        assertTrue(sql.contains("to libtrack_runtime"));
    }

    @Test
    void kioskMigrationUsesUniqueShortLivedScanIdentifiers() throws IOException {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/V7__idempotent_library_kiosk_scans.sql"))
                .toLowerCase(Locale.ROOT);
        assertTrue(sql.contains("create table public.library_kiosk_scans"));
        assertTrue(sql.contains("scan_id uuid primary key"));
        assertTrue(sql.contains("grant select, insert, delete"));
        assertTrue(sql.contains("enable row level security"));
        assertTrue(sql.contains("to libtrack_runtime"));
    }
}
