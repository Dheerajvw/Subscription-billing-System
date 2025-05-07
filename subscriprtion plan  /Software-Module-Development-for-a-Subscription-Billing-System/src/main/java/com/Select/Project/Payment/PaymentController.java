package com.Select.Project.Payment;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.util.List;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    @Autowired
    private PaymentServices paymentServices;

    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> initiatePayment(@RequestBody PaymentRequest paymentRequest) {
        try {
            PaymentResponse response = paymentServices.initiatePayment(paymentRequest);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            String errorMessage = e.getMessage();
            
            // If this is a constraint violation related to notifications, but payment was successful
            if (errorMessage.contains("Duplicate entry") && errorMessage.contains("notification.UK")) {
                try {
                    // Find payment by transaction ID and return successful response
                    Payment payment = paymentServices.getPaymentByTransactionId(paymentRequest.getTransactionId());
                    if (payment != null) {
                        return ResponseEntity.ok(new PaymentResponse(
                            payment.getPaymentId(),
                            payment.getInvoice().getInvoiceId(),
                            payment.getInvoice().getCustomers().getCustomerName(),
                            payment.getPaymentAmount(),
                            payment.getPaymentMethod(),
                            payment.getPaymentStatus(),
                            payment.getTransactionId(),
                            Timestamp.valueOf(payment.getPaymentDate())
                        ));
                    }
                } catch (Exception findError) {
                    // Fall through to error response
                }
            }
            
            return ResponseEntity.badRequest().body(new PaymentError(400, errorMessage, null));
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllPayments() {
        return ResponseEntity.ok(paymentServices.getAllPayments());
    }

    @GetMapping("/{paymentId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> getPaymentById(@PathVariable int paymentId) {
        Payment payment = paymentServices.getPaymentById(paymentId);
        if (payment == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(payment);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addPayment(@RequestBody Payment payment) {
        return ResponseEntity.ok(paymentServices.addPayment(payment));
    }

    @DeleteMapping("/{paymentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletePayment(@PathVariable int paymentId) {
        PaymentError result = paymentServices.deletePayment(paymentId);
        if (result.getStatusCode() == 200) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.badRequest().body(result);
    }

    @GetMapping("/status/{transactionId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> getPaymentStatus(@PathVariable String transactionId) {
        try {
            Payment payment = paymentServices.getPaymentByTransactionId(transactionId);
            if (payment == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(new PaymentResponse(
                payment.getPaymentId(),
                payment.getInvoice().getInvoiceId(),
                payment.getInvoice().getCustomers().getCustomerName(),
                payment.getPaymentAmount(),
                payment.getPaymentMethod(),
                payment.getPaymentStatus(),
                payment.getTransactionId(),
                Timestamp.valueOf(payment.getPaymentDate())
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new PaymentError(400, e.getMessage(), null));
        }
    }

    @PostMapping("/refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> refundPayment(@RequestBody RefundRequest refundRequest) {
        try {
            PaymentResponse response = paymentServices.refundPayment(refundRequest);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new PaymentError(400, e.getMessage(), null));
        }
    }

    @PostMapping("/chargeback")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> processChargeback(@RequestBody ChargebackRequest chargebackRequest) {
        try {
            PaymentResponse response = paymentServices.processChargeback(chargebackRequest);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new PaymentError(400, e.getMessage(), null));
        }
    }

    @GetMapping("/methods")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<PaymentMethod>> getSupportedPaymentMethods() {
        return ResponseEntity.ok(paymentServices.getSupportedPaymentMethods());
    }

    @PostMapping("/methods/add")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> addPaymentMethod(@RequestBody AddPaymentMethodRequest request) {
        try {
            PaymentMethod newMethod = paymentServices.addPaymentMethod(request);
            return ResponseEntity.ok(newMethod);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new PaymentError(400, e.getMessage(), null));
        }
    }
}
