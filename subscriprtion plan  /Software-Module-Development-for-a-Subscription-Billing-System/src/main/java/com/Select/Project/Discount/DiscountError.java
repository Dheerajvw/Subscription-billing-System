package com.Select.Project.Discount;

import java.util.List;

public class DiscountError {
    private int statusCode;
    private String message;
    private List<Discount> discounts;

    public DiscountError(int statusCode, String message, List<Discount> discounts) {
        this.statusCode = statusCode;
        this.message = message;
        this.discounts = discounts;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getMessage() {
        return message;
    }

    public List<Discount> getDiscounts() {
        return discounts;
    }
}
