package com.Select.Project.Notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.Select.Project.Users.Customers;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByCustomer(Customers customer);
    List<Notification> findByCustomerAndStatus(Customers customer, String status);
} 