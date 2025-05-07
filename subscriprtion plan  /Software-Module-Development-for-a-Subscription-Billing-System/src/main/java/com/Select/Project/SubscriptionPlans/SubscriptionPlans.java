package com.Select.Project.SubscriptionPlans;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import lombok.Data;
import java.math.BigDecimal;

@Entity
@Table(name = "subscription_plans")
@Data
public class SubscriptionPlans {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subscription_plan_id")
    private Integer subscriptionPlanId;
    
    @Column(name = "subscription_plan_name", nullable = false, unique = true, length = 100)
    private String subscriptionPlanName;
    
    @Column(name = "subscription_plan_description", nullable = false, length = 500)
    private String subscriptionPlanDescription;
    
    @Column(name = "subscription_plan_price", nullable = false, columnDefinition = "DECIMAL(10,2)")
    private BigDecimal subscriptionPlanPrice;
    
    @Column(name = "subscription_plan_duration", nullable = false)
    private Integer subscriptionPlanDuration;
    
    @Column(name = "usage_limit", nullable = false)
    private Integer usageLimit;
}
