package com.Select.Project.UsageData;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.List;
import com.Select.Project.Users.Customers;
import com.Select.Project.Users.CustomerRespositry;
import com.Select.Project.SubscriptionPlans.SubscriptionPlansRepository;
import com.Select.Project.SubscriptionPlans.SubscriptionPlans;
//import java.sql.Timestamp;
@Service
public class UsageDataImp implements UsageDataServices {

    @Autowired
    private UsageDataRes usageDataRes;

    @Autowired
    private CustomerRespositry customerRespositry;

    @Autowired
    private SubscriptionPlansRepository subscriptionPlanRespositry;

    @Override
    public UsageDataError getUsageDataAll() {
       if (usageDataRes.findAll().isEmpty()) {
        return new UsageDataError("No data found", "404", null);
       }
       return new UsageDataError("Data found", "200", usageDataRes.findAll());
    }

   @Override
   public UsageDataError getUsageDataById(int id) {
    if(usageDataRes.findByUsageDataId(id) == null) {
        return new UsageDataError("id not found", "404", null);
    }
    return new UsageDataError("Data found", "200", List.of(usageDataRes.findByUsageDataId(id)));
   }

    @Override
    public UsageDataError addUsageData(UsageDataEntity usageDataEntity) {
       Customers customer = customerRespositry.findById(usageDataEntity.getCustomers().getCustomerId());
       if(customer == null) {
        return new UsageDataError("Customer id not found", "404", null);
       }
       SubscriptionPlans subscriptionPlan = subscriptionPlanRespositry.findById(usageDataEntity.getPlain_id()).orElse(null);
       if(subscriptionPlan == null) {
        return new UsageDataError("Subscription plan  id is not found", "404", null);
       }
       else{ 
        int duration = subscriptionPlan.getSubscriptionPlanDuration();
        System.out.println(duration);
        // Timestamp currentDate = usageDataEntity.getUsageDataDate();
        // Timestamp endDate = currentDate + duration;
        // usageDataEntity.setUsageDataEndDate(endDate);
        }
        usageDataEntity.setCustomers(customer);
        usageDataRes.save(usageDataEntity);
        return new UsageDataError("Data added", "200", List.of(usageDataEntity));
    }
    

    @Override
    public UsageDataError deleteUsageData(int id) {
        if(usageDataRes.findByUsageDataId(id) == null) {
            return new UsageDataError("id not found", "404", null);
        }
        usageDataRes.deleteById(id);
        return new UsageDataError("Data deleted", "200", null);
    }

    @Override
    public UsageDataError trackUsageData(UsageDataEntity usageDataEntity) {
        SubscriptionPlans subscriptionPlan = subscriptionPlanRespositry.findById(usageDataEntity.getPlain_id()).orElse(null);
        System.out.println(subscriptionPlan);
        if(subscriptionPlan == null) {
            return new UsageDataError("Subscription plan id not found", "404", null);
        }
        else{
            int duration = subscriptionPlan.getSubscriptionPlanDuration();
            System.out.println(duration);
        }
        return new UsageDataError("Data tracked", "200", List.of(usageDataEntity));
    }

    @Override
    public UsageDataError getUsagetrackByCustomerId(int customerId) {
        Customers customer = customerRespositry.findById(customerId);
        if(customer == null) {
            return new UsageDataError("Customer id not found", "404", null);
        }
    //     SubscriptionPlans subscriptionPlan = subscriptionPlanRespositry.findById(Integer.parseInt(customer.getSubscription_id())).orElse(null);
    //     if(subscriptionPlan.getUsageLimit()) {
    //         return new UsageDataError("Subscription plan id not found", "404", null);
    //     }
    //    System.out.println("usage limit for the subscription plan is "+subscriptionPlan.getUsageLimit());
        return new UsageDataError("Usage data found", "200", null);
    }


}