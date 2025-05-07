package com.Select.Project.Discount;
public interface DiscountService {

    DiscountError getAllDiscounts();
    DiscountError getDiscountById(int discountId);
    DiscountError addDiscount(Discount discount);
    DiscountError updateDiscount(int discountId, Discount discount);
    DiscountError deleteDiscount(int discountId);
    DiscountError getDiscountsByCustomerId(int customerId);
    DiscountError applyDiscountToAllCustomers(int discountId);
}
