package com.libtrack.catalog.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record BookRequest(@NotBlank @Size(max=500) String title,
                          @Size(max=20) String isbn,
                          @Size(max=200) String publisher,
                          Integer publicationYear,
                          @Size(max=10000) String description,
                          List<@NotBlank @Size(max=200) String> authors,
                          List<@NotBlank @Size(max=120) String> categories) {}
