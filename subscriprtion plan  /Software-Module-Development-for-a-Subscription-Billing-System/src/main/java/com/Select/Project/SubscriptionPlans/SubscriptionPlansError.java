package com.Select.Project.SubscriptionPlans;

import java.util.List;

    public class SubscriptionPlansError {
    private String message;
    private int statusCode;
    private List<SubscriptionPlans> SubscriptionPlans;

    public SubscriptionPlansError(String message, int statusCode, List<SubscriptionPlans> SubscriptionPlans) {
        this.message = message;
        this.statusCode = statusCode;
        this.SubscriptionPlans = SubscriptionPlans;
    }

    public String getMessage() {
        return message;
    }

    public int getStatusCode() {
        return statusCode;
    }

        public List<SubscriptionPlans> getSubscriptionPlans() {
        return SubscriptionPlans;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setStatusCode(int statusCode) {
        this.statusCode = statusCode;
    }

    public void setSubscriptionPlans(List<SubscriptionPlans> SubscriptionPlans) {
        this.SubscriptionPlans = SubscriptionPlans;
    }
    
}
