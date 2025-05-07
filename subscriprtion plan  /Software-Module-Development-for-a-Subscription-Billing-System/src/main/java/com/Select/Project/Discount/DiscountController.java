package com.Select.Project.Discount;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/discounts")
public class DiscountController {

    @Autowired
    private DiscountService discountService;

    @GetMapping
    public DiscountError getAllDiscounts() {
        return discountService.getAllDiscounts();
    }

   
    @GetMapping("/{discountId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public DiscountError getDiscountById(@PathVariable int discountId) {
        return discountService.getDiscountById(discountId);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public DiscountError addDiscount(@RequestBody Discount discount) {
        return discountService.addDiscount(discount);
    }

    @PutMapping("/{discountId}")
    @PreAuthorize("hasRole('ADMIN')")
    public DiscountError updateDiscount(@PathVariable int discountId, @RequestBody Discount discount) {
        return discountService.updateDiscount(discountId, discount);
    }

    @DeleteMapping("/{discountId}")
    @PreAuthorize("hasRole('ADMIN')")
    public DiscountError deleteDiscount(@PathVariable int discountId) {
        return discountService.deleteDiscount(discountId);
    }

    @PostMapping("/All")
    @PreAuthorize("hasRole('ADMIN')")
    public DiscountError applyDiscountToAllCustomers(@RequestParam int discountId) {
        return discountService.applyDiscountToAllCustomers(discountId);
    }
}

