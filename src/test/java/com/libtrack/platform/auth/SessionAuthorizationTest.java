package com.libtrack.platform.auth;

import com.libtrack.platform.config.SecurityConfig;
import com.libtrack.platform.health.SessionController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SessionController.class)
@Import(SecurityConfig.class)
class SessionAuthorizationTest {
    @Autowired MockMvc mvc;
    @MockBean StaffIdentityService identityService;
    @MockBean JwtDecoder jwtDecoder;

    @Test
    void rejectsRequestsWithoutBearerAuthentication() throws Exception {
        mvc.perform(get("/api/v1/session"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsOnlyServerLinkedStaffIdentity() throws Exception {
        UUID authId = UUID.fromString("c9f46857-346d-4b4e-a151-d06c764ea8df");
        UUID staffId = UUID.fromString("1f91c6f5-09a5-49dc-82ef-29a2a9135f0b");
        when(identityService.requireCurrentStaff(any(Jwt.class))).thenReturn(
                new CurrentStaff(staffId, authId, "Ada Librarian", StaffRole.LIBRARIAN));

        mvc.perform(get("/api/v1/session").accept(MediaType.APPLICATION_JSON)
                        .with(jwt().jwt(token -> token.subject(authId.toString())
                                .claim("user_metadata", java.util.Map.of("role", "ADMIN")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.staffId").value(staffId.toString()))
                .andExpect(jsonPath("$.displayName").value("Ada Librarian"))
                .andExpect(jsonPath("$.role").value("LIBRARIAN"))
                .andExpect(jsonPath("$.username").doesNotExist());
    }

    @Test
    void deniesAuthenticatedNonStaffUser() throws Exception {
        UUID authId = UUID.fromString("c9f46857-346d-4b4e-a151-d06c764ea8df");
        when(identityService.requireCurrentStaff(any(Jwt.class))).thenThrow(new StaffAccessDeniedException(
                "This Supabase account is not linked to an active LibTrack staff account."));

        mvc.perform(get("/api/v1/session").with(jwt().jwt(token -> token.subject(authId.toString()))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("This Supabase account is not linked to an active LibTrack staff account."));
    }
}
