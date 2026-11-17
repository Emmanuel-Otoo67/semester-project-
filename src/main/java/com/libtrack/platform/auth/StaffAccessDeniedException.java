package com.libtrack.platform.auth;

import org.springframework.security.access.AccessDeniedException;

public class StaffAccessDeniedException extends AccessDeniedException {
    public StaffAccessDeniedException(String message) {
        super(message);
    }
}
