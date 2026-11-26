package com.libtrack.attendance.api;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record StudentEntranceRequest(@NotNull UUID scanId) {}
