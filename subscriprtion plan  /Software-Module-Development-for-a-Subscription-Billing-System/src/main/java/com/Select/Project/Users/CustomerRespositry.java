package com.Select.Project.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface CustomerRespositry extends JpaRepository<Customers, Integer> {
    public Customers findById(int id);
    Customers findByCustomerId(Long customerId);
    
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM payment WHERE invoice_id IN (SELECT invoice_id FROM invoice WHERE customer_id = :customerId)", nativeQuery = true)
    void deleteCustomerPayments(@Param("customerId") Long customerId);
    
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM notification WHERE customer_id = :customerId", nativeQuery = true)
    void deleteCustomerNotifications(@Param("customerId") Long customerId);
    
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM discount WHERE customer_id = :customerId", nativeQuery = true)
    void deleteCustomerDiscounts(@Param("customerId") Long customerId);
    
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM user_subscription WHERE customer_id = :customerId", nativeQuery = true)
    void deleteUserSubscriptions(@Param("customerId") Long customerId);
    
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM invoice WHERE customer_id = :customerId", nativeQuery = true)
    void deleteCustomerInvoices(@Param("customerId") Long customerId);
    
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM customers WHERE customer_id = :customerId", nativeQuery = true)
    void deleteCustomer(@Param("customerId") Long customerId);
    
    @Modifying
    @Transactional
    @Query("UPDATE Customers c SET c.subscription_id = :subscriptionId WHERE c.customerId = :customerId")
    void updateSubscriptionId(@Param("customerId") int customerId, @Param("subscriptionId") int subscriptionId);

    @Query(value = "select * from customers where customer_id = ?1", nativeQuery = true)
    public Customers getCustomerById(Integer customerId);

    @Query(value = "select * from customers", nativeQuery = true)
    public List<Customers> getAllCustomers();

    @Query(value = "select * from customers where subscription_id = ?1", nativeQuery = true)
    public List<Customers> getCustomerBySubscription(String subscription_id);

    @Query(value = "select * from customers where customer_email = ?1", nativeQuery = true)
    public List<Customers> findByCustomerEmail(String email);
}
