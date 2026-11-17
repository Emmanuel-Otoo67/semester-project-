package com.libtrack.circulation.api;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
public record CheckoutRequest(@NotNull UUID memberId,@NotBlank @Size(max=80) String copyBarcode) {}
