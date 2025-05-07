package com.Select.Project.Notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;
    
    //done 
     @PostMapping("/subscription/renewal")
    public ResponseEntity<?> sendSubscriptionRenewalNotification(@RequestParam Long customerId,@RequestParam String planName,@RequestParam double amount) {
        try {
            notificationService.sendSubscriptionRenewalNotification(customerId, planName, amount);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new NotificationError(400, e.getMessage()));
        }
    }
    //done 
    @PostMapping("/subscription/cancellation")
    public ResponseEntity<?> sendSubscriptionCancellationNotification(@RequestParam Long customerId,@RequestParam String planName) {
        try {
            notificationService.sendSubscriptionCancellationNotification(customerId, planName);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new NotificationError(400, e.getMessage()));
        }
    }
    //done 
    @PostMapping("/payment/failed")
    public ResponseEntity<?> sendPaymentFailureNotification(@RequestParam Long customerId,@RequestParam String planName,@RequestParam double amount,@RequestParam String reason) {
        try {
            notificationService.sendPaymentFailureNotification(customerId, planName, amount, reason);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new NotificationError(400, e.getMessage()));
        }
    }
    //done 
    @PostMapping("/payment/success")
    public ResponseEntity<?> sendPaymentSuccessNotification(@RequestParam Long customerId,@RequestParam String planName,@RequestParam double amount) {
        try {
            notificationService.sendPaymentSuccessNotification(customerId, planName, amount);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new NotificationError(400, e.getMessage()));
        }
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<?> getCustomerNotifications(@PathVariable Long customerId) {
        try {
            List<Notification> notifications = notificationService.getCustomerNotifications(customerId);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new NotificationError(400, e.getMessage()));
        }
    }

    @GetMapping("/customer/{customerId}/unread")
    public ResponseEntity<?> getUnreadNotifications(@PathVariable Long customerId) {
        try {
            List<Notification> notifications = notificationService.getUnreadNotifications(customerId);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new NotificationError(400, e.getMessage()));
        }
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markNotificationAsRead(@PathVariable Long notificationId) {
        try {
            Notification notification = notificationService.markAsRead(notificationId);
            return ResponseEntity.ok(notification);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new NotificationError(400, e.getMessage()));
        }
    }
} 