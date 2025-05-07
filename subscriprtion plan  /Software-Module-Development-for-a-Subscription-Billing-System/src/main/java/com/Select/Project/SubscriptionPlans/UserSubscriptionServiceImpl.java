package com.Select.Project.SubscriptionPlans;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
//import com.Select.Project.Discount.DiscountServiceImp;
import com.Select.Project.Users.CustomerRespositry;
import com.Select.Project.Users.Customers;
import java.sql.Timestamp;
import java.util.List;
import java.util.Set;
import java.util.ArrayList;
import java.util.HashSet;
import java.math.BigDecimal;

@Service
public class UserSubscriptionServiceImpl implements UserSubscriptionService {

    @Autowired
    private UserSubscriptionRepository userSubscriptionRepository;
    
    @Autowired
    private CustomerRespositry customerRepository;

    @Autowired
    private SubscriptionPlansRepository subscriptionPlansRepository;

    @Override
    public UserSubscription createSubscription(Long customerId, int planId, String paymentMethod) {
        Customers customer = customerRepository.findByCustomerId(customerId);
        if (customer == null) {
            throw new RuntimeException("Customer not found");
        }

        SubscriptionPlans plan = subscriptionPlansRepository.findById(planId)
            .orElseThrow(() -> new RuntimeException("Subscription plan not found"));

        // Check if customer already has an active subscription for this plan
        Set<UserSubscription> customerSubscriptions = new HashSet<>(customer.getUserSubscriptions());
        for (UserSubscription sub : customerSubscriptions) {
            if (sub.getSubscriptionPlan().getSubscriptionPlanId() == planId && "ACTIVE".equals(sub.getStatus())) {
                throw new RuntimeException("Customer already has an active subscription for this plan");
            }
        } 
        UserSubscription subscription = new UserSubscription();
        subscription.setCustomer(customer);
        subscription.setSubscriptionPlan(plan);
        subscription.setStatus("ACTIVE");
        subscription.setStartDate(new Timestamp(System.currentTimeMillis()));
        subscription.setEndDate(new Timestamp(System.currentTimeMillis() + (plan.getSubscriptionPlanDuration() * 24L * 60 * 60 * 1000)));
        subscription.setPaymentMethod(paymentMethod);
        subscription.setOriginalPrice(plan.getSubscriptionPlanPrice());
        subscription.setDiscountedPrice(plan.getSubscriptionPlanPrice());
       // subscription.setPromoCode(discountServiceImp.getDiscountByCode(plan.getSubscriptionPlanName()));

        customer.setSubscriptionStatus("ACTIVE");
        customer.setSubscriptionPaymentMethod(paymentMethod);
        customer.setSubscription_id(String.valueOf(plan.getSubscriptionPlanId()));


        subscription = userSubscriptionRepository.save(subscription);
        
        customerRepository.save(customer);

        return subscription;
    }

    @Override
    public UserSubscription getSubscription(Long subscriptionId) {
        return userSubscriptionRepository.findById(subscriptionId)
            .orElseThrow(() -> new RuntimeException("Subscription not found"));
    }

    @Override
    public List<UserSubscription> getCustomerSubscriptions(Long customerId) {
        Customers customer = customerRepository.findByCustomerId(customerId);
        if (customer == null) {
            throw new RuntimeException("Customer not found");
        }
        return new ArrayList<>(customer.getUserSubscriptions());
    }

    @Override
    public UserSubscription cancelSubscription(Long subscriptionId) {
        UserSubscription subscription = getSubscription(subscriptionId);
        subscription.setStatus("CANCELLED");
        subscription.setEndDate(new Timestamp(System.currentTimeMillis()));
        return userSubscriptionRepository.save(subscription);
    }

    @Override
    public UserSubscription changeSubscriptionPlan(Long userId, int newPlanId) {
        Customers customer = customerRepository.findByCustomerId(userId);
        if (customer == null) {
            throw new RuntimeException("Customer not found");
        }

        // Find active subscription for this customer
        UserSubscription currentSubscription = null;
        for (UserSubscription sub : customer.getUserSubscriptions()) {
            if ("ACTIVE".equals(sub.getStatus())) {
                currentSubscription = sub;
                break;
            }
        }

        if (currentSubscription == null) {
            throw new RuntimeException("No active subscription found for this user");
        }

        SubscriptionPlans newPlan = subscriptionPlansRepository.findById(newPlanId)
            .orElseThrow(() -> new RuntimeException("New subscription plan not found"));

        // Create new subscription with new plan
        UserSubscription newSubscription = new UserSubscription();
        newSubscription.setCustomer(customer);
        newSubscription.setSubscriptionPlan(newPlan);
        newSubscription.setStatus("ACTIVE");
        newSubscription.setStartDate(new Timestamp(System.currentTimeMillis()));
        newSubscription.setEndDate(new Timestamp(System.currentTimeMillis() + (newPlan.getSubscriptionPlanDuration() * 24L * 60 * 60 * 1000)));
        newSubscription.setPaymentMethod(currentSubscription.getPaymentMethod());

        // Cancel old subscription
        currentSubscription.setStatus("CANCELLED");
        currentSubscription.setEndDate(new Timestamp(System.currentTimeMillis()));
        userSubscriptionRepository.save(currentSubscription);

        return userSubscriptionRepository.save(newSubscription);
    }

    @Override
    public boolean isTrialAvailable(Long userId) {
        Customers customer = customerRepository.findByCustomerId(userId);
        if (customer == null) {
            throw new RuntimeException("Customer not found");
        }

        return customer.getUserSubscriptions().isEmpty();
    }

    @Override
    public UserSubscription applyPromoCode(Long subscriptionId, String promoCode) {
        UserSubscription subscription = getSubscription(subscriptionId);
        
        if (!"ACTIVE".equals(subscription.getStatus())) {
            throw new RuntimeException("Can only apply promo code to active subscriptions");
        }

        if (subscription.getPromoCode() != null && !subscription.getPromoCode().isEmpty()) {
            throw new RuntimeException("A promo code has already been applied to this subscription");
        }

        if (promoCode == null || promoCode.trim().isEmpty()) {
            throw new RuntimeException("Invalid promo code");
        }

        subscription.setPromoCode(promoCode);
        
        BigDecimal originalPrice = subscription.getSubscriptionPlan().getSubscriptionPlanPrice();
        BigDecimal discountPercentage = new BigDecimal("20"); // 20% discount
        BigDecimal discountAmount = originalPrice.multiply(discountPercentage.divide(new BigDecimal("100")));
        subscription.setDiscountedPrice(originalPrice.subtract(discountAmount));

        return userSubscriptionRepository.save(subscription);
    }

    @Override
    public void fixCustomerSubscriptionId(Long customerId) {
        Customers customer = customerRepository.findByCustomerId(customerId);
        if (customer == null) {
            throw new RuntimeException("Customer not found");
        }

        // Find active subscription
        for (UserSubscription sub : customer.getUserSubscriptions()) {
            if ("ACTIVE".equals(sub.getStatus())) {
                customer.setSubscription_id(String.valueOf(sub.getSubscriptionPlan().getSubscriptionPlanId()));
                customerRepository.save(customer);
                return;
            }
        }
        throw new RuntimeException("No active subscription found for this customer");
    }

    public BigDecimal calculateSubscriptionPrice(SubscriptionPlans plan) {
        return plan.getSubscriptionPlanPrice();
    }

    public BigDecimal calculateTotalAmount(BigDecimal price, int duration) {
        return price.multiply(new BigDecimal(duration));
    }
} 