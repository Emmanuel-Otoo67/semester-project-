package com.libtrack.attendance.api;

public class AttendanceConflictException extends RuntimeException {
    public AttendanceConflictException(String message) {
        super(message);
    }
}
