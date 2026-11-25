package com.libtrack.members;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertTrue;

class StudentAccountSchemaTest {
    @Test
    void migrationLinksOneSupabaseAccountToAtMostOneMember() throws IOException {
        String sql = Files.readString(Path.of(
                "src/main/resources/db/migration/V6__link_students_to_supabase_auth.sql")).toLowerCase(Locale.ROOT);
        assertTrue(sql.contains("add column auth_user_id uuid"));
        assertTrue(sql.contains("references auth.users(id)"));
        assertTrue(sql.contains("create unique index"));
        assertTrue(sql.contains("where auth_user_id is not null"));
    }
}
