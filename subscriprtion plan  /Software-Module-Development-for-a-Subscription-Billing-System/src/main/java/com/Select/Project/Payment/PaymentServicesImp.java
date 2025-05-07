package com.Select.Project.Payment;

import com.Select.Project.Invoices.Invoice;
import com.Select.Project.Invoices.InvoiceResp;
import com.Select.Project.Users.Customers;
import com.Select.Project.Users.CustomerRespositry;
import com.Select.Project.SubscriptionPlans.SubscriptionPlans;
import com.Select.Project.SubscriptionPlans.SubscriptionPlansRepository;
import com.Select.Project.Notification.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import java.sql.Timestamp;
import java.util.List;

@Service
public class PaymentServicesImp implements PaymentServices {

    private static final String INVOICE_API_URL = "http://localhost:8083/billing/invoices/{invoiceId}/mark-paid";

    @Autowired
    private PaymentResp paymentRepository;
    
    @Autowired
    private InvoiceResp invoiceRepository;

    @Autowired
    private CustomerRespositry customerRepository;

    @Autowired
    private SubscriptionPlansRepository subscriptionPlanRepository;

    @Autowired
    private NotificationService notificationService;
 
    @Override
    public Payment addPayment(Payment payment) {
        return paymentRepository.save(payment);
    }

    @Override
    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }
    

    @Override
    public Payment getPaymentById(int paymentId) {
        return paymentRepository.findById(paymentId).orElse(null);
    }

    @Override
    public PaymentError deletePayment(int paymentId) {
        try {
            paymentRepository.deleteById(paymentId);
            return new PaymentError(200, "Payment deleted successfully", null);
        } catch (Exception e) {
            return new PaymentError(500, "Error deleting payment: " + e.getMessage(), null);
        }
    }

    @Override
    public PaymentResponse initiatePayment(PaymentRequest paymentRequest) {
        RestTemplate restTemplate = new RestTemplate();
        String url = INVOICE_API_URL.replace("{invoiceId}", String.valueOf(paymentRequest.getInvoiceId()));
        Payment savedPayment = null;
       
        try {
            // Get the JWT token from the security context
            Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            String token = jwt.getTokenValue();

            // Create headers with the JWT token
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + token);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            // Mark invoice as paid with authentication
            restTemplate.put(url, entity);
            
            // Get invoice details
            Invoice invoice = invoiceRepository.findById(paymentRequest.getInvoiceId());
            if (invoice == null) {
                throw new RuntimeException("Invoice not found");
            }

            Customers customer = invoice.getCustomers();
            if (customer == null) {
                throw new RuntimeException("Customer not found");
            }
            
            String subscriptionId = customer.getSubscription_id();
            if (subscriptionId == null || subscriptionId.trim().isEmpty()) {
                throw new RuntimeException("Customer has no active subscription");
            }
            
            SubscriptionPlans subscriptionPlan = subscriptionPlanRepository.findById(Integer.parseInt(subscriptionId)).orElse(null);
            if(subscriptionPlan == null) {
                throw new RuntimeException("Subscription plan not found");
            }
    
            Payment payment = new Payment();
            payment.setInvoice(invoice);
            payment.setPaymentAmount(Double.parseDouble(invoice.getInvoiceAmount()));
            payment.setPaymentMethod(paymentRequest.getPaymentMethod());
            payment.setPaymentStatus("PAID");
            payment.setTransactionId(paymentRequest.getTransactionId());
            payment.setPaymentDate(new Timestamp(System.currentTimeMillis()).toString());
            payment.setSubscription_plan_id(subscriptionPlan.getSubscriptionPlanId());

            savedPayment = paymentRepository.save(payment);

            customer.setSubscriptionStatus("ACTIVE");
            customer.setSubscription_id(String.valueOf(subscriptionPlan.getSubscriptionPlanId()));
            customer.setSubscriptionPaymentMethod(paymentRequest.getPaymentMethod());
            customerRepository.save(customer);

            try {
                notificationService.sendPaymentSuccessNotification(
                    (long) customer.getCustomerId(),
                    subscriptionPlan.getSubscriptionPlanName(),
                    Double.parseDouble(invoice.getInvoiceAmount())
                );
            } catch (Exception notificationError) {
                // Log the notification error, but don't fail the payment
                System.err.println("Notification error: " + notificationError.getMessage());
                // Continue with payment process
            }

            return new PaymentResponse(
                savedPayment.getPaymentId(),
                savedPayment.getInvoice().getInvoiceId(),
                customer.getCustomerName(),
                savedPayment.getPaymentAmount(),
                savedPayment.getPaymentMethod(),
                savedPayment.getPaymentStatus(),
                savedPayment.getTransactionId(),
                Timestamp.valueOf(savedPayment.getPaymentDate())
            );
        } catch (Exception e) {
            // If payment was saved but notification failed, still return a success response
            if (savedPayment != null) {
                return new PaymentResponse(
                    savedPayment.getPaymentId(),
                    savedPayment.getInvoice().getInvoiceId(),
                    savedPayment.getInvoice().getCustomers().getCustomerName(),
                    savedPayment.getPaymentAmount(),
                    savedPayment.getPaymentMethod(),
                    savedPayment.getPaymentStatus(),
                    savedPayment.getTransactionId(),
                    Timestamp.valueOf(savedPayment.getPaymentDate())
                );
            }
            throw new RuntimeException("Error processing payment: " + e.getMessage());
        }
    }

    @Override
    public Payment getPaymentByTransactionId(String transactionId) {
        return paymentRepository.findByTransactionId(transactionId);
    }

    @Override
    public PaymentResponse refundPayment(RefundRequest refundRequest) {
        Payment payment = paymentRepository.findByTransactionId(refundRequest.getTransactionId());
        if (payment == null) {
            throw new RuntimeException("Payment not found");
        }

        if (!"PAID".equals(payment.getPaymentStatus())) {
            throw new RuntimeException("Payment is not eligible for refund");
        }

        // Create refund payment record
        Payment refund = new Payment();
        refund.setInvoice(payment.getInvoice());
        refund.setPaymentAmount(-payment.getPaymentAmount()); // Negative amount for refund
        refund.setPaymentMethod(payment.getPaymentMethod());
        refund.setPaymentStatus("REFUNDED");
        refund.setTransactionId("REF_" + payment.getTransactionId());
        refund.setPaymentDate(new Timestamp(System.currentTimeMillis()).toString());

        Payment savedRefund = paymentRepository.save(refund);

        // Update original payment status
        payment.setPaymentStatus("REFUNDED");
        paymentRepository.save(payment);

        return new PaymentResponse(
            savedRefund.getPaymentId(),
            savedRefund.getInvoice().getInvoiceId(),
            savedRefund.getInvoice().getCustomers().getCustomerName(),
            savedRefund.getPaymentAmount(),
            savedRefund.getPaymentMethod(),
            savedRefund.getPaymentStatus(),
            savedRefund.getTransactionId(),
            Timestamp.valueOf(savedRefund.getPaymentDate())
        );
    }

    @Override
    public PaymentResponse processChargeback(ChargebackRequest chargebackRequest) {
        Payment payment = paymentRepository.findByTransactionId(chargebackRequest.getTransactionId());
        if (payment == null) {
            throw new RuntimeException("Payment not found");
        }

        if (!"PAID".equals(payment.getPaymentStatus())) {
            throw new RuntimeException("Payment is not eligible for chargeback");
        }

        if (chargebackRequest.getAmount() > payment.getPaymentAmount()) {
            throw new RuntimeException("Chargeback amount cannot exceed original payment amount");
        }

        // Create chargeback payment record
        Payment chargeback = new Payment();
        chargeback.setInvoice(payment.getInvoice());
        chargeback.setPaymentAmount(-chargebackRequest.getAmount()); // Negative amount for chargeback
        chargeback.setPaymentMethod(payment.getPaymentMethod());
        chargeback.setPaymentStatus("CHARGEBACK");
        chargeback.setTransactionId("CB_" + payment.getTransactionId());
        chargeback.setPaymentDate(new Timestamp(System.currentTimeMillis()).toString());

        Payment savedChargeback = paymentRepository.save(chargeback);

        // Update original payment status if full amount is charged back
        if (chargebackRequest.getAmount() == payment.getPaymentAmount()) {
            payment.setPaymentStatus("CHARGEBACK");
            paymentRepository.save(payment);
        }

        return new PaymentResponse(
            savedChargeback.getPaymentId(),
            savedChargeback.getInvoice().getInvoiceId(),
            savedChargeback.getInvoice().getCustomers().getCustomerName(),
            savedChargeback.getPaymentAmount(),
            savedChargeback.getPaymentMethod(),
            savedChargeback.getPaymentStatus(),
            savedChargeback.getTransactionId(),
            Timestamp.valueOf(savedChargeback.getPaymentDate())
        );
    }

    @Override
    public List<PaymentMethod> getSupportedPaymentMethods() {
        return List.of(PaymentMethod.values());
    }

    @Override
    public PaymentMethod addPaymentMethod(AddPaymentMethodRequest request) {
       
        String methodName = request.getMethodName().toUpperCase().replace(" ", "_");
        
       
        try {
            PaymentMethod existingMethod = PaymentMethod.valueOf(methodName);
            throw new RuntimeException("Payment method already exists: " + existingMethod.getDisplayName());
        } catch (IllegalArgumentException e) {
           
        }
        throw new RuntimeException("Adding new payment methods at runtime is not supported. Please update the PaymentMethod enum.");
    }
}