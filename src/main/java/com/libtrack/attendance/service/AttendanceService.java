package com.libtrack.attendance.service;

import com.libtrack.attendance.api.AttendanceConflictException;
import com.libtrack.attendance.api.AttendanceRecord;
import com.libtrack.attendance.data.AttendanceRepository;
import com.libtrack.audit.data.AuditRepository;
import com.libtrack.members.api.MemberNotFoundException;
import com.libtrack.platform.api.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class AttendanceService {
    public record KioskAction(String action) {}
    private final AttendanceRepository repository;
    private final AuditRepository audit;

    public AttendanceService(AttendanceRepository repository, AuditRepository audit) {
        this.repository = repository;
        this.audit = audit;
    }

    @Transactional
    public AttendanceRecord checkIn(UUID memberId, UUID actorId) {
        AttendanceRepository.Student student = repository.lockStudent(memberId)
                .orElseThrow(() -> new MemberNotFoundException("Student not found."));
        if (!"STUDENT".equals(student.memberType()) || !"ACTIVE".equals(student.status())) {
            throw new AttendanceConflictException("Only active student records can be checked into the library.");
        }
        if (repository.findOpenVisitForMember(memberId).isPresent()) {
            throw new AttendanceConflictException("This student is already checked into the library.");
        }
        AttendanceRecord visit = repository.createVisit(memberId, actorId);
        audit.record(actorId, "LIBRARY_VISIT_CHECKED_IN", "LIBRARY_VISIT", visit.id());
        return visit;
    }

    @Transactional
    public AttendanceRecord checkOut(UUID visitId, UUID actorId) {
        if (repository.lockOpenVisit(visitId).isEmpty()) {
            throw new AttendanceConflictException("This student does not have an active library visit.");
        }
        AttendanceRecord visit = repository.checkOut(visitId, actorId);
        if (visit == null) throw new AttendanceConflictException("This student does not have an active library visit.");
        audit.record(actorId, "LIBRARY_VISIT_CHECKED_OUT", "LIBRARY_VISIT", visit.id());
        return visit;
    }

    public List<AttendanceRecord> current() {
        return repository.current();
    }

    public PageResult<AttendanceRecord> history(String query, LocalDate from, LocalDate to, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Page must be zero or greater and size must be between 1 and 100.");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("The start date must be on or before the end date.");
        }
        return repository.history(query, from, to, page, size);
    }

    @Transactional
    public KioskAction kioskScan(UUID scanId, String identifier, UUID actorId) {
        if (!repository.beginKioskScan(scanId)) {
            throw new AttendanceConflictException("This scan was already processed. Please try again with a new scan.");
        }
        String value = identifier == null ? "" : identifier.trim();
        if (value.isEmpty()) throw new AttendanceConflictException("Enter a library number or scan a student QR code.");
        UUID memberId;
        try {
            memberId = UUID.fromString(value);
        } catch (IllegalArgumentException notUuid) {
            memberId = repository.memberIdForLibraryNumber(value).orElseThrow(() ->
                    new AttendanceConflictException("No active student matches that QR code or library number."));
        }
        AttendanceRepository.Student student = repository.lockStudent(memberId).orElseThrow(() ->
                new AttendanceConflictException("No active student matches that QR code or library number."));
        if (!"STUDENT".equals(student.memberType()) || !"ACTIVE".equals(student.status())) {
            throw new AttendanceConflictException("This student account is not active.");
        }
        var openVisit = repository.findOpenVisitForMember(memberId);
        if (openVisit.isPresent()) {
            checkOut(openVisit.get().id(), actorId);
            return new KioskAction("CHECKED_OUT");
        }
        AttendanceRecord visit = repository.createVisit(memberId, actorId);
        audit.record(actorId, "LIBRARY_VISIT_CHECKED_IN", "LIBRARY_VISIT", visit.id());
        return new KioskAction("CHECKED_IN");
    }
}
