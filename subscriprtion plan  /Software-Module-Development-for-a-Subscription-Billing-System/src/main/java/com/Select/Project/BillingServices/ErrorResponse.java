package com.Select.Project.BillingServices;

import java.util.Date;

public class ErrorResponse {
    private int status;
    private String message;
    private Date timestamp;
    private String details;

    public ErrorResponse(int status, String message, Date timestamp, String details) {
        this.status = status;
        this.message = message;
        this.timestamp = timestamp;
        this.details = details;
    }

    public int getStatus() { 
        return status; 
    }
    public void setStatus(int status) {
        this.status = status; 
    }
    public String getMessage() { 
        return message; 
    }
    public void setMessage(String message) { 
        this.message = message; 
    }
    public Date getTimestamp() { 
        return timestamp; 
    }
    public void setTimestamp(Date timestamp) { 
        this.timestamp = timestamp; 
    }
    public void setDetails(String details) {
        this.details = details; 
    }
    public String getDetails() {
        return details; 
    }
} 