package com.libtrack.reports;

import com.libtrack.reports.data.LibraryReportsRepository;
import com.libtrack.reports.service.LibraryReportsService;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class LibraryReportsServiceTest {
    private final LibraryReportsRepository repository = mock(LibraryReportsRepository.class);
    private final LibraryReportsService service = new LibraryReportsService(repository);

    @Test
    void rejectsReversedReportDateRangeBeforeQueryingDatabase() {
        assertThrows(IllegalArgumentException.class, () -> service.report(LocalDate.parse("2026-11-25"), LocalDate.parse("2026-11-24")));
        verifyNoInteractions(repository);
    }
}
