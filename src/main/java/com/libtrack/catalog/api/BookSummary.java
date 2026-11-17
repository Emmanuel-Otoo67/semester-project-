package com.libtrack.catalog.api;

import java.util.UUID;
public record BookSummary(UUID id, String title, String isbn, String publisher, Integer publicationYear,
                          String authors, String categories, long copies, long availableCopies) {}
