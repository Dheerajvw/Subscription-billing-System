package com.Select.Project.Users;

import java.util.List;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import java.util.regex.Matcher;
@Service
public class CustomerServicesImp implements CustomerServices {

    @Autowired
    private CustomerRespositry customerRespositry;
    
    private static final Pattern VALID_EMAIL_ADDRESS_REGEX = Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,6}$", Pattern.CASE_INSENSITIVE);
    private static final Pattern VALID_PHONE_NUMBER_REGEX = Pattern.compile("^[0-9]{10}$");

    @Override
    public CustomerError getAllCustomers() {
        List<Customers> customers = customerRespositry.findAll();
        if (customers.isEmpty()) {
           return new CustomerError(HttpStatus.NOT_FOUND.value(), "No customers found", customers);
        }
        return new CustomerError(HttpStatus.OK.value(), "Customers fetched successfully", customers);
    }

    @Override
    public CustomerError getCustomerById(Long id) {
        Customers customer = customerRespositry.findByCustomerId(id);
        if (customer == null) {
            return new CustomerError(HttpStatus.NOT_FOUND.value(), "Customer not found", null);
        }
        return new CustomerError(HttpStatus.OK.value(), "Customer fetched successfully", List.of(customer));
    }

    @Override
    @Transactional
    public String deleteCustomerById(Long id) {
        Customers customer = customerRespositry.findByCustomerId(id);
        if (customer == null) {
            return "Customer not found";
        }
        
        // First, delete any user subscriptions associated with this customer
        customerRespositry.deleteUserSubscriptions(id);
        
        // Then use the standard JPA delete method which respects cascades
        customerRespositry.delete(customer);
        
        return "Customer deleted successfully";
    }


    @Override
    public CustomerError addCustomer(Customers customers) { 
        if (customers.getCustomerName() == null || customers.getCustomerEmail() == null || customers.getCustomerPhone() == null) {
            return new CustomerError(HttpStatus.BAD_REQUEST.value(), "Customer name, email, and phone are required", null);
        }
        if (!VALID_EMAIL_ADDRESS_REGEX.matcher(customers.getCustomerEmail()).matches()) {
            return new CustomerError(HttpStatus.BAD_REQUEST.value(), "Invalid email address", null);
        }
        
        if (!VALID_PHONE_NUMBER_REGEX.matcher(customers.getCustomerPhone()).matches() || customers.getCustomerPhone().length() != 10) {
            return new CustomerError(HttpStatus.BAD_REQUEST.value(), "Invalid phone number", null);
        }
        customerRespositry.save(customers);
        return new CustomerError(HttpStatus.CREATED.value(), "Customer added successfully", List.of(customers));
    }

    @Override
    public CustomerError updateCustomerById(Long id, Customers customers) {
        Customers existingCustomer = customerRespositry.findByCustomerId(id);
        if (existingCustomer == null) {
            return new CustomerError(HttpStatus.NOT_FOUND.value(), "Customer not found", null); 
        }

        if(customers.getCustomerName() != null) {
            existingCustomer.setCustomerName(customers.getCustomerName());
        }
        if (customers.getCustomerEmail() != null) {
            Matcher matcher = VALID_EMAIL_ADDRESS_REGEX.matcher(customers.getCustomerEmail());
            if (!matcher.matches()) {
                return new CustomerError(HttpStatus.BAD_REQUEST.value(), "Invalid email address", null);
            }
            existingCustomer.setCustomerEmail(customers.getCustomerEmail());
        }
       if(customers.getCustomerPhone() != null) {
        Matcher matcher = VALID_PHONE_NUMBER_REGEX.matcher(customers.getCustomerPhone());
        if (!matcher.matches() || customers.getCustomerPhone().length() != 10) {
            return new CustomerError(HttpStatus.BAD_REQUEST.value(), "Invalid phone number", null);
        }
        existingCustomer.setCustomerPhone(customers.getCustomerPhone());
       }
        
        customerRespositry.save(existingCustomer);
        return new CustomerError(HttpStatus.OK.value(), "Customer updated successfully", List.of(existingCustomer));
    }
    
}
