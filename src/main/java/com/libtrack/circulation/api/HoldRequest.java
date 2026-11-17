package com.libtrack.circulation.api;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
public record HoldRequest(@NotNull UUID memberId,@NotNull UUID bookId) {}
