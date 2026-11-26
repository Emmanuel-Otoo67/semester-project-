package com.libtrack.student.api;

import com.libtrack.attendance.api.AttendanceRecord;
import com.libtrack.attendance.api.StudentEntranceRequest;
import com.libtrack.attendance.data.AttendanceRepository;
import com.libtrack.attendance.service.AttendanceService;
import com.libtrack.catalog.api.BookSummary;
import com.libtrack.catalog.service.CatalogService;
import com.libtrack.platform.api.PageResult;
import com.libtrack.platform.auth.CurrentStudent;
import com.libtrack.platform.auth.StudentIdentityService;
import com.libtrack.circulation.service.CirculationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/student")
public class StudentPortalController {
    private final StudentIdentityService identities;
    private final CatalogService catalog;
    private final CirculationService circulation;
    private final AttendanceRepository attendance;
    private final AttendanceService attendanceService;

    public StudentPortalController(StudentIdentityService identities, CatalogService catalog,
                                   CirculationService circulation, AttendanceRepository attendance,
                                   AttendanceService attendanceService) {
        this.identities = identities;
        this.catalog = catalog;
        this.circulation = circulation;
        this.attendance = attendance;
        this.attendanceService = attendanceService;
    }

    @GetMapping("/profile")
    public CurrentStudent profile(@AuthenticationPrincipal Jwt jwt) {
        return identities.requireCurrentStudent(jwt);
    }

    @GetMapping("/catalog")
    public PageResult<BookSummary> catalog(@RequestParam(defaultValue = "") String query,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "25") int size) {
        return catalog.list(query, page, size);
    }

    @GetMapping("/loans")
    public List<Map<String, Object>> loans(@AuthenticationPrincipal Jwt jwt,
                                           @RequestParam(defaultValue = "false") boolean current) {
        CurrentStudent student = identities.requireCurrentStudent(jwt);
        return circulation.list(current, student.id(), null, false);
    }

    @GetMapping("/attendance")
    public List<AttendanceRecord> attendance(@AuthenticationPrincipal Jwt jwt) {
        CurrentStudent student = identities.requireCurrentStudent(jwt);
        return attendance.forMember(student.id());
    }

    @PostMapping("/attendance/entrance")
    public Map<String, String> entrance(@Valid @RequestBody StudentEntranceRequest request,
                                        @AuthenticationPrincipal Jwt jwt) {
        var result = attendanceService.studentEntranceScan(request.scanId(), identities.requireCurrentStudent(jwt).id());
        String message = "CHECKED_IN".equals(result.action())
                ? "You are checked in. Have a good study session."
                : "You are checked out. Have a safe trip.";
        return Map.of("action", result.action(), "message", message);
    }
}
