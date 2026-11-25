package com.libtrack.attendance.api;

import com.libtrack.attendance.service.AttendanceService;
import com.libtrack.platform.api.PageResult;
import com.libtrack.platform.auth.StaffIdentityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
public class AttendanceController {
    private final AttendanceService service;
    private final StaffIdentityService identities;

    public AttendanceController(AttendanceService service, StaffIdentityService identities) {
        this.service = service;
        this.identities = identities;
    }

    @PostMapping("/check-in")
    @ResponseStatus(HttpStatus.CREATED)
    public AttendanceRecord checkIn(@Valid @RequestBody CheckInRequest request,
                                    @AuthenticationPrincipal Jwt jwt) {
        return service.checkIn(request.memberId(), identities.requireCurrentStaff(jwt).id());
    }

    @PostMapping("/{visitId}/check-out")
    public AttendanceRecord checkOut(@PathVariable UUID visitId, @AuthenticationPrincipal Jwt jwt) {
        return service.checkOut(visitId, identities.requireCurrentStaff(jwt).id());
    }

    @PostMapping("/kiosk/scan")
    public Map<String, String> kioskScan(@Valid @RequestBody KioskScanRequest request,
                                         @AuthenticationPrincipal Jwt jwt) {
        var result = service.kioskScan(request.scanId(), request.identifier(), identities.requireCurrentStaff(jwt).id());
        String message = "CHECKED_IN".equals(result.action()) ? "Arrival recorded. Welcome to the library." : "Departure recorded. Have a good day.";
        return Map.of("action", result.action(), "message", message);
    }

    @GetMapping("/current")
    public List<AttendanceRecord> current() {
        return service.current();
    }

    @GetMapping("/history")
    public PageResult<AttendanceRecord> history(@RequestParam(defaultValue = "") String query,
                                                @RequestParam(required = false) LocalDate from,
                                                @RequestParam(required = false) LocalDate to,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "25") int size) {
        return service.history(query, from, to, page, size);
    }
}
