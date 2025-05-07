package com.Select.Project.SubscriptionPlans;

import lombok.Data;

@Data
public class TrialStatusResponse {
    private boolean trialAvailable;

    public TrialStatusResponse(boolean trialAvailable) {
        this.trialAvailable = trialAvailable;
    }
} 