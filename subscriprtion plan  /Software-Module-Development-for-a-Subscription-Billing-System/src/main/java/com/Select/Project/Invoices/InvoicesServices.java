package com.Select.Project.Invoices;
public interface InvoicesServices {
    InvoiceError getAllInvoices();
    InvoiceError getInvoiceById(int invoiceId);
    InvoiceError deleteInvoiceById(int invoiceId);
    InvoiceError addInvoice(Invoice invoice);
    InvoiceError getUnpaidInvoices();
    InvoiceError markInvoiceAsPaid(int invoiceId);
}
