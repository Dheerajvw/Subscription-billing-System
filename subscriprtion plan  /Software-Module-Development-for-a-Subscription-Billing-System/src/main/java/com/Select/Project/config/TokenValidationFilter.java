package com.Select.Project.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
// import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
//import java.util.Collections;

@Component
public class TokenValidationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtDecoder jwtDecoder;

    @Autowired
    private TokenService tokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // Skip validation for non-authenticated endpoints
        String path = request.getRequestURI();
        if (path.startsWith("/auth/login") || 
            path.startsWith("/auth/session-expired") || 
            path.equals("/users/login") ||
            path.equals("/users/register") ||
            path.equals("/actuator") ||
            path.startsWith("/actuator/") ||
            path.startsWith("/swagger-ui") ||
            path.startsWith("/v3/api-docs")) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            try {
                // Validate token with introspection endpoint
                if (!tokenService.isTokenValid(token)) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("{\"error\":\"Invalid or expired token\"}");
                    return;
                }
                
                // Decode JWT
                Jwt jwt = jwtDecoder.decode(token);
                
                // Check for token expiration
                if (jwt.getExpiresAt() != null && jwt.getExpiresAt().toEpochMilli() < System.currentTimeMillis()) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("{\"error\":\"Token expired\", \"redirect\":\"/auth/session-expired\"}");
                    return;
                }
                
                // Continue to the next filter
                filterChain.doFilter(request, response);
                
            } catch (JwtException e) {
                // Invalid token structure
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("{\"error\":\"Invalid token: " + e.getMessage() + "\"}");
            }
        } else {
            // No token provided, continue to the security chain to handle authentication
            filterChain.doFilter(request, response);
        }
    }
} 