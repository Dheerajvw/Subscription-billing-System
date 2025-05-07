package com.Select.Project.Invoices;
import java.util.List;
public class InvoiceError {
    private int statusCode;
    private String message;
    private List<Invoice> invoices;

    public InvoiceError(int statusCode, String message, List<Invoice> invoices) {
        this.statusCode = statusCode;
        this.message = message;
        this.invoices = invoices;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getMessage() {
        return message;
    }

    public List<Invoice> getInvoices() {
        return invoices;
    }

    public void setStatusCode(int statusCode) {         
        this.statusCode = statusCode;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setInvoices(List<Invoice> invoices) {
        this.invoices = invoices;
    }
    
}