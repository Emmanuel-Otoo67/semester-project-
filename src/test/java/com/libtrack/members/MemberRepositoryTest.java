package com.libtrack.members;

import com.libtrack.members.api.MemberRequest;
import com.libtrack.members.data.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MemberRepositoryTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final MemberRepository repository = new MemberRepository(jdbc);

    @Test
    void createPersistsStudentProgrammeAndLevel() {
        UUID id = UUID.randomUUID();
        String insert = "insert into members(library_number,first_name,last_name,member_type,email,phone,programme,level,status) values (?,?,?,?,?,?,?,?,coalesce(?, 'ACTIVE')) returning id";
        when(jdbc.queryForObject(eq(insert), eq(UUID.class), eq("S-101"), eq("Ama"), eq("Mensah"), eq("STUDENT"),
                eq("ama@example.edu"), eq(null), eq("Computer Science"), eq("Level 300"), eq("ACTIVE")))
                .thenReturn(id);

        repository.create(new MemberRequest("S-101", "Ama", "Mensah", "STUDENT", "ama@example.edu",
                null, "ACTIVE", "Computer Science", "Level 300"));

        verify(jdbc).queryForObject(eq(insert), eq(UUID.class), eq("S-101"), eq("Ama"), eq("Mensah"), eq("STUDENT"),
                eq("ama@example.edu"), eq(null), eq("Computer Science"), eq("Level 300"), eq("ACTIVE"));
    }
}
