package com.libtrack.platform.auth;

import java.util.UUID;

public record CurrentStaff(UUID id, UUID authUserId, String displayName, StaffRole role) {}
