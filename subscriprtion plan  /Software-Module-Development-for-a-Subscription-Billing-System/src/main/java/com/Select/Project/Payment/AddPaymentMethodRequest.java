package com.Select.Project.Payment;

public class AddPaymentMethodRequest {
    private String methodName;
    private String displayName;

    public AddPaymentMethodRequest() {
    }

    public AddPaymentMethodRequest(String methodName, String displayName) {
        this.methodName = methodName;
        this.displayName = displayName;
    }

    public String getMethodName() {
        return methodName;
    }

    public void setMethodName(String methodName) {
        this.methodName = methodName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
} 