package com.Select.Project.Users;       

public interface CustomerServices {

    public CustomerError getAllCustomers();
    public CustomerError getCustomerById(Long id);
    public String deleteCustomerById(Long id);
    public CustomerError addCustomer(Customers customers);
    public CustomerError updateCustomerById(Long id,Customers customers);
}
