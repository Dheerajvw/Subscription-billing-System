package com.Select.Project.Notification;

import java.util.List;

public interface NotificationService {
    Notification createNotification(Long customerId, String type, String message);
    List<Notification> getCustomerNotifications(Long customerId);
    List<Notification> getUnreadNotifications(Long customerId);
    Notification markAsRead(Long notificationId);
    void sendSubscriptionRenewalNotification(Long customerId, String planName, double amount);
    void sendSubscriptionCancellationNotification(Long customerId, String planName);
    void sendPaymentFailureNotification(Long customerId, String planName, double amount, String reason);
    void sendPaymentSuccessNotification(Long customerId, String planName, double amount);
} 