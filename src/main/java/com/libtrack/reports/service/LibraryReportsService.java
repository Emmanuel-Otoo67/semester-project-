package com.libtrack.reports.service;

import com.libtrack.reports.data.LibraryReportsRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class LibraryReportsService {
    private static final ZoneId LIBRARY_ZONE = ZoneId.of("Africa/Accra");
    private final LibraryReportsRepository repository;
    public LibraryReportsService(LibraryReportsRepository repository) { this.repository = repository; }

    public Map<String, Object> report(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now(LIBRARY_ZONE);
        LocalDate start = from == null ? today.minusDays(29) : from;
        LocalDate end = to == null ? today : to;
        if (start.isAfter(end)) throw new IllegalArgumentException("The report start date must be on or before the end date.");
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("from", start);
        response.put("to", end);
        response.putAll(repository.report(start, end, LIBRARY_ZONE));
        return response;
    }
}
