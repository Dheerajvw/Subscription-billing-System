package com.Select.Project.Invoices;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.Select.Project.Users.Customers;
import java.util.List;

@Repository
public interface InvoiceResp extends JpaRepository<Invoice, Integer> {
    Invoice findById(int invoiceId);
    void deleteById(int invoiceId);
    List<Invoice> findByCustomers(Customers customer);
    List<Invoice> findByInvoiceStatus(String status);

   
}
