package com.Select.Project.BillingServices;

import com.Select.Project.Discount.Discount;
import com.Select.Project.Discount.DiscountRepository;
import com.Select.Project.Users.Customers;
import com.Select.Project.Users.CustomerRespositry;
import com.Select.Project.Invoices.Invoice;
import com.Select.Project.Invoices.InvoiceResp;
import com.Select.Project.SubscriptionPlans.SubscriptionPlans;
import com.Select.Project.SubscriptionPlans.SubscriptionPlansResp;
import com.Select.Project.SubscriptionPlans.UserSubscription;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.Select.Project.SubscriptionPlans.UserSubscriptionRepository;
import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;
import java.math.BigDecimal;

@Service
public class InvoiceService {

    @Autowired
    private SubscriptionPlansResp subscriptionPlansRepository;

    @Autowired
    private CustomerRespositry customerRepository;

    @Autowired
    private DiscountRepository discountRepository;

    @Autowired
    private InvoiceResp invoiceRepository;

    @Autowired
    private UserSubscriptionRepository userSubscriptionService;


    public InvoiceResponse generateInvoice(InvoiceRequest request) {
        Customers customer = customerRepository.findByCustomerId(Long.valueOf(request.getCustomerId()));
        if (customer == null) {
            throw new RuntimeException("Customer not found.");
        }
        SubscriptionPlans plan = subscriptionPlansRepository.findById(request.getSubscriptionPlanId());
        if (plan == null) {
            throw new RuntimeException("Subscription Plan not found.");
        }
        System.out.println("Found subscription plan: " + plan.getSubscriptionPlanName() + " with price: " + plan.getSubscriptionPlanPrice());

        Discount discount = null;
        if (request.getDiscountCode() != null && !request.getDiscountCode().isEmpty()) {
            discount = discountRepository.findByDiscountCode(request.getDiscountCode());
            
            if (discount == null) {
                discount = discountRepository.findByDiscountName(request.getDiscountCode());
            }
            
            System.out.println("Looking for discount with code: " + request.getDiscountCode());
            if (discount != null) {
                System.out.println("Found discount: " + discount.getDiscountName() + 
                    " (" + discount.getDiscountCode() + ") for " + discount.getDiscountAmount() + "%");
            } else {
                System.out.println("No discount found for code/name: " + request.getDiscountCode());
            }
        }
        
        BigDecimal discountAmount = BigDecimal.ZERO;
        boolean discountWasApplied = false;
        String discountCode = null;
        String discountName = null;
        String discountAmountStr = null;
        
        if (discount != null && isValidDiscount(discount)) {
            discountWasApplied = true;
            discountCode = discount.getDiscountCode();
            discountName = discount.getDiscountName();
            
            if ("PERCENTAGE".equals(discount.getDiscountType())) {
                discountAmount = plan.getSubscriptionPlanPrice()
                    .multiply(new BigDecimal(discount.getDiscountAmount())
                    .divide(new BigDecimal("100")));
                discountAmountStr = discount.getDiscountAmount() + "%";
            } else {
                discountAmount = new BigDecimal(discount.getDiscountAmount());
                discountAmountStr = "$" + discount.getDiscountAmount();
            }
        }

        BigDecimal finalAmount = plan.getSubscriptionPlanPrice().subtract(discountAmount);
        System.out.println("Final amount calculation: " + plan.getSubscriptionPlanPrice() + " - " + discountAmount + " = " + finalAmount);

        Invoice invoice = new Invoice();
        invoice.setCustomers(customer);
        invoice.setSubscriptionPlan(plan);
        invoice.setInvoiceDate(request.getInvoiceDate());
        invoice.setInvoiceDueDate(calculateDueDate(request.getInvoiceDate(), plan.getSubscriptionPlanDuration()));
        invoice.setInvoiceStatus("PENDING");
        invoice.setInvoiceAmount(String.valueOf(finalAmount));
        invoice.setPaymentMethod(userSubscriptionService.findByCustomer(customer).stream()
            .filter(sub -> "ACTIVE".equals(sub.getStatus()))
            .findFirst()
            .map(UserSubscription::getPaymentMethod)
            .orElse("DEFAULT"));

        Invoice savedInvoice = invoiceRepository.save(invoice);
        System.out.println("Saved invoice with subscription plan: " + (savedInvoice.getSubscriptionPlan() != null ? savedInvoice.getSubscriptionPlan().getSubscriptionPlanName() : "null"));

        if (discountWasApplied) {
            return new InvoiceResponse(
                savedInvoice.getInvoiceId(),
                customer.getCustomerName(),
                plan.getSubscriptionPlanName(),
                savedInvoice.getInvoiceAmount(),
                savedInvoice.getInvoiceDate(),
                savedInvoice.getInvoiceDueDate(),
                savedInvoice.getInvoiceStatus(),
                savedInvoice.getPaymentMethod(),
                discountCode,
                discountName,
                discountAmountStr
            );
        } else {
            return new InvoiceResponse(
                savedInvoice.getInvoiceId(),
                customer.getCustomerName(),
                plan.getSubscriptionPlanName(),
                savedInvoice.getInvoiceAmount(),
                savedInvoice.getInvoiceDate(),
                savedInvoice.getInvoiceDueDate(),
                savedInvoice.getInvoiceStatus(),
                savedInvoice.getPaymentMethod()
            );
        }
    }

    private boolean isValidDiscount(Discount discount) {
        Timestamp currentTimestamp = new Timestamp(System.currentTimeMillis());
        
        // Add additional validation logic and debug logging
        boolean isActive = "ACTIVE".equalsIgnoreCase(discount.getStatus());
        boolean isInDateRange = discount.getStartDate().before(currentTimestamp) && discount.getEndDate().after(currentTimestamp);
        boolean isValidAmount = discount.getDiscountAmount() > 0;
        
        System.out.println("Discount validation:");
        System.out.println("- Name: " + discount.getDiscountName());
        System.out.println("- Code: " + discount.getDiscountCode());
        System.out.println("- Type: " + discount.getDiscountType());
        System.out.println("- Amount: " + discount.getDiscountAmount());
        System.out.println("- Status: " + discount.getStatus() + " (active: " + isActive + ")");
        System.out.println("- Date Range: " + discount.getStartDate() + " to " + discount.getEndDate() + " (in range: " + isInDateRange + ")");
        System.out.println("- Current Time: " + currentTimestamp);
        System.out.println("- Valid Amount: " + isValidAmount);
        
        boolean isValid = isActive && isInDateRange && isValidAmount;
        System.out.println("- Overall Validity: " + isValid);
        
        return isValid;
    }

    private Timestamp calculateDueDate(Timestamp invoiceDate, int duration) {
        long timeInMillis = invoiceDate.getTime() + (long) duration * 24 * 60 * 60 * 1000;
        return new Timestamp(timeInMillis);
    }

    public List<InvoiceResponse> getInvoicesByUserId(Long userId) {
        Customers customer = customerRepository.findByCustomerId(userId);
        if (customer == null) {
            throw new RuntimeException("Customer not found.");
        }

        List<Invoice> invoices = invoiceRepository.findByCustomers(customer);
        
        return invoices.stream()
            .map(invoice -> new InvoiceResponse(
                invoice.getInvoiceId(),
                customer.getCustomerName(),
                invoice.getSubscriptionPlan() != null 
                    ? invoice.getSubscriptionPlan().getSubscriptionPlanName() 
                    : "N/A",
                invoice.getInvoiceAmount(),
                invoice.getInvoiceDate(),
                invoice.getInvoiceDueDate(),
                invoice.getInvoiceStatus(),
                invoice.getPaymentMethod()
            ))
            .collect(Collectors.toList());
    }

    public List<InvoiceResponse> getUnpaidInvoices() {
        List<Invoice> unpaidInvoices = invoiceRepository.findByInvoiceStatus("PENDING");
        return unpaidInvoices.stream()
            .map(invoice -> new InvoiceResponse(
                invoice.getInvoiceId(),
                invoice.getCustomers().getCustomerName(),
                invoice.getSubscriptionPlan() != null 
                    ? invoice.getSubscriptionPlan().getSubscriptionPlanName() 
                    : "N/A",
                invoice.getInvoiceAmount(),
                invoice.getInvoiceDate(),
                invoice.getInvoiceDueDate(),
                invoice.getInvoiceStatus(),
                invoice.getPaymentMethod()
            ))
            .collect(Collectors.toList());
    }

    public InvoiceResponse markInvoiceAsPaid(int invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId);
        if (invoice == null) {
            throw new RuntimeException("Invoice not found");
        }
        if ("PAID".equals(invoice.getInvoiceStatus())) {
            throw new RuntimeException("Invoice is already paid");
        }
        invoice.setInvoiceStatus("PAID");
        Invoice savedInvoice = invoiceRepository.save(invoice);
        
        return new InvoiceResponse(
            savedInvoice.getInvoiceId(),
            savedInvoice.getCustomers().getCustomerName(),
            savedInvoice.getSubscriptionPlan() != null 
                ? savedInvoice.getSubscriptionPlan().getSubscriptionPlanName() 
                : "N/A",
            savedInvoice.getInvoiceAmount(),
            savedInvoice.getInvoiceDate(),
            savedInvoice.getInvoiceDueDate(),
            savedInvoice.getInvoiceStatus(),
            savedInvoice.getPaymentMethod()
        );
    }

    public BigDecimal calculateDiscountAmount(BigDecimal amount, BigDecimal discountPercentage) {
        return amount.multiply(discountPercentage.divide(new BigDecimal("100")));
    }
}