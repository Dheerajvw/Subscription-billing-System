package com.Select.Project.Payment;

import com.Select.Project.Payment.Payment;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.JoinColumn;
import com.Select.Project.Invoices.Invoice;
import com.fasterxml.jackson.annotation.JsonBackReference;
//import jakarta.persistence.Transient;
import jakarta.persistence.Column;

@Entity
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private int paymentId;
    
    @Column(name = "subscription_plan_id", nullable = true)
    private Integer subscription_plan_id;
    
    private String paymentDate;
    private String paymentStatus;
    private String paymentMethod;
    private double paymentAmount;
    
    @Column(unique = true)
    private String transactionId;

    @OneToOne
    @JoinColumn(name = "invoice_id")
    @JsonBackReference
    private Invoice invoice;

    public Payment() {
    }

    // Getters and Setters
    public int getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(int paymentId) {
        this.paymentId = paymentId;
    }

    public String getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(String paymentDate) {
        this.paymentDate = paymentDate;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Invoice getInvoice() {
        return invoice;
    }

    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
    }

    public double getPaymentAmount() {
        return paymentAmount;
    }

    public void setPaymentAmount(double paymentAmount) {
        this.paymentAmount = paymentAmount;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public Integer getSubscription_plan_id() {
        return subscription_plan_id;
    }

    public void setSubscription_plan_id(Integer subscription_plan_id) {
        this.subscription_plan_id = subscription_plan_id;
    }

}
