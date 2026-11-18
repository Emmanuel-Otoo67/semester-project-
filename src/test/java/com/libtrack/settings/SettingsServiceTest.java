package com.libtrack.settings;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.audit.data.AuditRepository;
import com.libtrack.platform.auth.CurrentStaff;
import com.libtrack.platform.auth.StaffRole;
import com.libtrack.settings.service.SettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SettingsServiceTest {
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private final SettingsService service=new SettingsService(jdbc,new ObjectMapper(),mock(AuditRepository.class));
    private final CurrentStaff admin=new CurrentStaff(UUID.randomUUID(),UUID.randomUUID(),"Admin",StaffRole.ADMIN);

    @Test void rejectsOutOfRangeLoanPolicyBeforeDatabaseWrite(){
        var error=assertThrows(IllegalArgumentException.class,()->service.update("circulation",Map.of(
                "defaultLoanDays",0,"maxLoansPerMember",5,"maxRenewals",1,"holdPickupDays",3),admin));
        assertTrue(error.getMessage().contains("defaultLoanDays"));
        verifyNoInteractions(jdbc);
    }

    @Test void rejectsUnknownSettingKeys(){
        assertThrows(IllegalArgumentException.class,()->service.update("passwords",Map.of("value","x"),admin));
        verifyNoInteractions(jdbc);
    }

    @Test void rejectsFeesWithoutThreeLetterCurrency(){
        var error=assertThrows(IllegalArgumentException.class,()->service.update("fees",Map.of(
                "enabled",true,"currency","Ghana cedi","overdueFeePerDay",1,"maxOverdueFee",5),admin));
        assertTrue(error.getMessage().contains("three-letter"));
        verifyNoInteractions(jdbc);
    }
}
