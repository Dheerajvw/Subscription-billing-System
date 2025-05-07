package com.Select.Project.Invoices;

import org.springframework.stereotype.Service;
import java.sql.Timestamp;
import java.time.LocalDateTime;


@Service
public class DueDateService {

        
    public Timestamp calculateDueDate(Timestamp invoiceDate, int durationInDays) {
        LocalDateTime localDateTime = invoiceDate.toLocalDateTime();
        LocalDateTime dueDateTime = localDateTime.plusDays(durationInDays);
        return Timestamp.valueOf(dueDateTime);
    }

    public String checkAndUpdateInvoiceStatus(Timestamp dueDate) {
        LocalDateTime now = LocalDateTime.now();
        if (dueDate.toLocalDateTime().isBefore(now)) {
            return "Overdue"; 
        }
        return "Pending"; 
    }
}

