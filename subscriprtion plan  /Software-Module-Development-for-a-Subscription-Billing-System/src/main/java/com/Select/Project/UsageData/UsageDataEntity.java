package com.Select.Project.UsageData;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.sql.Timestamp;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import com.Select.Project.Users.Customers;
import com.fasterxml.jackson.annotation.JsonBackReference;
@Entity
public class UsageDataEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private int usageDataId;
    private String usageDataAmount;
    private int  plain_id;
    private Timestamp usageDataDate;
    private String usagedetails;


    @ManyToOne
    @JoinColumn(name = "customer_id", referencedColumnName = "customerId", nullable = false)
    @JsonBackReference
    private Customers customers;


    public UsageDataEntity() {
    }

    public UsageDataEntity(int usageDataId, String usageDataAmount, int plain_id, Timestamp usageDataDate, String usagedetails, Customers customers) {
        this.usageDataId = usageDataId;
        this.usageDataAmount = usageDataAmount;
        this.plain_id = plain_id;
        this.usageDataDate = usageDataDate;
        this.usagedetails = usagedetails;
        this.customers = customers;
    }

    public int getUsageDataId() {
        return usageDataId;
    }

    public void setUsageDataId(int usageDataId) {
        this.usageDataId = usageDataId;
    }

    public String getUsageDataAmount() {
        return usageDataAmount;
    }

    public void setUsageDataAmount(String usageDataAmount) {
        this.usageDataAmount = usageDataAmount;
    }

    public int getPlain_id() {
        return plain_id;
    }

    public void setPlain_id(int plain_id) {
        this.plain_id = plain_id;
    }

    public Timestamp getUsageDataDate() {
        return usageDataDate;
    }

    public void setUsageDataDate(Timestamp usageDataDate) {
        this.usageDataDate = usageDataDate;
    }

    public String getUsagedetails() {
        return usagedetails;
    }

    public void setUsagedetails(String usagedetails) {
        this.usagedetails = usagedetails;
    }

    public Customers getCustomers() {
        return customers;
    }

    public void setCustomers(Customers customers) {
        this.customers = customers;
    }
}
