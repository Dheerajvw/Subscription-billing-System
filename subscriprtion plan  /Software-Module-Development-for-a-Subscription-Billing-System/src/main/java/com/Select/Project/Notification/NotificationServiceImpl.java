package com.Select.Project.Notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.Select.Project.Users.CustomerRespositry;
import com.Select.Project.Users.Customers;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Service
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private CustomerRespositry customerRepository;

    @Autowired
    private EmailService emailService;

    @Override
    public Notification createNotification(Long customerId, String type, String message) {
        Customers customer = customerRepository.findByCustomerId(customerId);
        if (customer == null) {
            throw new RuntimeException("Customer not found");
        }
        
        // Check if a notification with the same customer, type, and message already exists
        List<Notification> existingNotifications = notificationRepository.findByCustomer(customer);
        Optional<Notification> existingNotification = existingNotifications.stream()
            .filter(n -> n.getType().equals(type) && n.getMessage().equals(message))
            .findFirst();
            
        if (existingNotification.isPresent()) {
            // Update the existing notification instead of creating a new one
            Notification notification = existingNotification.get();
            
            // If it was previously read, mark it as unread again
            if ("READ".equals(notification.getStatus())) {
                notification.setStatus("UNREAD");
                notification.setReadAt(null);
            }
            
            // Update timestamp
            notification.setCreatedAt(new Timestamp(System.currentTimeMillis()));
            
            // Try to send email again if it failed previously
            if (!notification.isEmailSent()) {
                boolean emailSent = emailService.sendEmail(
                    customer.getCustomerEmail(),
                    "Subscription Notification",
                    message
                );
                notification.setEmailSent(emailSent);
                if (!emailSent) {
                    notification.setEmailError("Failed to send email");
                } else {
                    notification.setEmailError(null);
                }
            }
            
            return notificationRepository.save(notification);
        }

        // Create a new notification if no existing one was found
        Notification notification = new Notification();
        notification.setType(type);
        notification.setMessage(message);
        notification.setCustomer(customer);
        notification.setStatus("UNREAD");
        notification.setCreatedAt(new Timestamp(System.currentTimeMillis()));
        notification.setChannel(NotificationChannel.EMAIL);

       
        boolean emailSent = emailService.sendEmail(
            customer.getCustomerEmail(),
            "Subscription Notification",
            message
        );
        notification.setEmailSent(emailSent);
        if (!emailSent) {
            notification.setEmailError("Failed to send email");
        }

        return notificationRepository.save(notification);
    }

    @Override
    public List<Notification> getCustomerNotifications(Long customerId) {
        Customers customer = customerRepository.findByCustomerId(customerId);
        if (customer == null) {
            throw new RuntimeException("Customer not found");
        }
        return notificationRepository.findByCustomer(customer);
    }

    @Override
    public List<Notification> getUnreadNotifications(Long customerId) {
        Customers customer = customerRepository.findByCustomerId(customerId);
        if (customer == null) {
            throw new RuntimeException("Customer not found");
        }
        return notificationRepository.findByCustomerAndStatus(customer, "UNREAD");
    }

    @Override
    public Notification markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        notification.setStatus("READ");
        notification.setReadAt(new Timestamp(System.currentTimeMillis()));
        return notificationRepository.save(notification);
    }

    @Override
    public void sendSubscriptionRenewalNotification(Long customerId, String planName, double amount) {
        String message = String.format("Your subscription for %s will be renewed soon. Amount: Rs%.2f", 
            planName, amount);
        createNotification(customerId, "SUBSCRIPTION_RENEWAL", message);
    }

    @Override
    public void sendSubscriptionCancellationNotification(Long customerId, String planName) {
        String message = String.format("Your subscription for %s has been cancelled. Thank you for being with us!", 
            planName);
        createNotification(customerId, "SUBSCRIPTION_CANCELLATION", message);
    }

    @Override
    public void sendPaymentFailureNotification(Long customerId, String planName, double amount, String reason) {
        String message = String.format("Payment failed for your %s subscription. Amount: Rs%.2f. Reason: %s", 
            planName, amount, reason);
        createNotification(customerId, "PAYMENT_FAILURE", message);
    }

    @Override
    public void sendPaymentSuccessNotification(Long customerId, String planName, double amount) {
        String message = String.format("Payment successful for your %s subscription. Amount: Rs%.2f. Thank you for your payment!", 
            planName, amount);
        createNotification(customerId, "PAYMENT_SUCCESS", message);
    }
} 