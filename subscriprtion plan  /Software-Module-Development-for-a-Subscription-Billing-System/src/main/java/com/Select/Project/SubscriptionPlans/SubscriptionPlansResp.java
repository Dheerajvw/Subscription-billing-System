package com.Select.Project.SubscriptionPlans;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubscriptionPlansResp extends JpaRepository<SubscriptionPlans, Integer> {
    SubscriptionPlans findById(int subscriptionPlanId);
    SubscriptionPlans findBySubscriptionPlanName(String name);
}
