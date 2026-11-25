package com.libtrack.attendance.api;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CheckInRequest(@NotNull UUID memberId) {}
