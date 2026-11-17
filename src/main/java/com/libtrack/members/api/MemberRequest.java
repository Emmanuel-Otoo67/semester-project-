package com.libtrack.members.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MemberRequest(@NotBlank @Size(max=50) String libraryNumber,
                            @NotBlank @Size(max=100) String firstName,
                            @NotBlank @Size(max=100) String lastName,
                            @Pattern(regexp="STUDENT|STAFF|OTHER") String memberType,
                            @Email @Size(max=254) String email,
                            @Size(max=40) String phone,
                            @Pattern(regexp="ACTIVE|SUSPENDED|INACTIVE") String status) {}
