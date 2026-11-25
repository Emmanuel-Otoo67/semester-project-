package com.libtrack.attendance.api;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AttendanceRecord(UUID id, UUID memberId, String libraryNumber, String studentName,
                               String programme, String level, OffsetDateTime checkedInAt,
                               OffsetDateTime checkedOutAt) {}
