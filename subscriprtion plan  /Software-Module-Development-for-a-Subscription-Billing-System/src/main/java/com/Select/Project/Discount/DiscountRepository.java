package com.Select.Project.Discount;

import org.springframework.data.repository.CrudRepository;
import java.util.List;

public interface DiscountRepository extends CrudRepository<Discount, Integer> {


    List<Discount> findByStatus(String status);

    Discount findByDiscountName(String discountName);

    Discount findByDiscountCode(String discountCode);

    
}
