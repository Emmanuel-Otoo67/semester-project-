package com.libtrack.attendance.data;

import com.libtrack.attendance.api.AttendanceRecord;
import com.libtrack.platform.api.PageResult;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class AttendanceRepository {
    public record Student(UUID id, String memberType, String status) {}

    private final JdbcTemplate jdbc;

    public AttendanceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Student> lockStudent(UUID memberId) {
        return jdbc.query("select id,member_type,status from public.members where id=? for update",
                rs -> rs.next() ? Optional.of(new Student(rs.getObject("id", UUID.class),
                        rs.getString("member_type"), rs.getString("status"))) : Optional.empty(), memberId);
    }

    public Optional<UUID> memberIdForLibraryNumber(String libraryNumber) {
        return jdbc.query("select id from public.members where lower(library_number)=lower(?) and member_type='STUDENT'",
                rs -> rs.next() ? Optional.of(rs.getObject("id", UUID.class)) : Optional.empty(), libraryNumber.trim());
    }

    public boolean beginKioskScan(UUID scanId) {
        jdbc.update("delete from public.library_kiosk_scans where scanned_at < now() - interval '1 day'");
        return jdbc.update("insert into public.library_kiosk_scans(scan_id) values (?) on conflict (scan_id) do nothing", scanId) == 1;
    }

    public Optional<AttendanceRecord> findOpenVisitForMember(UUID memberId) {
        return jdbc.query(SELECT_VISIT + " where v.member_id=? and v.checked_out_at is null",
                rs -> rs.next() ? Optional.of(map(rs)) : Optional.empty(), memberId);
    }

    public Optional<AttendanceRecord> lockOpenVisit(UUID visitId) {
        return jdbc.query("select id,member_id from public.library_visits where id=? and checked_out_at is null for update",
                rs -> rs.next() ? Optional.of(new AttendanceRecord(rs.getObject("id", UUID.class),
                        rs.getObject("member_id", UUID.class), null, null, null, null, null, null)) : Optional.empty(), visitId);
    }

    public AttendanceRecord createVisit(UUID memberId, UUID actorId) {
        UUID id = jdbc.queryForObject("insert into public.library_visits(member_id,checked_in_by) values (?,?) returning id",
                UUID.class, memberId, actorId);
        return findById(id);
    }

    public AttendanceRecord checkOut(UUID visitId, UUID actorId) {
        int changed = jdbc.update("update public.library_visits set checked_out_at=now(),checked_out_by=? where id=? and checked_out_at is null",
                actorId, visitId);
        if (changed == 0) return null;
        return findById(visitId);
    }

    public List<AttendanceRecord> current() {
        return jdbc.query(SELECT_VISIT + " where v.checked_out_at is null order by v.checked_in_at desc,v.id",
                (rs, row) -> map(rs));
    }

    public List<AttendanceRecord> forMember(UUID memberId) {
        return jdbc.query(SELECT_VISIT + " where v.member_id=? order by v.checked_in_at desc,v.id desc limit 200",
                (rs, row) -> map(rs), memberId);
    }

    public PageResult<AttendanceRecord> history(String query, LocalDate from, LocalDate to, int page, int size) {
        String filter = "%" + (query == null ? "" : query.trim()) + "%";
        String where = " where (?='' or m.library_number ilike ? or m.first_name ilike ? or m.last_name ilike ? or coalesce(m.programme,'') ilike ? or coalesce(m.level,'') ilike ?)"
                + " and (?::date is null or v.checked_in_at >= ?::date)"
                + " and (?::date is null or v.checked_in_at < (?::date + interval '1 day'))";
        long total = jdbc.queryForObject("select count(*) from public.library_visits v join public.members m on m.id=v.member_id" + where,
                Long.class, empty(query), filter, filter, filter, filter, filter, from, from, to, to);
        List<AttendanceRecord> rows = jdbc.query(SELECT_VISIT + where + " order by v.checked_in_at desc,v.id desc limit ? offset ?",
                (rs, row) -> map(rs), empty(query), filter, filter, filter, filter, filter, from, from, to, to, size, (long) page * size);
        return new PageResult<>(rows, page, size, total);
    }

    private AttendanceRecord findById(UUID id) {
        return jdbc.query(SELECT_VISIT + " where v.id=?", rs -> rs.next() ? map(rs) : null, id);
    }

    private static final String SELECT_VISIT = """
            select v.id,v.member_id as "memberId",m.library_number as "libraryNumber",
                   concat(m.first_name,' ',m.last_name) as "studentName",m.programme,m.level,
                   v.checked_in_at as "checkedInAt",v.checked_out_at as "checkedOutAt"
            from public.library_visits v join public.members m on m.id=v.member_id
            """;

    private static AttendanceRecord map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new AttendanceRecord(rs.getObject("id", UUID.class), rs.getObject("memberId", UUID.class),
                rs.getString("libraryNumber"), rs.getString("studentName"), rs.getString("programme"),
                rs.getString("level"), rs.getObject("checkedInAt", OffsetDateTime.class),
                rs.getObject("checkedOutAt", OffsetDateTime.class));
    }

    private static String empty(String value) {
        return value == null ? "" : value.trim();
    }
}
