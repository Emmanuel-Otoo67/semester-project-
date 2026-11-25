package com.libtrack.members.api;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record StudentAccountLinkRequest(@NotNull UUID authUserId) {}
