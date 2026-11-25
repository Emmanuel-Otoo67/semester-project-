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
    void updatePersistsStudentProgrammeAndLevel() {
        UUID id = UUID.randomUUID();
        String update = "update members set library_number=?,first_name=?,last_name=?,member_type=?,email=?,phone=?,programme=?,level=?,status=coalesce(?,status),updated_at=now() where id=?";
        when(jdbc.update(eq(update), eq("S-101"), eq("Ama"), eq("Mensah"), eq("STUDENT"),
                eq("ama@example.edu"), eq(null), eq("Computer Science"), eq("Level 300"), eq("ACTIVE"), eq(id)))
                .thenReturn(1);

        repository.update(id, new MemberRequest("S-101", "Ama", "Mensah", "STUDENT", "ama@example.edu",
                null, "ACTIVE", "Computer Science", "Level 300"));

        verify(jdbc).update(eq(update), eq("S-101"), eq("Ama"), eq("Mensah"), eq("STUDENT"),
                eq("ama@example.edu"), eq(null), eq("Computer Science"), eq("Level 300"), eq("ACTIVE"), eq(id));
    }
}
