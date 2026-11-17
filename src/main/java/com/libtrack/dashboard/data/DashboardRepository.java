package com.libtrack.dashboard.data;

import com.libtrack.audit.data.AuditRepository;
import com.libtrack.dashboard.api.DashboardSummary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DashboardRepository {
    private final JdbcTemplate jdbc;
    private final AuditRepository audit;
    public DashboardRepository(JdbcTemplate jdbc, AuditRepository audit) { this.jdbc = jdbc; this.audit = audit; }

    public DashboardSummary summary(String timezone) {
        var counts = jdbc.queryForMap("""
                select (select count(*) from books) titles,
                       (select count(*) from members where status='ACTIVE') active_members,
                       (select count(*) from book_copies where status='AVAILABLE') available_copies,
                       (select count(*) from book_copies where status='ON_LOAN') on_loan_copies,
                       (select count(*) from loans where returned_at is null and (due_at at time zone ?) < (now() at time zone ?)) overdue_loans,
                       (select count(*) from loans where returned_at is null and (due_at at time zone ?)::date = (now() at time zone ?)::date) due_today,
                       (select count(*) from holds where status in ('QUEUED','READY')) actionable_holds
                """, timezone, timezone, timezone, timezone);
        return new DashboardSummary(number(counts, "titles"), number(counts, "active_members"),
                number(counts, "available_copies"), number(counts, "on_loan_copies"),
                number(counts, "overdue_loans"), number(counts, "due_today"),
                number(counts, "actionable_holds"), audit.recent(8));
    }
    private static long number(java.util.Map<String, Object> values, String key) { return ((Number) values.get(key)).longValue(); }
}
