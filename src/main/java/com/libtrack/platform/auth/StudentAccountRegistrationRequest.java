package com.libtrack.platform.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentAccountRegistrationRequest(
        @NotBlank @Size(max = 50) String libraryNumber,
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Size(max = 160) String programme,
        @NotBlank @Size(max = 80) String level) {
}
