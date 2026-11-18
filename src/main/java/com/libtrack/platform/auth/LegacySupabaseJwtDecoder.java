package com.libtrack.platform.auth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/** Validates legacy Supabase HS256 access tokens through Auth's signed /user endpoint.
 * The shared JWT secret remains exclusively in Supabase and is never copied to this app.
 */
public class LegacySupabaseJwtDecoder implements JwtDecoder {
    private final String issuer;
    private final String audience;
    private final String publishableKey;
    private final RestClient authClient;
    private final ObjectMapper mapper;

    public LegacySupabaseJwtDecoder(String issuer, String audience, String publishableKey,
                                    RestClient.Builder restClientBuilder, ObjectMapper mapper) {
        this.issuer = issuer.replaceAll("/$", "");
        this.audience = audience;
        this.publishableKey = publishableKey;
        this.authClient = restClientBuilder.baseUrl(this.issuer).build();
        this.mapper = mapper;
    }

    @Override
    public Jwt decode(String token) {
        try {
            String[] pieces = token.split("\\.");
            if (pieces.length != 3) throw new BadJwtException("Malformed access token.");
            Map<String, Object> headers = mapper.readValue(decodePart(pieces[0]), new TypeReference<>() {});
            Map<String, Object> claims = mapper.readValue(decodePart(pieces[1]), new TypeReference<>() {});
            if (!"HS256".equals(headers.get("alg"))) throw new BadJwtException("Expected a legacy HS256 access token.");
            if (!issuer.equals(claims.get("iss"))) throw new BadJwtException("Access token issuer is invalid.");
            if (!audiences(claims.get("aud")).contains(audience)) throw new BadJwtException("Access token audience is invalid.");
            if (!(claims.get("sub") instanceof String subject) || subject.isBlank()) throw new BadJwtException("Access token subject is missing.");
            if (!(claims.get("exp") instanceof Number expiration) || Instant.ofEpochSecond(expiration.longValue()).isBefore(Instant.now()))
                throw new BadJwtException("Access token has expired.");
            if (claims.get("iat") instanceof Number issued && Instant.ofEpochSecond(issued.longValue()).isAfter(Instant.now().plusSeconds(30)))
                throw new BadJwtException("Access token issue time is invalid.");

            Map<?, ?> authUser = authClient.get().uri("user")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header("apikey", publishableKey)
                    .retrieve().body(Map.class);
            if (authUser == null || !subject.equals(String.valueOf(authUser.get("id"))))
                throw new BadJwtException("Supabase Auth did not confirm this access token.");

            Instant issuedAt = claims.get("iat") instanceof Number issued ? Instant.ofEpochSecond(issued.longValue()) : Instant.EPOCH;
            return Jwt.withTokenValue(token).headers(target -> target.putAll(headers)).claims(target -> target.putAll(claims))
                    .issuedAt(issuedAt).expiresAt(Instant.ofEpochSecond(expiration.longValue())).build();
        } catch (BadJwtException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BadJwtException("Could not validate this access token with Supabase Auth.", exception);
        }
    }

    private static String decodePart(String encoded) {
        return new String(Base64.getUrlDecoder().decode(encoded), java.nio.charset.StandardCharsets.UTF_8);
    }

    private static List<String> audiences(Object aud) {
        if (aud instanceof String value) return List.of(value);
        if (aud instanceof List<?> values) return values.stream().map(String::valueOf).toList();
        return List.of();
    }
}
