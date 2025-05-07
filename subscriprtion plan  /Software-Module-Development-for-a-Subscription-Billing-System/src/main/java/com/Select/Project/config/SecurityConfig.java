package com.Select.Project.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.RegisterSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.session.HttpSessionEventPublisher;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private TokenValidationFilter tokenValidationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .addFilterBefore(tokenValidationFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                // Session management endpoints
                .requestMatchers("/auth/login", "/auth/session-expired").permitAll()
                
                // User registration and login endpoints (public)
                .requestMatchers("/users/register", "/users/login").permitAll()
                .requestMatchers("/keycloak-events").permitAll()
                
                // Make discounts endpoint publicly accessible
                .requestMatchers("/discounts").permitAll()
                
                // Billing Service endpoints
                .requestMatchers("/billing/invoices/generate").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/billing/invoices/{invoiceId}").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/billing/invoices/user/{userId}").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/billing/invoices/pending").hasAnyRole("ADMIN", "USER")
                .requestMatchers("/billing/invoices/{invoiceId}/pay").hasRole("USER")
                .requestMatchers("/billing/cycles/{userId}").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/billing/renewal/{userId}").hasAnyRole("USER", "ADMIN")
                
                // Usage endpoints
                .requestMatchers("/usage/track").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/usage/user/{userId}").hasAnyRole("USER", "ADMIN")
                
                // Payment endpoints
                .requestMatchers("/payments/initiate").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/payments/status/{transactionId}").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/payments/refund").hasRole("ADMIN")
                .requestMatchers("/payments/chargeback").hasRole("ADMIN")
                .requestMatchers("/payments/methods").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/payments/methods/add").hasAnyRole("USER", "ADMIN")
                
                // Notification endpoints
                .requestMatchers("/notifications/subscription/renewal").hasRole("ADMIN")
                .requestMatchers("/notifications/subscription/cancellation").hasRole("ADMIN")
                .requestMatchers("/notifications/payment/failed").hasRole("ADMIN")
                .requestMatchers("/notifications/payment/success").hasRole("ADMIN")
                
                // Subscription endpoints
                .requestMatchers("/subscriptions/plans").permitAll()
                .requestMatchers(request -> request.getMethod().equals("POST") && request.getRequestURI().equals("/subscriptions/plans")).hasRole("ADMIN")
                .requestMatchers("/subscriptions/plans/{id}").hasAnyRole("USER", "ADMIN")
                .requestMatchers(request -> (request.getMethod().equals("PUT") || request.getMethod().equals("DELETE")) && 
                               request.getRequestURI().matches("/subscriptions/plans/.*")).hasRole("ADMIN")
                .requestMatchers("/subscriptions").hasRole("USER")
                .requestMatchers("/subscriptions/{userId}").hasRole("USER")
                .requestMatchers("/subscriptions/{userId}/change-plan").hasRole("USER")
                .requestMatchers("/subscriptions/{userId}/cancel").hasRole("USER")
                .requestMatchers("/subscriptions/trial-status/{userId}").hasRole("USER")
                .requestMatchers("/subscriptions/apply-promo").hasAnyRole("USER", "ADMIN")
                
                // Actuator and other endpoints
                .requestMatchers("/actuator/**", "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .maximumSessions(1)
                .maxSessionsPreventsLogin(false)
                .expiredUrl("/auth/session-expired")
            )
            .logout(logout -> logout
                .logoutUrl("/auth/logout")
                .logoutSuccessUrl("/auth/login")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            );
            
        return http.build();
    }
    
    @Bean
    protected SessionAuthenticationStrategy sessionAuthenticationStrategy() {
        return new RegisterSessionAuthenticationStrategy(sessionRegistry());
    }
    
    @Bean
    public org.springframework.security.core.session.SessionRegistry sessionRegistry() {
        return new org.springframework.security.core.session.SessionRegistryImpl();
    }
    
    @Bean
    public HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }
    
    private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            JwtGrantedAuthoritiesConverter defaultConverter = new JwtGrantedAuthoritiesConverter();
            defaultConverter.setAuthorityPrefix("ROLE_");
            
            // Get the standard authorities from JWT scope or authorities
            Collection<GrantedAuthority> defaultAuthorities = defaultConverter.convert(jwt);
            
            // Extract resource_access.client-id.roles from JWT
            Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
            if (resourceAccess == null) {
                return defaultAuthorities;
            }
            
            Map<String, Object> clientAccess = (Map<String, Object>) resourceAccess.get("billing-api");
            if (clientAccess == null) {
                return defaultAuthorities;
            }
            
            List<String> clientRoles = (List<String>) clientAccess.get("roles");
            if (clientRoles == null) {
                return defaultAuthorities;
            }
            
            // Convert client roles to authorities with "ROLE_" prefix
            Collection<GrantedAuthority> clientAuthorities = clientRoles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                .collect(Collectors.toList());
            
            // Combine the default and custom authorities
            return Stream.concat(defaultAuthorities.stream(), clientAuthorities.stream())
                .collect(Collectors.toList());
        });
        
        return converter;
    }
} 