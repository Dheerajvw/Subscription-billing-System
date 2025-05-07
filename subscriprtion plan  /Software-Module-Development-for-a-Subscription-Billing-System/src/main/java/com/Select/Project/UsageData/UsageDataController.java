package com.Select.Project.UsageData;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
@RestController 
public class UsageDataController {

    @Autowired
    private UsageDataServices usageDataServices;

    @GetMapping("/usageData")
    public UsageDataError getUsageDataAll() {
        return usageDataServices.getUsageDataAll();
    }

    @GetMapping("/usageData/{id}")
    public UsageDataError getUsageDataById(@PathVariable int id) {
        return usageDataServices.getUsageDataById(id);
    }

    @PostMapping("/usageData")
    public UsageDataError addUsageData(@RequestBody UsageDataEntity usageDataEntity) {
        return usageDataServices.addUsageData(usageDataEntity);
    }

    @DeleteMapping("/usageData/{id}")
    public UsageDataError deleteUsageData(@PathVariable int id) {
        return usageDataServices.deleteUsageData(id);
    }

    @PostMapping("/usageData/track")
    public UsageDataError trackUsageData(@RequestBody UsageDataEntity usageDataEntity) {
        return usageDataServices.trackUsageData(usageDataEntity);
    }

    @GetMapping("/usageData/track/{customerId}")
    public UsageDataError getUsagetrackByCustomerId(@PathVariable int customerId) {
        return usageDataServices.getUsagetrackByCustomerId(customerId);
    }
    
}
