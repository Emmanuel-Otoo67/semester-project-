package com.libtrack.platform.auth;

import com.libtrack.platform.config.SecurityConfig;
import com.libtrack.platform.health.SessionController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SessionController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("local-dev")
class LocalDevelopmentSessionTest {
    @Autowired MockMvc mvc;
    @Autowired ApplicationContext context;
    @MockBean StaffIdentityService identityService;

    @Test
    void allowsAnonymousSessionAndReturnsLocalAdministrator() throws Exception {
        var staff = new CurrentStaff(UUID.fromString("00000000-0000-0000-0000-000000000001"), null,
                "Local Development Admin", StaffRole.ADMIN);
        when(identityService.requireCurrentStaff(null)).thenReturn(staff);

        mvc.perform(get("/api/v1/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.localDevelopment").value(true))
                .andExpect(jsonPath("$.staffId").value("00000000-0000-0000-0000-000000000001"))
                .andExpect(jsonPath("$.displayName").value("Local Development Admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"));

        verify(identityService).requireCurrentStaff(null);
        org.junit.jupiter.api.Assertions.assertEquals(0, context.getBeanNamesForType(
                org.springframework.security.oauth2.jwt.JwtDecoder.class).length);
    }
}
