package com.Select.Project.Payment;

public class PaymentRequest {
    private int invoiceId;
    private String paymentMethod;
    private String transactionId;

    public PaymentRequest() {
    }

    public PaymentRequest(int invoiceId, String paymentMethod, String transactionId) {
        this.invoiceId = invoiceId;
        this.paymentMethod = paymentMethod;
        this.transactionId = transactionId;
    }

    public int getInvoiceId() {
        return invoiceId;
    }

    public void setInvoiceId(int invoiceId) {
        this.invoiceId = invoiceId;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }
} 