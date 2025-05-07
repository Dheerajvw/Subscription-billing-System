package com.Select.Project.SubscriptionPlans;

public interface SubscriptionPlansServices {
    public SubscriptionPlansError getSubscriptionPlanAll();
    public SubscriptionPlansError getSubscriptionPlanById(int subscriptionPlanId);
    public SubscriptionPlansError addSubscriptionPlan(SubscriptionPlans subscriptionPlan);
    public SubscriptionPlansError updateSubscriptionPlan(int subscriptionPlanId, SubscriptionPlans subscriptionPlan);
    public SubscriptionPlansError deleteSubscriptionPlan(int subscriptionPlanId);

}
