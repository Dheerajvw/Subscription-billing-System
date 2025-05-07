package com.Select.Project.BillingServices;

import java.sql.Timestamp;

public class InvoiceResponse {
    private int invoiceId;
    private String customerName;
    private String planName;
    private String invoiceAmount;
    private Timestamp invoiceDate;
    private Timestamp invoiceDueDate;
    private String invoiceStatus;
    private String paymentMethod;
    private String discountCode;
    private String discountName;
    private String discountAmount;
    private boolean discountApplied;

    public InvoiceResponse(int invoiceId, String customerName, String planName, String invoiceAmount, 
                         Timestamp invoiceDate, Timestamp invoiceDueDate, String invoiceStatus, String paymentMethod) {
        this.invoiceId = invoiceId;
        this.customerName = customerName;
        this.planName = planName;
        this.invoiceAmount = invoiceAmount;
        this.invoiceDate = invoiceDate;
        this.invoiceDueDate = invoiceDueDate;
        this.invoiceStatus = invoiceStatus;
        this.paymentMethod = paymentMethod;
        this.discountApplied = false;
    }
    
    public InvoiceResponse(int invoiceId, String customerName, String planName, String invoiceAmount, 
                         Timestamp invoiceDate, Timestamp invoiceDueDate, String invoiceStatus, String paymentMethod,
                         String discountCode, String discountName, String discountAmount) {
        this.invoiceId = invoiceId;
        this.customerName = customerName;
        this.planName = planName;
        this.invoiceAmount = invoiceAmount;
        this.invoiceDate = invoiceDate;
        this.invoiceDueDate = invoiceDueDate;
        this.invoiceStatus = invoiceStatus;
        this.paymentMethod = paymentMethod;
        this.discountCode = discountCode;
        this.discountName = discountName;
        this.discountAmount = discountAmount;
        this.discountApplied = true;
    }

    public int getInvoiceId() {
        return invoiceId;
    }

    public void setInvoiceId(int invoiceId) {
        this.invoiceId = invoiceId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getInvoiceAmount() {
        return invoiceAmount;
    }

    public void setInvoiceAmount(String invoiceAmount) {
        this.invoiceAmount = invoiceAmount;
    }

    public Timestamp getInvoiceDate() {
        return invoiceDate;
    }

    public void setInvoiceDate(Timestamp invoiceDate) {
        this.invoiceDate = invoiceDate;
    }

    public Timestamp getInvoiceDueDate() {
        return invoiceDueDate;
    }

    public void setInvoiceDueDate(Timestamp invoiceDueDate) {
        this.invoiceDueDate = invoiceDueDate;
    }

    public String getInvoiceStatus() {
        return invoiceStatus;
    }

    public void setInvoiceStatus(String invoiceStatus) {
        this.invoiceStatus = invoiceStatus;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
    
    public String getDiscountCode() {
        return discountCode;
    }

    public void setDiscountCode(String discountCode) {
        this.discountCode = discountCode;
    }

    public String getDiscountName() {
        return discountName;
    }

    public void setDiscountName(String discountName) {
        this.discountName = discountName;
    }

    public String getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(String discountAmount) {
        this.discountAmount = discountAmount;
    }
    
    public boolean isDiscountApplied() {
        return discountApplied;
    }

    public void setDiscountApplied(boolean discountApplied) {
        this.discountApplied = discountApplied;
    }
} 