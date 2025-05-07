package com.Select.Project.BillingServices;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.Period;
import java.util.Date;
import java.sql.Timestamp;
import com.Select.Project.Users.CustomerRespositry;
import com.Select.Project.Users.Customers;
import com.Select.Project.Invoices.InvoiceResp;
import com.Select.Project.Invoices.Invoice;
import java.util.List;
import com.Select.Project.SubscriptionPlans.SubscriptionPlans;
import java.math.BigDecimal;

@Service
public class BillingService {
    @Autowired
    private CustomerRespositry customerRepository;

    @Autowired
    private InvoiceResp invoiceRepository;


    public ResponseEntity<?> renewSubscription(Long userId) {
        Customers customer = customerRepository.findByCustomerId(userId);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(HttpStatus.NOT_FOUND.value(), "Customer not found", new Date(), ""));
        }
        List<Invoice> customerInvoices = invoiceRepository.findByCustomers(customer);
        Invoice latestValidInvoice = null;
        for (int i = customerInvoices.size() - 1; i >= 0; i--) {
            Invoice invoice = customerInvoices.get(i);
            if (invoice.getSubscriptionPlan() != null && !invoice.getInvoiceAmount().equals("Credit Card")) {
                latestValidInvoice = invoice;
                break;
            }
        }

        if (latestValidInvoice == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(), "No valid subscription plan found", new Date(), ""));
        }
        customer.setSubscriptionStatus("ACTIVE");
        customer.setSubscription_id(String.valueOf(latestValidInvoice.getSubscriptionPlan().getSubscriptionPlanId()));
        customer.setSubscriptionPaymentMethod(customer.getSubscriptionPaymentMethod());
        
        Customers updatedCustomer = customerRepository.save(customer);
        
        Invoice invoice = new Invoice();
        invoice.setCustomers(updatedCustomer);
        invoice.setSubscriptionPlan(latestValidInvoice.getSubscriptionPlan());
        invoice.setInvoiceDate(new Timestamp(System.currentTimeMillis()));
        invoice.setInvoiceStatus("PENDING");
        invoice.setInvoiceAmount(String.valueOf(latestValidInvoice.getSubscriptionPlan().getSubscriptionPlanPrice()));

        Invoice savedInvoice = invoiceRepository.save(invoice);

        return ResponseEntity.ok(new InvoiceResponse(
            savedInvoice.getInvoiceId(),
            updatedCustomer.getCustomerName(),
            latestValidInvoice.getSubscriptionPlan().getSubscriptionPlanName(),
            savedInvoice.getInvoiceAmount(),
            savedInvoice.getInvoiceDate(),
            savedInvoice.getInvoiceDueDate(),
            savedInvoice.getInvoiceStatus(),
            savedInvoice.getPaymentMethod()
        ));
    }

    public BillingCycleResponse getBillingCycleInfo(Long userId) {
        Customers customer = customerRepository.findByCustomerId(userId);
        if (customer == null) {
            throw new RuntimeException("Customer not found");
        }

       
        String subscriptionId = customer.getSubscription_id();
        if (subscriptionId == null || customer.getSubscriptionStatus().equals("INACTIVE")) {
            throw new RuntimeException("No active subscription found");
        }

    
        LocalDate today = LocalDate.now();
        LocalDate cycleStart = today.withDayOfMonth(1);
        LocalDate cycleEnd = today.withDayOfMonth(today.lengthOfMonth());
        LocalDate nextBilling = cycleEnd.plusDays(1);
        
        
        int daysRemaining = Period.between(today, cycleEnd.plusDays(1)).getDays();

       
        BigDecimal planPrice = BigDecimal.ZERO;
        String currentPlan = "N/A";
        List<Invoice> customerInvoices = invoiceRepository.findByCustomers(customer);
        System.out.println("Number of invoices for customer: " + customerInvoices.size());
        
        if (!customerInvoices.isEmpty()) {
            Invoice latestInvoice = customerInvoices.get(customerInvoices.size() - 1);
            SubscriptionPlans plan = latestInvoice.getSubscriptionPlan();
            System.out.println("Latest invoice subscription plan: " + (plan != null ? plan.getSubscriptionPlanName() : "null"));
            if (plan != null) {
                planPrice = plan.getSubscriptionPlanPrice();
                currentPlan = plan.getSubscriptionPlanName();
                System.out.println("Plan price: " + planPrice);
            }
        } else {
            System.out.println("No invoices found for customer");
        }

        return new BillingCycleResponse(
            userId,
            customer.getCustomerName(),
            currentPlan,
            planPrice.doubleValue(),
            cycleStart.toString(),
            cycleEnd.toString(),
            nextBilling.toString(),
            customer.getSubscriptionStatus(),
            daysRemaining
        );
    }

    public BigDecimal calculateTotalAmount(SubscriptionPlans plan) {
        return plan.getSubscriptionPlanPrice();
    }
} 