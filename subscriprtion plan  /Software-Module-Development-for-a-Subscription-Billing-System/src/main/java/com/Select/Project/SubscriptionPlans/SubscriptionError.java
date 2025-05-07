package com.Select.Project.SubscriptionPlans;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SubscriptionError {
    private int status;
    private String message;

    public SubscriptionError(int status, String message) {
        this.status = status;
        this.message = message;
    }
} 