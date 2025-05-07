package com.Select.Project.UsageData;

public interface UsageDataServices {
    public UsageDataError getUsageDataAll();
    public UsageDataError getUsageDataById(int id);
    public UsageDataError addUsageData(UsageDataEntity usageDataEntity);
    public UsageDataError trackUsageData(UsageDataEntity usageDataEntity);
     public UsageDataError deleteUsageData(int id);
     public UsageDataError getUsagetrackByCustomerId(int customerId);
    
}
