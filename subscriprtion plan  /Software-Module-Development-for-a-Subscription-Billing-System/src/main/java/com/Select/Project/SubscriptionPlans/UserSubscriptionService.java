package com.Select.Project.SubscriptionPlans;

import java.util.List;

public interface UserSubscriptionService {
    UserSubscription createSubscription(Long customerId, int planId, String paymentMethod);
    UserSubscription getSubscription(Long subscriptionId);
    List<UserSubscription> getCustomerSubscriptions(Long customerId);
    UserSubscription cancelSubscription(Long subscriptionId);
    UserSubscription changeSubscriptionPlan(Long userId, int newPlanId);
    boolean isTrialAvailable(Long userId);
    UserSubscription applyPromoCode(Long subscriptionId, String promoCode);
    void fixCustomerSubscriptionId(Long customerId);
} 