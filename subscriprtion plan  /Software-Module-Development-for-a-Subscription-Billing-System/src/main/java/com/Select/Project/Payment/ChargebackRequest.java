package com.Select.Project.Payment;

public class ChargebackRequest {
    private String transactionId;
    private String reason;
    private double amount;

    public ChargebackRequest() {
    }

    public ChargebackRequest(String transactionId, String reason, double amount) {
        this.transactionId = transactionId;
        this.reason = reason;
        this.amount = amount;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }
} 