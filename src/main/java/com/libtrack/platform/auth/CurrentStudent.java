package com.libtrack.platform.auth;

import java.util.UUID;

public record CurrentStudent(UUID id, UUID authUserId, String libraryNumber, String displayName,
                             String programme, String level, String email, String phone) {}
