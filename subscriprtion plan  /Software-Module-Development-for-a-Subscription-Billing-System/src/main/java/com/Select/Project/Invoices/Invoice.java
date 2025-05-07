package com.Select.Project.Invoices;

import com.Select.Project.Users.Customers;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.sql.Timestamp;
import com.Select.Project.SubscriptionPlans.SubscriptionPlans;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private int invoiceId;

    private Timestamp invoiceDate;
    private Timestamp invoiceDueDate;
    private String invoiceStatus;
    private String invoiceAmount;
    private String paymentMethod;

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = true)
    @JsonBackReference
    private Customers customers;

    @ManyToOne
    @JoinColumn(name = "subscription_plan_id")
    @JsonIgnore
    private SubscriptionPlans subscriptionPlan;
    
  
    public Invoice() {
    }

 
    public Invoice(int invoiceId, Timestamp invoiceDate, Timestamp invoiceDueDate, String invoiceStatus, String invoiceAmount, Customers customers, SubscriptionPlans subscriptionPlan, String paymentMethod) {
        this.invoiceId = invoiceId;
        this.invoiceDate = invoiceDate;
        this.invoiceDueDate = invoiceDueDate;
        this.invoiceStatus = invoiceStatus;
        this.invoiceAmount = invoiceAmount;
        this.customers = customers;
        this.subscriptionPlan = subscriptionPlan;
        this.paymentMethod = paymentMethod;
    }

   
    public int getInvoiceId() {
        return invoiceId;
    }

    public Timestamp getInvoiceDate() {
        return invoiceDate;
    }

    public Timestamp getInvoiceDueDate() {
        return invoiceDueDate;
    }

    public String getInvoiceStatus() {
        return invoiceStatus;
    }

    public String getInvoiceAmount() {
        return invoiceAmount;
    }

    public Customers getCustomers() {
        return customers;
    }

    public SubscriptionPlans getSubscriptionPlan() {
        return subscriptionPlan;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setInvoiceId(int invoiceId) {
        this.invoiceId = invoiceId;
    }

    public void setInvoiceDate(Timestamp invoiceDate) {
        this.invoiceDate = invoiceDate;
    }

    public void setInvoiceDueDate(Timestamp invoiceDueDate) {
        this.invoiceDueDate = invoiceDueDate;
    }

    public void setInvoiceStatus(String invoiceStatus) {
        this.invoiceStatus = invoiceStatus;
    }

    public void setInvoiceAmount(String invoiceAmount) {
        this.invoiceAmount = invoiceAmount;
    }

    public void setCustomers(Customers customers) {
        this.customers = customers;
    }

    public void setSubscriptionPlan(SubscriptionPlans subscriptionPlan) {
        this.subscriptionPlan = subscriptionPlan;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
}

