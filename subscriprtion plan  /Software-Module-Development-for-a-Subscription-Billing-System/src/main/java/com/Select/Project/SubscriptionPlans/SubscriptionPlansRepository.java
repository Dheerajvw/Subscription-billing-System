package com.Select.Project.SubscriptionPlans;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubscriptionPlansRepository extends JpaRepository<SubscriptionPlans, Integer> {
    SubscriptionPlans findBySubscriptionPlanName(String name);
} 