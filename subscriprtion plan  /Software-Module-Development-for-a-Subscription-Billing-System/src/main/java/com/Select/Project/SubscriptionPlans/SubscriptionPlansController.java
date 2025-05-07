package com.Select.Project.SubscriptionPlans;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;

@RestController
public class SubscriptionPlansController {
    @Autowired
    private SubscriptionPlansServices subscriptionPlansServices;

    @GetMapping("/subscriptions/plans")
    public SubscriptionPlansError getSubscriptionPlanAll() {
        return subscriptionPlansServices.getSubscriptionPlanAll();  
    }

    @GetMapping("/subscriptions/plans/{subscriptionPlanId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public SubscriptionPlansError getSubscriptionPlanById(@PathVariable int subscriptionPlanId) {
        return subscriptionPlansServices.getSubscriptionPlanById(subscriptionPlanId);
    }

    @DeleteMapping("/subscriptions/plans/{subscriptionPlanId}")
    @PreAuthorize("hasRole('ADMIN')")
    public SubscriptionPlansError deleteSubscriptionPlan(@PathVariable int subscriptionPlanId) {
        return subscriptionPlansServices.deleteSubscriptionPlan(subscriptionPlanId);
    }

    @PostMapping("/subscriptions/plans")
    @PreAuthorize("hasRole('ADMIN')")
    public SubscriptionPlansError addSubscriptionPlan(@RequestBody SubscriptionPlans subscriptionPlan) {
        return subscriptionPlansServices.addSubscriptionPlan(subscriptionPlan);
    }

    @PutMapping("/subscriptions/plans/{subscriptionPlanId}")
    @PreAuthorize("hasRole('ADMIN')")
    public SubscriptionPlansError updateSubscriptionPlan(@PathVariable int subscriptionPlanId, @RequestBody SubscriptionPlans subscriptionPlan) {
        return subscriptionPlansServices.updateSubscriptionPlan(subscriptionPlanId, subscriptionPlan);
    }
}