package com.Select.Project.Users;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import com.Select.Project.config.UserRegistrationService;
import com.Select.Project.config.KeycloakService;
import com.Select.Project.Users.CustomerRespositry;
import java.util.Map;
import java.util.List;

@RestController
public class CustomerController {

    @Autowired
    private CustomerServices customerServices;
    
    @Autowired
    private UserRegistrationService userRegistrationService;
    
    @Autowired
    private CustomerRespositry customerRepository;
    
    @Autowired
    private KeycloakService keycloakService;

    // done
    @GetMapping("/customers")
    public CustomerError getAllCustomers() {
        return customerServices.getAllCustomers();
    }
    // done
    @GetMapping("/customers/{id}")
    public CustomerError getCustomerById(@PathVariable Long id) {
        return customerServices.getCustomerById(id);
    }
    
    // Updated to delete from both systems
    @DeleteMapping("/customers/{id}")
    public ResponseEntity<?> deleteCustomerById(@PathVariable Long id) {
        try {
            // First check if customer exists
            CustomerError customerCheck = customerServices.getCustomerById(id);
            if (customerCheck.getStatusCode() != 200) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Customer not found with ID: " + id
                ));
            }
            
            // Get customer details before deletion
            Customers customer = customerRepository.findByCustomerId(id);
            if (customer == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Customer not found with ID: " + id
                ));
            }
            
            // Delete in correct order to maintain referential integrity
            // 1. Delete payments
            customerRepository.deleteCustomerPayments(id);
            
            // 2. Delete notifications
            customerRepository.deleteCustomerNotifications(id);
            
            // 3. Delete discounts
            customerRepository.deleteCustomerDiscounts(id);
            
            // 4. Delete user subscriptions
            customerRepository.deleteUserSubscriptions(id);
            
            // 5. Delete invoices
            customerRepository.deleteCustomerInvoices(id);
            
            // 6. Delete from Keycloak
            String email = customer.getCustomerEmail();
            List<Map<String, String>> keycloakUsers = keycloakService.findUsersByEmail(email);
            if (!keycloakUsers.isEmpty()) {
                String keycloakUserId = keycloakUsers.get(0).get("id");
                keycloakService.deleteUser(keycloakUserId);
            }
            
            // 7. Finally delete the customer
            customerRepository.deleteCustomer(id);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Customer and all related data deleted successfully from both systems",
                "customerId", id
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to delete customer: " + e.getMessage()
            ));
        }
    }
    
    // done
    @PostMapping("/customers")
    public CustomerError addCustomer(@RequestBody Customers customers) {
        return customerServices.addCustomer(customers);
    }

    @PutMapping("/customers/{id}")
    public CustomerError updateCustomerById(@PathVariable Long id, @RequestBody Customers customers) {
        return customerServices.updateCustomerById(id, customers);
    }
}
