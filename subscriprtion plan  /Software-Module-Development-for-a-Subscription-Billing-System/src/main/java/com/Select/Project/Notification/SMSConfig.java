package com.Select.Project.Notification;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;

@Data
@Configuration
@ConfigurationProperties(prefix = "sms.api")
public class SMSConfig {
    private String key;
    private String url;
} 