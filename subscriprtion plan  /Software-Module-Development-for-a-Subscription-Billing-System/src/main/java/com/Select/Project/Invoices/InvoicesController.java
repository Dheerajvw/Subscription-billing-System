package com.Select.Project.Invoices;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
@RestController
public class InvoicesController {
    @Autowired
    private InvoicesServices invoicesServices;

    // done
    @GetMapping("/invoices")
    public InvoiceError getAllInvoices() {
        return invoicesServices.getAllInvoices();
    }

    // done
    @GetMapping("/invoices/{invoiceId}")
    public InvoiceError getInvoiceById(@PathVariable int invoiceId) {
        return invoicesServices.getInvoiceById(invoiceId);
    }

    // done
    @DeleteMapping("/invoices/{invoiceId}")
    public InvoiceError deleteInvoiceById(@PathVariable int invoiceId) {
        return invoicesServices.deleteInvoiceById(invoiceId);
    }

    @PostMapping("/invoices")
    public InvoiceError addInvoice(@RequestBody Invoice invoice) {
        return invoicesServices.addInvoice(invoice);
    }
}
