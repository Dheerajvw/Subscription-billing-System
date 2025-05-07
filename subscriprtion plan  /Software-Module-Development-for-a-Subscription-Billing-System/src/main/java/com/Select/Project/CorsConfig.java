package com.Select.Project;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Allow Angular app's URL
        config.addAllowedOrigin("http://localhost:4200");
        
        // Allow specific methods including OPTIONS for preflight
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        
        // Allow specific headers that are needed for authentication
        config.setAllowedHeaders(Arrays.asList(
            "Origin", 
            "Content-Type", 
            "Accept", 
            "Authorization", 
            "X-Requested-With", 
            "Access-Control-Request-Method", 
            "Access-Control-Request-Headers",
            "X-Customer-ID"));
        
        // Allow credentials (cookies, authentication)
        config.setAllowCredentials(true);
        
        // Expose these headers to the client
        config.setExposedHeaders(Arrays.asList(
            "Authorization", 
            "Set-Cookie", 
            "X-Customer-ID",
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Credentials"));
        
        // Set max age for preflight requests cache (in seconds)
        config.setMaxAge(3600L);
        
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}