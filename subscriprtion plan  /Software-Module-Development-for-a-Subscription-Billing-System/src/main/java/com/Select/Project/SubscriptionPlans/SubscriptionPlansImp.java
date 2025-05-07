package com.Select.Project.SubscriptionPlans;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;

@Service
public class SubscriptionPlansImp implements SubscriptionPlansServices {
    @Autowired
    private SubscriptionPlansResp subscriptionPlansRepository;

    @Override
    public SubscriptionPlansError getSubscriptionPlanAll() {
        List<SubscriptionPlans> subscriptionPlans = subscriptionPlansRepository.findAll();
        if (subscriptionPlans.isEmpty()) {
            return new SubscriptionPlansError("No subscription plans found", 404, null);
        }
        return new SubscriptionPlansError("Subscription plans found", 200, subscriptionPlans);
    }

    @Override
    public SubscriptionPlansError getSubscriptionPlanById(int subscriptionPlanId) {
        SubscriptionPlans subscriptionPlan = subscriptionPlansRepository.findById(subscriptionPlanId);
        if (subscriptionPlan == null) {
            return new SubscriptionPlansError("Subscription plan not found", 404, null);
        }
        return new SubscriptionPlansError("Subscription plan found", 200, List.of(subscriptionPlan));
    }

    @Override
    public SubscriptionPlansError deleteSubscriptionPlan(int subscriptionPlanId) {
        SubscriptionPlans subscriptionPlan = subscriptionPlansRepository.findById(subscriptionPlanId);
        if (subscriptionPlan == null) {
            return new SubscriptionPlansError("Subscription plan not found", 404, null);
        }
        subscriptionPlansRepository.deleteById(subscriptionPlanId);
        return new SubscriptionPlansError("Subscription plan deleted", 200, null);
    }

    @Override
    @Transactional
    public SubscriptionPlansError addSubscriptionPlan(SubscriptionPlans subscriptionPlan) {
        if(subscriptionPlan.getSubscriptionPlanName()==null){
                return new SubscriptionPlansError("Subscription plan name is required", 400, null);
            }
        if(subscriptionPlan.getSubscriptionPlanPrice().compareTo(BigDecimal.ZERO) == 0){
            return new SubscriptionPlansError("Subscription plan price is required", 400, null);
            }
        if(subscriptionPlan.getSubscriptionPlanDescription()==null){    
                return new SubscriptionPlansError("Subscription plan description is required", 400, null);
            }
        if(subscriptionPlan.getSubscriptionPlanDuration()==0){
            return new SubscriptionPlansError("Subscription plan duration is required", 400, null);
            }
        if(subscriptionPlan.getUsageLimit()==0){
            return new SubscriptionPlansError("Subscription plan usage limit is required", 400, null);
            }
        try {
            // Set ID to null to let the database generate it
            subscriptionPlan.setSubscriptionPlanId(null);
            SubscriptionPlans savedPlan = subscriptionPlansRepository.save(subscriptionPlan);
            return new SubscriptionPlansError("Successfully added", 200, List.of(savedPlan));
        } catch (Exception e) {
            return new SubscriptionPlansError("Failed to add subscription plan: " + e.getMessage(), 400, null);
        }
    }

    @Override
    public SubscriptionPlansError updateSubscriptionPlan(int subscriptionPlanId, SubscriptionPlans subscriptionPlan) {
        SubscriptionPlans subscriptionPlanexPlans = subscriptionPlansRepository.findById(subscriptionPlanId);
        if (subscriptionPlanexPlans == null) {
                return new SubscriptionPlansError("Subscription plan not found", 404, null);
            }

        if(subscriptionPlan.getSubscriptionPlanName()!=null){
            if(subscriptionPlan.getSubscriptionPlanName().equals(subscriptionPlanexPlans.getSubscriptionPlanName())){
                subscriptionPlanexPlans.setSubscriptionPlanName(subscriptionPlanexPlans.getSubscriptionPlanName());
            }
            else{
                subscriptionPlanexPlans.setSubscriptionPlanName(subscriptionPlan.getSubscriptionPlanName());
            }       
            }
        if(subscriptionPlan.getSubscriptionPlanPrice().compareTo(BigDecimal.ZERO) != 0){
           if(subscriptionPlan.getSubscriptionPlanPrice().compareTo(subscriptionPlanexPlans.getSubscriptionPlanPrice()) == 0){ 
            subscriptionPlanexPlans.setSubscriptionPlanPrice(subscriptionPlanexPlans.getSubscriptionPlanPrice());
           }
           else{
            subscriptionPlanexPlans.setSubscriptionPlanPrice(subscriptionPlan.getSubscriptionPlanPrice());
           }
            }
        if(subscriptionPlan.getSubscriptionPlanDescription()!=null){
            if(subscriptionPlan.getSubscriptionPlanDescription().equals(subscriptionPlanexPlans.getSubscriptionPlanDescription())){
                subscriptionPlanexPlans.setSubscriptionPlanDescription(subscriptionPlanexPlans.getSubscriptionPlanDescription());
            }
            else{
                subscriptionPlanexPlans.setSubscriptionPlanDescription(subscriptionPlan.getSubscriptionPlanDescription());
            }
            }
        if(subscriptionPlan.getSubscriptionPlanDuration()!=0){
            if(subscriptionPlan.getSubscriptionPlanDuration()==subscriptionPlanexPlans.getSubscriptionPlanDuration()){
                subscriptionPlanexPlans.setSubscriptionPlanDuration(subscriptionPlanexPlans.getSubscriptionPlanDuration());
            }
            else{
                subscriptionPlanexPlans.setSubscriptionPlanDuration(subscriptionPlan.getSubscriptionPlanDuration());
            }
        }
        if(subscriptionPlan.getUsageLimit()!=0){
            if(subscriptionPlan.getUsageLimit()==subscriptionPlanexPlans.getUsageLimit()){
                subscriptionPlanexPlans.setUsageLimit(subscriptionPlanexPlans.getUsageLimit());
            }
            else{
                subscriptionPlanexPlans.setUsageLimit(subscriptionPlan.getUsageLimit());
            }
        }
        subscriptionPlansRepository.save(subscriptionPlanexPlans);
        return new SubscriptionPlansError("Subscription plan updated", 200, List.of(subscriptionPlanexPlans));
    }
}
