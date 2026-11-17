package com.libtrack.dashboard.service;

import com.libtrack.dashboard.api.DashboardSummary;
import com.libtrack.dashboard.data.DashboardRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {
    private final DashboardRepository repository;
    private final String timezone;
    public DashboardService(DashboardRepository repository,
                            @Value("${libtrack.library.timezone:Africa/Accra}") String timezone) {
        this.repository = repository; this.timezone = timezone;
    }
    public DashboardSummary summary() { return repository.summary(timezone); }
}
