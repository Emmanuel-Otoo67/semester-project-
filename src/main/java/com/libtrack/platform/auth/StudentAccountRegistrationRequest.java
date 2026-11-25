package com.libtrack.platform.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentAccountRegistrationRequest(
        @NotBlank @Size(max = 50) String libraryNumber) {
}
