package com.Select.Project.Discount;
import com.Select.Project.Users.Customers;  
import java.sql.Timestamp;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Column;

@Entity
public class Discount {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private int discountId;

    private String discountName;
    private String discountType;  
    private double discountAmount;
    private Timestamp startDate;
    private Timestamp endDate;
    
    @Column(name = "discount_code")
    private String discountCode;
    
    @Column(name = "promoted_code")
    private String promotedCode;
    
    private int usageLimit;
    private String status;  

    @ManyToOne
    @JoinColumn(name = "customer_id")
    @JsonBackReference
    private Customers customers;

    public Discount() {}

    public Discount(int discountId, String discountName, String discountType, double discountAmount, 
                   Timestamp startDate, Timestamp endDate, String status, Customers customers, 
                   String discountCode, String promotedCode, int usageLimit) {
        this.discountId = discountId;
        this.discountName = discountName;
        this.discountType = discountType;
        this.discountAmount = discountAmount;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.customers = customers;
        this.discountCode = discountCode;
        this.promotedCode = promotedCode;
        this.usageLimit = usageLimit;
    }

  

    public int getDiscountId() {
        return discountId;
    }

    public void setDiscountId(int discountId) {
        this.discountId = discountId;
    }

    public String getDiscountName() {
        return discountName;
    }

    public void setDiscountName(String discountName) {
        this.discountName = discountName;
    }

    public String getDiscountType() {
        return discountType;
    }

    public void setDiscountType(String discountType) {
        this.discountType = discountType;
    }

    public double getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(double discountAmount) {
        this.discountAmount = discountAmount;
    }

    public Timestamp getStartDate() {
        return startDate;
    }

    public void setStartDate(Timestamp startDate) {
        this.startDate = startDate;
    }

    public Timestamp getEndDate() {
        return endDate;
    }

    public void setEndDate(Timestamp endDate) {
        this.endDate = endDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Customers getCustomers() {
        return customers;
    }

    public void setCustomers(Customers customers) {
        this.customers = customers;
    }

    public String getDiscountCode() {
        return discountCode;
    }

    public void setDiscountCode(String discountCode) {
        this.discountCode = discountCode;
    }

    public String getPromotedCode() {
        return promotedCode;
    }

    public void setPromotedCode(String promotedCode) {
        this.promotedCode = promotedCode;
    }

    public int getUsageLimit() {
        return usageLimit;
    }

    public void setUsageLimit(int usageLimit) {
        this.usageLimit = usageLimit;
    }
}

