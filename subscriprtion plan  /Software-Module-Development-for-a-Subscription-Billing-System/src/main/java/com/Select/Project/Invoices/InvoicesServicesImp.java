package com.Select.Project.Invoices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

import com.Select.Project.Users.Customers;
import com.Select.Project.Users.CustomerRespositry;
import com.Select.Project.SubscriptionPlans.SubscriptionPlansResp;
import com.Select.Project.SubscriptionPlans.SubscriptionPlans;
import com.Select.Project.Payment.PaymentResp;
import com.Select.Project.Payment.Payment;
@Service
public class InvoicesServicesImp implements InvoicesServices {

    @Autowired
    private InvoiceResp invoiceResp;

    @Autowired
    private CustomerRespositry customerRepository;

    @Autowired
    private SubscriptionPlansResp subscriptionPlansRepository;

    @Autowired
    private PaymentResp paymentRepository;

    @Override
    public InvoiceError getAllInvoices() {
        List<Invoice> invoices = (List<Invoice>) invoiceResp.findAll();
        if (invoices.isEmpty()) {
            return new InvoiceError(HttpStatus.NOT_FOUND.value(), "No invoices found", null);
        }
        return new InvoiceError(HttpStatus.OK.value(), "Invoices fetched successfully", invoices);
    }

    @Override
    public InvoiceError getInvoiceById(int invoiceId) {
        Invoice invoice = invoiceResp.findById(invoiceId);
        if (invoice == null) {
            return new InvoiceError(HttpStatus.NOT_FOUND.value(), "Invoice ID not found", null);
        }
        return new InvoiceError(HttpStatus.OK.value(), "Invoice fetched successfully", List.of(invoice));
    }

    @Override
    public InvoiceError deleteInvoiceById(int invoiceId) {
        Invoice invoice = invoiceResp.findById(invoiceId);
        if (invoice == null) {
            return new InvoiceError(HttpStatus.NOT_FOUND.value(), "Invoice ID not found", null);
        }
        
        // First delete any associated payment
        Payment payment = paymentRepository.findByInvoice(invoice);
        if (payment != null) {
            paymentRepository.delete(payment);
        }
        
        // Then delete the invoice
        invoiceResp.deleteById(invoiceId);
        return new InvoiceError(HttpStatus.OK.value(), "Invoice deleted successfully", null);
    }

    @Override
    public InvoiceError addInvoice(Invoice invoice) {
       Customers customer = customerRepository.findByCustomerId((long) invoice.getCustomers().getCustomerId());
        if (customer == null) {
            return new InvoiceError(HttpStatus.NOT_FOUND.value(), "Customer not found", null);
        }
        invoice.setCustomers(customer);

        SubscriptionPlans subscriptionPlan = subscriptionPlansRepository.findById(invoice.getSubscriptionPlan().getSubscriptionPlanId())
            .orElseThrow(() -> new RuntimeException("Subscription plan not found"));
        invoice.setInvoiceAmount(String.valueOf(subscriptionPlan.getSubscriptionPlanPrice()));

        Timestamp currentTimestamp = new Timestamp(System.currentTimeMillis());
        invoice.setInvoiceDate(currentTimestamp);

        LocalDateTime dueDateTime = currentTimestamp.toLocalDateTime().plusDays(subscriptionPlan.getSubscriptionPlanDuration());
        invoice.setInvoiceDueDate(Timestamp.valueOf(dueDateTime));

        String status = dueDateTime.isBefore(LocalDateTime.now()) ? "Overdue" : "Pending";
        invoice.setInvoiceStatus(status);

        invoiceResp.save(invoice);
        return new InvoiceError(HttpStatus.CREATED.value(), "Invoice added successfully", List.of(invoice));
    }

    @Override
    public InvoiceError getUnpaidInvoices() {
        List<Invoice> unpaidInvoices = invoiceResp.findByInvoiceStatus("PENDING");
        if (unpaidInvoices.isEmpty()) {
            return new InvoiceError(HttpStatus.NOT_FOUND.value(), "No unpaid invoices found", null);
        }
        return new InvoiceError(HttpStatus.OK.value(), "Unpaid invoices fetched successfully", unpaidInvoices);
    }

    @Override
    public InvoiceError markInvoiceAsPaid(int invoiceId) {
        Invoice invoice = invoiceResp.findById(invoiceId);
        if (invoice == null) {
            return new InvoiceError(HttpStatus.NOT_FOUND.value(), "Invoice not found", null);
        }
        if ("PAID".equals(invoice.getInvoiceStatus())) {
            return new InvoiceError(HttpStatus.BAD_REQUEST.value(), "Invoice is already paid", null);
        }
        invoice.setInvoiceStatus("PAID");
        invoiceResp.save(invoice);
        return new InvoiceError(HttpStatus.OK.value(), "Invoice marked as paid successfully", List.of(invoice));
    }
}


