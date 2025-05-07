package com.Select.Project.Users;

import java.util.List;

public class CustomerError {
   
    private int statusCode;
    private String message;
    private List<Customers> customers;

    public CustomerError(int statusCode, String message, List<Customers> customers) {
        this.statusCode = statusCode;
        this.message = message;
        this.customers = customers;
    }   

    public int getStatusCode() {
        return statusCode;
    }

    public String getMessage() {
        return message;
    }

    public void setStatusCode(int statusCode) {
        this.statusCode = statusCode;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<Customers> getCustomers() {
        return customers;
    }

    public void setCustomers(List<Customers> customers) {
        this.customers = customers;
    }
    

}
