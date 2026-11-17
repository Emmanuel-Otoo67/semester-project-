package com.libtrack.dashboard.api;

import java.util.List;
import java.util.Map;

public record DashboardSummary(long titles, long activeMembers, long availableCopies, long onLoanCopies,
                               long overdueLoans, long dueToday, long actionableHolds,
                               List<Map<String, Object>> recentActivity) {}
