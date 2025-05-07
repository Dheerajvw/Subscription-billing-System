package com.Select.Project.Payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.Select.Project.Invoices.Invoice;

@Repository
public interface PaymentResp extends JpaRepository<Payment, Integer> {
    Payment findByPaymentId(int paymentId);
    Payment findByInvoice(Invoice invoice);
    Payment findByTransactionId(String transactionId);
}
