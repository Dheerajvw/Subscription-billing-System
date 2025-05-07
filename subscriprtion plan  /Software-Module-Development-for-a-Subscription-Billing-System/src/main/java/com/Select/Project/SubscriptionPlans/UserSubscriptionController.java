package com.Select.Project.SubscriptionPlans;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping(value = "/subscriptions", 
    produces = MediaType.APPLICATION_JSON_VALUE,
    consumes = MediaType.APPLICATION_JSON_VALUE)
public class UserSubscriptionController {
    @Autowired
    private UserSubscriptionService userSubscriptionService;

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> createSubscription(@RequestParam Long customerId,@RequestParam int planId,@RequestParam String paymentMethod) {
        try {
            UserSubscription subscription = userSubscriptionService.createSubscription(customerId, planId, paymentMethod);
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(subscription);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SubscriptionError(400, e.getMessage()));
        }
    }

    @GetMapping("/{subscriptionId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getSubscription(@PathVariable Long subscriptionId) {
        try {
            UserSubscription subscription = userSubscriptionService.getSubscription(subscriptionId);
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(subscription);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SubscriptionError(400, e.getMessage()));
        }
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> getCustomerSubscriptions(@PathVariable Long userId) {
        try {
            List<UserSubscription> subscriptions = userSubscriptionService.getCustomerSubscriptions(userId);
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(subscriptions);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SubscriptionError(400, e.getMessage()));
        }
    }

    @PostMapping("/{userId}/cancel")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> cancelSubscription(@PathVariable Long userId) {
        try {
            // Find subscription by userId instead of subscriptionId
            List<UserSubscription> subscriptions = userSubscriptionService.getCustomerSubscriptions(userId);
            if (subscriptions.isEmpty()) {
                return ResponseEntity.badRequest()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new SubscriptionError(400, "No active subscription found"));
            }
            
            UserSubscription subscription = userSubscriptionService.cancelSubscription(subscriptions.get(0).getSubscriptionId());
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(subscription);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SubscriptionError(400, e.getMessage()));
        }
    }
    
    @PutMapping("/{userId}/change-plan")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> changeSubscriptionPlan(
            @PathVariable Long userId,
            @RequestParam int newPlanId) {
        try {
            UserSubscription subscription = userSubscriptionService.changeSubscriptionPlan(userId, newPlanId);
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(subscription);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SubscriptionError(400, e.getMessage()));
        }
    }

    @GetMapping("/trial-status/{userId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> checkTrialStatus(@PathVariable Long userId) {
        try {
            boolean isAvailable = userSubscriptionService.isTrialAvailable(userId);
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(new TrialStatusResponse(isAvailable));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SubscriptionError(400, e.getMessage()));
        }
    }

    @PostMapping("/apply-promo")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> applyPromoCode(
            @RequestParam Long subscriptionId,
            @RequestParam String promoCode) {
        try {
            UserSubscription subscription = userSubscriptionService.applyPromoCode(
                subscriptionId, promoCode);
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(subscription);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SubscriptionError(400, e.getMessage()));
        }
    }

    /**
     * Get user's active plan status with detailed information
     * @param customerId the ID of the customer
     * @return detailed information about the user's active plan
     */
    @GetMapping("/customer/{customerId}/active")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> getActiveSubscriptionDetails(@PathVariable Long customerId) {
        try {
            // Get customer subscriptions
            List<UserSubscription> subscriptions = userSubscriptionService.getCustomerSubscriptions(customerId);
            
            // Find the active subscription if any
            UserSubscription activeSubscription = subscriptions.stream()
                .filter(sub -> "ACTIVE".equals(sub.getStatus()))
                .findFirst()
                .orElse(null);
            
            Map<String, Object> response = new HashMap<>();
            
            if (activeSubscription != null) {
                // Customer has an active subscription
                SubscriptionPlans plan = activeSubscription.getSubscriptionPlan();
                
                response.put("hasActivePlan", true);
                response.put("planId", plan.getSubscriptionPlanId());
                response.put("planName", plan.getSubscriptionPlanName());
                response.put("price", plan.getSubscriptionPlanPrice());
                response.put("status", activeSubscription.getStatus());
                response.put("startDate", activeSubscription.getStartDate());
                response.put("endDate", activeSubscription.getEndDate());
                response.put("subscriptionId", activeSubscription.getSubscriptionId());
                response.put("description", plan.getSubscriptionPlanDescription());
                response.put("duration", plan.getSubscriptionPlanDuration());
                
                // Add additional plan features if available
                Map<String, Object> features = new HashMap<>();
                features.put("usageLimit", plan.getUsageLimit());
                response.put("features", features);
            } else {
                // Customer has no active subscription
                response.put("hasActivePlan", false);
                response.put("message", "User has no active subscription plan");
            }
            
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SubscriptionError(400, e.getMessage()));
        }
    }
} 