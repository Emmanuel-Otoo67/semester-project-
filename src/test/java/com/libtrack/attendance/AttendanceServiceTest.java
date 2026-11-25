package com.libtrack.attendance;

import com.libtrack.attendance.api.AttendanceConflictException;
import com.libtrack.attendance.api.AttendanceRecord;
import com.libtrack.attendance.data.AttendanceRepository;
import com.libtrack.attendance.service.AttendanceService;
import com.libtrack.audit.data.AuditRepository;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttendanceServiceTest {
    private final AttendanceRepository repository = mock(AttendanceRepository.class);
    private final AuditRepository audit = mock(AuditRepository.class);
    private final AttendanceService service = new AttendanceService(repository, audit);
    private final UUID studentId = UUID.randomUUID();
    private final UUID staffId = UUID.randomUUID();

    @Test
    void checkInCreatesOneVisitAndAuditsIt() {
        var student = new AttendanceRepository.Student(studentId, "STUDENT", "ACTIVE");
        var visit = visit(UUID.randomUUID(), studentId, null);
        when(repository.lockStudent(studentId)).thenReturn(Optional.of(student));
        when(repository.findOpenVisitForMember(studentId)).thenReturn(Optional.empty());
        when(repository.createVisit(studentId, staffId)).thenReturn(visit);

        assertEquals(visit, service.checkIn(studentId, staffId));
        verify(audit).record(staffId, "LIBRARY_VISIT_CHECKED_IN", "LIBRARY_VISIT", visit.id());
    }

    @Test
    void checkInRejectsAnExistingOpenVisit() {
        when(repository.lockStudent(studentId)).thenReturn(Optional.of(
                new AttendanceRepository.Student(studentId, "STUDENT", "ACTIVE")));
        when(repository.findOpenVisitForMember(studentId)).thenReturn(Optional.of(visit(UUID.randomUUID(), studentId, null)));

        assertThrows(AttendanceConflictException.class, () -> service.checkIn(studentId, staffId));
        verify(repository, never()).createVisit(studentId, staffId);
    }

    @Test
    void checkInRejectsInactiveAndNonStudentMembers() {
        when(repository.lockStudent(studentId)).thenReturn(Optional.of(
                new AttendanceRepository.Student(studentId, "STAFF", "ACTIVE")));
        assertThrows(AttendanceConflictException.class, () -> service.checkIn(studentId, staffId));
        verify(repository, never()).findOpenVisitForMember(studentId);

        when(repository.lockStudent(studentId)).thenReturn(Optional.of(
                new AttendanceRepository.Student(studentId, "STUDENT", "INACTIVE")));
        assertThrows(AttendanceConflictException.class, () -> service.checkIn(studentId, staffId));
        verify(repository, never()).createVisit(studentId, staffId);
    }

    @Test
    void checkOutRequiresAndClosesAnOpenVisit() {
        UUID visitId = UUID.randomUUID();
        var open = visit(visitId, studentId, null);
        var closed = visit(visitId, studentId, OffsetDateTime.now());
        when(repository.lockOpenVisit(visitId)).thenReturn(Optional.of(open));
        when(repository.checkOut(visitId, staffId)).thenReturn(closed);

        assertEquals(closed, service.checkOut(visitId, staffId));
        verify(audit).record(staffId, "LIBRARY_VISIT_CHECKED_OUT", "LIBRARY_VISIT", visitId);
    }

    @Test
    void checkOutWithoutAnOpenVisitFails() {
        UUID visitId = UUID.randomUUID();
        when(repository.lockOpenVisit(visitId)).thenReturn(Optional.empty());
        assertThrows(AttendanceConflictException.class, () -> service.checkOut(visitId, staffId));
        verify(repository, never()).checkOut(visitId, staffId);
    }

    @Test
    void kioskScanChecksStudentInAndReturnsOnlyTheAction() {
        UUID scanId = UUID.randomUUID();
        when(repository.beginKioskScan(scanId)).thenReturn(true);
        when(repository.memberIdForLibraryNumber("S-101")).thenReturn(Optional.of(studentId));
        when(repository.lockStudent(studentId)).thenReturn(Optional.of(new AttendanceRepository.Student(studentId, "STUDENT", "ACTIVE")));
        when(repository.findOpenVisitForMember(studentId)).thenReturn(Optional.empty());
        var visit = visit(UUID.randomUUID(), studentId, null);
        when(repository.createVisit(studentId, staffId)).thenReturn(visit);

        var result = service.kioskScan(scanId, "S-101", staffId);

        assertEquals("CHECKED_IN", result.action());
        verify(audit).record(staffId, "LIBRARY_VISIT_CHECKED_IN", "LIBRARY_VISIT", visit.id());
    }

    @Test
    void kioskRejectsDuplicateScanKeysWithoutTogglingAttendance() {
        UUID scanId = UUID.randomUUID();
        when(repository.beginKioskScan(scanId)).thenReturn(false);
        assertThrows(AttendanceConflictException.class, () -> service.kioskScan(scanId, "S-101", staffId));
        verify(repository, never()).memberIdForLibraryNumber("S-101");
    }

    @Test
    void kioskScanChecksAnAlreadyPresentStudentOut() {
        UUID scanId = UUID.randomUUID();
        var open = visit(UUID.randomUUID(), studentId, null);
        when(repository.beginKioskScan(scanId)).thenReturn(true);
        when(repository.memberIdForLibraryNumber("S-101")).thenReturn(Optional.of(studentId));
        when(repository.lockStudent(studentId)).thenReturn(Optional.of(new AttendanceRepository.Student(studentId, "STUDENT", "ACTIVE")));
        when(repository.findOpenVisitForMember(studentId)).thenReturn(Optional.of(open));
        when(repository.lockOpenVisit(open.id())).thenReturn(Optional.of(open));
        when(repository.checkOut(open.id(), staffId)).thenReturn(visit(open.id(), studentId, OffsetDateTime.now()));

        var result = service.kioskScan(scanId, "S-101", staffId);

        assertEquals("CHECKED_OUT", result.action());
        verify(audit).record(staffId, "LIBRARY_VISIT_CHECKED_OUT", "LIBRARY_VISIT", open.id());
    }

    private AttendanceRecord visit(UUID id, UUID memberId, OffsetDateTime checkedOutAt) {
        return new AttendanceRecord(id, memberId, "S-101", "Ama Mensah", "Computer Science", "Level 300",
                OffsetDateTime.parse("2026-11-24T08:00:00Z"), checkedOutAt);
    }
}
