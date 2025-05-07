package com.Select.Project.Payment;

import java.util.List;

public interface PaymentServices {
    Payment addPayment(Payment payment);
    List<Payment> getAllPayments();
    Payment getPaymentById(int paymentId);
    PaymentError deletePayment(int paymentId);
    PaymentResponse initiatePayment(PaymentRequest paymentRequest);
    Payment getPaymentByTransactionId(String transactionId);
    PaymentResponse refundPayment(RefundRequest refundRequest);
    PaymentResponse processChargeback(ChargebackRequest chargebackRequest);
    List<PaymentMethod> getSupportedPaymentMethods();
    PaymentMethod addPaymentMethod(AddPaymentMethodRequest request);
}
