package com.Select.Project.BillingServices;

public class BillingCycleResponse {
    private Long userId;
    private String customerName;
    private String currentPlan;
    private double planPrice;
    private String billingCycleStart;
    private String billingCycleEnd;
    private String nextBillingDate;
    private String billingStatus;
    private int daysRemaining;

    public BillingCycleResponse(Long userId, String customerName, String currentPlan, double planPrice, String billingCycleStart, String billingCycleEnd, String nextBillingDate, String billingStatus, int daysRemaining) {
        this.userId = userId;
        this.customerName = customerName;
        this.currentPlan = currentPlan;
        this.planPrice = planPrice;
        this.billingCycleStart = billingCycleStart;
        this.billingCycleEnd = billingCycleEnd;
        this.nextBillingDate = nextBillingDate;
        this.billingStatus = billingStatus;
        this.daysRemaining = daysRemaining;
    }

    public Long getUserId()
    { 
        return userId; 
    }
    public void setUserId(Long userId) {
         this.userId = userId; 
    }
    public String getCustomerName() { 
        return customerName; 
    }
    public void setCustomerName(String customerName) {
        this.customerName = customerName; 
    }
    public String getCurrentPlan() {
        return currentPlan;
    }
    public void setCurrentPlan(String currentPlan) { 
        this.currentPlan = currentPlan; 
    }
    public double getPlanPrice() { 
        return planPrice; 
    }
    public void setPlanPrice(double planPrice) { 
        this.planPrice = planPrice; 
    }
    public String getBillingCycleStart() { 
        return billingCycleStart; 
    }
    public void setBillingCycleStart(String billingCycleStart) { 
        this.billingCycleStart = billingCycleStart; 
    }
    public String getBillingCycleEnd() { 
        return billingCycleEnd; 
    }
    public void setBillingCycleEnd(String billingCycleEnd) { 
        this.billingCycleEnd = billingCycleEnd; 
    }
    public String getNextBillingDate() { 
        return nextBillingDate; 
    }
    public void setNextBillingDate(String nextBillingDate) { 
        this.nextBillingDate = nextBillingDate; 
    }
    public String getBillingStatus() { 
        return billingStatus; 
    }
    public void setBillingStatus(String billingStatus) { 
        this.billingStatus = billingStatus; 
    }
    public int getDaysRemaining() { 
        return daysRemaining; 
    }
    public void setDaysRemaining(int daysRemaining) { 
        this.daysRemaining = daysRemaining; 
    }
} 