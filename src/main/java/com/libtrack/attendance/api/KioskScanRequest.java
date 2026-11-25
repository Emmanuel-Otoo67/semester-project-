package com.libtrack.attendance.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record KioskScanRequest(@NotNull UUID scanId, @NotBlank @Size(max = 100) String identifier) {}
