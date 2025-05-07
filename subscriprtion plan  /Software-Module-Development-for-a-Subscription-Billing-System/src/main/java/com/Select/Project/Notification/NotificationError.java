package com.Select.Project.Notification;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationError {
    private int status;
    private String message;
    private Object data;

    public NotificationError(int status, String message) {
        this.status = status;
        this.message = message;
        this.data = null;
    }
} 