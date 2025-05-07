package com.Select.Project.Discount;

import com.Select.Project.Users.CustomerRespositry;
import com.Select.Project.Users.Customers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class DiscountServiceImp implements DiscountService {

    @Autowired
    private DiscountRepository discountRepository;

    @Autowired
    private CustomerRespositry customerRepository;


    @Override
    public DiscountError getAllDiscounts() {
        List<Discount> discounts = (List<Discount>) discountRepository.findAll();
        if (discounts.isEmpty()) {
            return new DiscountError(HttpStatus.NOT_FOUND.value(), "No discounts found", null);
        }
        return new DiscountError(HttpStatus.OK.value(), "Discounts fetched successfully", discounts);
    }

    // Get discount by ID
    @Override
    public DiscountError getDiscountById(int discountId) {
        Optional<Discount> discount = discountRepository.findById(discountId);
        if (discount.isEmpty()) {
            return new DiscountError(HttpStatus.NOT_FOUND.value(), "Discount ID not found", null);
        }
        return new DiscountError(HttpStatus.OK.value(), "Discount fetched successfully", List.of(discount.get()));
    }

  
    @Override
    public DiscountError addDiscount(Discount discount) {
        try {
            if (discount.getCustomers() == null || discount.getCustomers().getCustomerId() == 0) {
                return new DiscountError(HttpStatus.BAD_REQUEST.value(), "Customer ID is required", null);
            }
            
            Customers customer = customerRepository.findById(discount.getCustomers().getCustomerId());
            if (customer == null) {
                return new DiscountError(HttpStatus.NOT_FOUND.value(), "Customer not found", null);
            }
            
            discount.setCustomers(customer);
            Discount savedDiscount = discountRepository.save(discount);
            return new DiscountError(HttpStatus.CREATED.value(), "Discount added successfully", List.of(savedDiscount));
        } catch (Exception e) {
            return new DiscountError(HttpStatus.BAD_REQUEST.value(), "Error creating discount: " + e.getMessage(), null);
        }
    }

   
    @Override
    public DiscountError updateDiscount(int discountId, Discount discount) {
        Optional<Discount> existingDiscount = discountRepository.findById(discountId);
        if (existingDiscount.isEmpty()) {
            return new DiscountError(HttpStatus.NOT_FOUND.value(), "Discount ID not found", null);
        }
        Discount existing = existingDiscount.get();
        discount.setDiscountId(discountId);
        discount.setCustomers(existing.getCustomers()); 
        discountRepository.save(discount);
        return new DiscountError(HttpStatus.OK.value(), "Discount updated successfully", List.of(discount));
    }

 
    @Override
    public DiscountError deleteDiscount(int discountId) {
        Optional<Discount> discount = discountRepository.findById(discountId);
        if (discount.isEmpty()) {
            return new DiscountError(HttpStatus.NOT_FOUND.value(), "Discount ID not found", null);
        }
        discountRepository.deleteById(discountId);
        return new DiscountError(HttpStatus.OK.value(), "Discount deleted successfully", null);
    }

 
    @Override
    public DiscountError getDiscountsByCustomerId(int customerId) {
       List<Discount> discounts = customerRepository.findById(customerId).getDiscounts();
        if (discounts.isEmpty()) {
            return new DiscountError(HttpStatus.NOT_FOUND.value(), "No discounts found for this customer", null);
        }
        return new DiscountError(HttpStatus.OK.value(), "Discounts fetched successfully for customer", discounts);
    }


    @Override
public DiscountError applyDiscountToAllCustomers(int discountId) {
    Optional<Discount> discountOptional = discountRepository.findById(discountId);

    if (discountOptional.isEmpty()) {
        return new DiscountError(HttpStatus.NOT_FOUND.value(), "Discount ID not found", null);
    }

    Discount discount = discountOptional.get();
    List<Customers> customersList = (List<Customers>) customerRepository.findAll();

 
    if (customersList.isEmpty()) {
        return new DiscountError(HttpStatus.NOT_FOUND.value(), "No customers found to apply discount", null);
    }

    for (Customers customer : customersList) {
        Discount appliedDiscount = new Discount();
        appliedDiscount.setDiscountName(discount.getDiscountName());
        appliedDiscount.setDiscountType(discount.getDiscountType());
        appliedDiscount.setDiscountAmount(discount.getDiscountAmount());
        appliedDiscount.setStartDate(discount.getStartDate());
        appliedDiscount.setEndDate(discount.getEndDate());
        appliedDiscount.setStatus(discount.getStatus());
        appliedDiscount.setCustomers(customer); 
        discountRepository.save(appliedDiscount);
    }

    return new DiscountError(HttpStatus.OK.value(), "Discount applied successfully to all customers", null);
}

}
