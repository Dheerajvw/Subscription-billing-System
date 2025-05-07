package com.Select.Project.Users;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import java.util.List;
import com.Select.Project.Discount.Discount;
import com.Select.Project.Invoices.Invoice;
import com.Select.Project.UsageData.UsageDataEntity;
import com.Select.Project.SubscriptionPlans.UserSubscription;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
public class Customers {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private int customerId;

    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String subscription_id;
    private String subscriptionStatus;
    private String subscriptionPaymentMethod;

    @OneToMany(mappedBy = "customers", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonBackReference
    private List<Invoice> invoices;

    @OneToMany(mappedBy = "customers", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<UsageDataEntity> usageData;

    @OneToMany(mappedBy = "customers", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Discount> discounts;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<UserSubscription> userSubscriptions;

    public Customers() {
    }

    public Customers(int customerId, String customerName, String customerEmail, String customerPhone, String subscription_id, String subscriptionStatus, String subscriptionPaymentMethod, List<Invoice> invoices, List<UsageDataEntity> usageData, List<Discount> discounts, List<UserSubscription> userSubscriptions) {
        this.customerId = customerId;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.customerPhone = customerPhone;
        this.subscription_id = subscription_id;
        this.subscriptionStatus = subscriptionStatus;
        this.subscriptionPaymentMethod = subscriptionPaymentMethod;
        this.invoices = invoices;
        this.usageData = usageData;
        this.discounts = discounts;
        this.userSubscriptions = userSubscriptions;
    }

    public int getCustomerId() {
        return customerId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public String getSubscription_id() {
        return subscription_id;
    }

    public String getSubscriptionStatus() {
        return subscriptionStatus;
    }

    public String getSubscriptionPaymentMethod() {
        return subscriptionPaymentMethod;
    }

    public void setCustomerId(int customerId) {
        this.customerId = customerId;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public void setSubscription_id(String subscription_id) {
        this.subscription_id = subscription_id;
    }

    public void setSubscriptionStatus(String subscriptionStatus) {
        this.subscriptionStatus = subscriptionStatus;
    }

    public void setSubscriptionPaymentMethod(String subscriptionPaymentMethod) {
        this.subscriptionPaymentMethod = subscriptionPaymentMethod;
    }

    public List<Invoice> getInvoices() {
        return invoices;
    }

    public void setInvoices(List<Invoice> invoices) {
        this.invoices = invoices;
    }

    public List<UsageDataEntity> getUsageData() {
        return usageData;
    }

    public void setUsageData(List<UsageDataEntity> usageData) {
        this.usageData = usageData;
    }

    public List<Discount> getDiscounts() {
        return discounts;
    }

    public void setDiscounts(List<Discount> discounts) {
        this.discounts = discounts;
    }

    public List<UserSubscription> getUserSubscriptions() {
        return userSubscriptions;
    }

    public void setUserSubscriptions(List<UserSubscription> userSubscriptions) {
        this.userSubscriptions = userSubscriptions;
    }
}
