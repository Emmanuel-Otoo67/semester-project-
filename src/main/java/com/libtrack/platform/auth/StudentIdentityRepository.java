package com.libtrack.platform.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

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

    public boolean linkByVerifiedEmail(String libraryNumber, String verifiedEmail, UUID authUserId) {
        return jdbc.update("""
                update public.members
                   set auth_user_id=?, updated_at=now()
                 where lower(btrim(library_number))=lower(btrim(?))
                   and lower(btrim(email))=lower(btrim(?))
                   and member_type='STUDENT' and status='ACTIVE'
                   and (auth_user_id is null or auth_user_id=?)
                   and not exists (select 1 from public.staff_users where auth_user_id=?)
                """, authUserId, libraryNumber, verifiedEmail, authUserId, authUserId) == 1;
    }
}
