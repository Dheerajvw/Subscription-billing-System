package com.Select.Project.BillingServices;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
public class InvoiceController {
  
    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private BillingService billingService;

    @PostMapping("/billing/invoices/generate")
    @PreAuthorize("hasRole('USER')")
    public InvoiceResponse generateInvoiceForUser(@RequestBody InvoiceRequest request) {
        return invoiceService.generateInvoice(request);
    }

    @GetMapping("/billing/invoices/user/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public List<InvoiceResponse> getInvoicesByUserId(@PathVariable Long userId) {
        return invoiceService.getInvoicesByUserId(userId);
    }

    @GetMapping("/billing/invoices/unpaid")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public List<InvoiceResponse> getUnpaidInvoices() {
        return invoiceService.getUnpaidInvoices();
    }

    @PutMapping("/billing/invoices/{invoiceId}/mark-paid")
    @PreAuthorize("hasRole('USER')")
    public InvoiceResponse markInvoiceAsPaid(@PathVariable int invoiceId) {
        return invoiceService.markInvoiceAsPaid(invoiceId);
    }

    @GetMapping("/billing/cycles/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public BillingCycleResponse getBillingCycle(@PathVariable Long userId) {
        return billingService.getBillingCycleInfo(userId);
    }

    @PostMapping("/billing/renewal/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> renewSubscription(@PathVariable Long userId) {
        return billingService.renewSubscription(userId);
    }
}