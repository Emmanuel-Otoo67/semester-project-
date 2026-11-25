package com.libtrack.platform.auth;

public class StudentAccessDeniedException extends RuntimeException {
    public StudentAccessDeniedException(String message) {
        super(message);
    }
}
