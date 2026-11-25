package com.libtrack.platform.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.Locale;

@Repository
public class StudentIdentityRepository {
    private final JdbcTemplate jdbc;

    public StudentIdentityRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<CurrentStudent> findActiveByAuthUserId(UUID authUserId) {
        return jdbc.query("""
                select id,auth_user_id,library_number,concat(first_name,' ',last_name) as display_name,
                       programme,level,email,phone
                from public.members
                where auth_user_id=? and member_type='STUDENT' and status='ACTIVE'
                """, rs -> rs.next() ? Optional.of(new CurrentStudent(rs.getObject("id", UUID.class),
                rs.getObject("auth_user_id", UUID.class), rs.getString("library_number"),
                rs.getString("display_name"), rs.getString("programme"), rs.getString("level"),
                rs.getString("email"), rs.getString("phone"))) : Optional.empty(), authUserId);
    }

    public boolean registerStudent(StudentAccountRegistrationRequest request, String accountEmail, UUID authUserId) {
        String indexNumber = request.libraryNumber().trim().toUpperCase(Locale.ROOT);
        return !jdbc.query("""
                insert into public.members as member
                    (library_number,first_name,last_name,member_type,email,programme,level,status,auth_user_id)
                select ?,?,?, 'STUDENT',?,?,?, 'ACTIVE',?
                on conflict (library_number) do update
                   set auth_user_id=excluded.auth_user_id,
                       first_name=excluded.first_name,
                       last_name=excluded.last_name,
                       email=excluded.email,
                       programme=excluded.programme,
                       level=excluded.level,
                       updated_at=now()
                 where member.member_type='STUDENT'
                   and member.status='ACTIVE'
                   and lower(btrim(member.library_number))=lower(btrim(excluded.library_number))
                   and (member.email is null or lower(btrim(member.email))=lower(btrim(excluded.email)))
                   and (member.auth_user_id is null or member.auth_user_id=excluded.auth_user_id)
                returning id
                """, (rs, row) -> rs.getObject("id", UUID.class), indexNumber,
                request.firstName().trim(), request.lastName().trim(), accountEmail,
                request.programme().trim(), request.level().trim(), authUserId).isEmpty();
    }
}
