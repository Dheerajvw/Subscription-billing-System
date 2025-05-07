package com.Select.Project.SubscriptionPlans;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import com.Select.Project.Users.Customers;
import java.util.List;

@Repository
public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {
    List<UserSubscription> findByCustomer(Customers customer);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM UserSubscription u WHERE u.customer = :customer")
    void deleteByCustomer(@Param("customer") Customers customer);
} 