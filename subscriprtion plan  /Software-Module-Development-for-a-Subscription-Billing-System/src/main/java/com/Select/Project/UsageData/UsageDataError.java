package com.Select.Project.UsageData;
import java.util.List;
public class UsageDataError {
    private String errorMessage;
    private String errorCode;
    private List<UsageDataEntity> usageDataEntities;

    public UsageDataError(String errorMessage, String errorCode, List<UsageDataEntity> usageDataEntities) {
        this.errorMessage = errorMessage;
        this.errorCode = errorCode;
        this.usageDataEntities = usageDataEntities;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public List<UsageDataEntity> getUsageDataEntities() {
        return usageDataEntities;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public void setUsageDataEntities(List<UsageDataEntity> usageDataEntities) {
        this.usageDataEntities = usageDataEntities;
    }
}
