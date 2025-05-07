package com.Select.Project.Payment;

import java.util.List;

public class PaymentError {
    private int statusCode; 
    private String message;
    private List<Payment> payments;

    public PaymentError(int statusCode, String message, List<Payment> payments) {
        this.statusCode = statusCode;
        this.message = message;
        this.payments = payments;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getMessage() {
        return message;
    }

    public List<Payment> getPayments() {
        return payments;
    }   

    public void setStatusCode(int statusCode) {
        this.statusCode = statusCode;
    }

    public void setMessage(String message) {
        this.message = message; 
    }

    public void setPayments(List<Payment> payments) {
        this.payments = payments;
    }
    
}
