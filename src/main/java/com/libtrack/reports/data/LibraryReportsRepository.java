package com.libtrack.reports.data;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class LibraryReportsRepository {
    private final JdbcTemplate jdbc;
    public LibraryReportsRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Map<String, Object> report(LocalDate from, LocalDate to, ZoneId zone) {
        OffsetDateTime start = from.atStartOfDay(zone).toOffsetDateTime();
        OffsetDateTime end = to.plusDays(1).atStartOfDay(zone).toOffsetDateTime();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("attendanceByDay", jdbc.queryForList("""
                select (checked_in_at at time zone ?)::date as "date", count(*) as visits,
                       count(distinct member_id) as students
                from public.library_visits where checked_in_at >= ? and checked_in_at < ?
                group by 1 order by 1
                """, zone.getId(), start, end));
        result.put("borrowingByTitle", jdbc.queryForList("""
                select b.title, count(*) as checkouts
                from public.loans l join public.book_copies c on c.id=l.copy_id
                join public.books b on b.id=c.book_id
                where l.checked_out_at >= ? and l.checked_out_at < ?
                group by b.id,b.title order by checkouts desc,b.title limit 20
                """, start, end));
        result.put("returnsByDay", jdbc.queryForList("""
                select (returned_at at time zone ?)::date as "date", count(*) as returns
                from public.loans where returned_at >= ? and returned_at < ?
                group by 1 order by 1
                """, zone.getId(), start, end));
        result.put("overdueBooks", jdbc.queryForList("""
                select m.library_number as "libraryNumber", concat(m.first_name,' ',m.last_name) as "studentName",
                       b.title, c.barcode, l.due_at as "dueAt",
                       greatest(1, floor(extract(epoch from (now()-l.due_at))/86400))::integer as "overdueDays"
                from public.loans l join public.members m on m.id=l.member_id
                join public.book_copies c on c.id=l.copy_id join public.books b on b.id=c.book_id
                where l.returned_at is null and l.due_at < now()
                order by l.due_at limit 500
                """));
        result.put("inventory", jdbc.queryForMap("""
                select count(*) as total,
                       count(*) filter (where status='AVAILABLE') as available,
                       count(*) filter (where status='ON_LOAN') as borrowed,
                       count(*) filter (where status='ON_HOLD') as on_hold
                from public.book_copies
                """));
        return result;
    }
}
