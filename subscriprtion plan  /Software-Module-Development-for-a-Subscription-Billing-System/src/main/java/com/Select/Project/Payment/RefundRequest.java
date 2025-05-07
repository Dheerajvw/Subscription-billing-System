package com.Select.Project.Payment;

public class RefundRequest {
    private String transactionId;
    private String reason;

    public RefundRequest() {
    }

    public RefundRequest(String transactionId, String reason) {
        this.transactionId = transactionId;
        this.reason = reason;
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
} 