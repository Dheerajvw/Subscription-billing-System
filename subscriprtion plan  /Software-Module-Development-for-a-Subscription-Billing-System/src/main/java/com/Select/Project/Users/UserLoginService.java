package com.Select.Project.Users;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;
import java.time.LocalDateTime;
import org.springframework.transaction.annotation.Transactional;

import com.Select.Project.SubscriptionPlans.SubscriptionPlans;
import com.Select.Project.SubscriptionPlans.SubscriptionPlansRepository;

import java.util.Optional;

@Service
public class UserLoginService {
    private static final Logger logger = LoggerFactory.getLogger(UserLoginService.class);

    @Autowired
    private SubscriptionPlansRepository subscriptionPlansRepository;

    @Autowired
    private CustomerRespositry customerRepository;

    @Autowired
    private UserLoginRepository userLoginRepository;

    // Store active sessions: Map<customerId, List<sessionInfo>>
    private final Map<Long, List<SessionInfo>> activeSessions = new ConcurrentHashMap<>();

    public static class SessionInfo {
        private final String deviceId;
        private final String ipAddress;
        private final LocalDateTime loginTime;
        private final String loginType; // "email" or "username"

        public SessionInfo(String deviceId, String ipAddress, String loginType) {
            this.deviceId = deviceId;
            this.ipAddress = ipAddress;
            this.loginTime = LocalDateTime.now();
            this.loginType = loginType;
        }

        public String getDeviceId() { return deviceId; }
        public String getIpAddress() { return ipAddress; }
        public LocalDateTime getLoginTime() { return loginTime; }
        public String getLoginType() { return loginType; }
    }

    public boolean canUserLogin(Long customerId, String deviceId, String ipAddress, String loginType) {
        // Get customer's subscription plan
        Customers customer = customerRepository.findByCustomerId(customerId);
        if (customer == null) {
            logger.error("Customer not found: {}", customerId);
            return false;
        }

        // If user has no subscription, allow login without device limit check
        String subscriptionId = customer.getSubscription_id();
        if (subscriptionId == null || subscriptionId.isEmpty()) {
            logger.info("New user login without subscription: {}", customerId);
            return true;
        }

        try {
            SubscriptionPlans plan = subscriptionPlansRepository.findById(Integer.parseInt(subscriptionId))
                .orElse(null);
            
            if (plan == null) {
                logger.error("Subscription plan not found for customer: {}", customerId);
                return true; // Allow login even if subscription plan is not found
            }

            // Check if user has reached the usage limit
            List<SessionInfo> sessions = activeSessions.get(customerId);
            int currentActiveSessions = (sessions != null) ? sessions.size() : 0;

            if (currentActiveSessions >= plan.getUsageLimit()) {
                logger.warn("Usage limit reached for customer: {}. Current sessions: {}, Limit: {}", 
                    customerId, currentActiveSessions, plan.getUsageLimit());
                return false;
            }

            return true;
        } catch (NumberFormatException e) {
            logger.error("Invalid subscription ID format for customer {}: {}", customerId, subscriptionId);
            return true; // Allow login even if subscription ID is invalid
        }
    }

    public void addSession(Long customerId, String deviceId, String ipAddress, String loginType) {
        SessionInfo newSession = new SessionInfo(deviceId, ipAddress, loginType);
        activeSessions.compute(customerId, (key, sessions) -> {
            if (sessions == null) {
                return List.of(newSession);
            } else {
                return List.of(newSession);
            }
        });
        logger.info("New session added for customer: {}, device: {}, login type: {}", 
            customerId, deviceId, loginType);
    }

    public void removeSession(Long customerId, String deviceId) {
        activeSessions.computeIfPresent(customerId, (key, sessions) -> {
            List<SessionInfo> updatedSessions = sessions.stream()
                .filter(session -> !session.getDeviceId().equals(deviceId))
                .toList();
            return updatedSessions.isEmpty() ? null : updatedSessions;
        });
        logger.info("Session removed for customer: {}, device: {}", customerId, deviceId);
    }

    public int getActiveSessionCount(Long customerId) {
        List<SessionInfo> sessions = activeSessions.get(customerId);
        return (sessions != null) ? sessions.size() : 0;
    }

    public List<SessionInfo> getActiveSessions(Long customerId) {
        return activeSessions.get(customerId);
    }

    @Transactional
    public UserLogin createLogin(User user, String deviceId, String token) {
        // Deactivate any existing active logins for this device
        List<UserLogin> existingLogins = userLoginRepository.findByUserAndDeviceIdAndActiveTrue(user, deviceId);
        existingLogins.forEach(login -> {
            login.setActive(false);
            userLoginRepository.save(login);
        });

        // Create new login
        UserLogin userLogin = new UserLogin();
        userLogin.setUser(user);
        userLogin.setDeviceId(deviceId);
        userLogin.setToken(token);
        userLogin.setActive(true);
        return userLoginRepository.save(userLogin);
    }

    @Transactional
    public void deactivateLogin(String token) {
        Optional<UserLogin> loginOpt = userLoginRepository.findByToken(token);
        if (loginOpt.isPresent()) {
            UserLogin login = loginOpt.get();
            login.setActive(false);
            userLoginRepository.save(login);
        }
    }

    @Transactional
    public void deactivateAllUserLogins(User user) {
        List<UserLogin> activeLogins = userLoginRepository.findByUserAndActiveTrue(user);
        activeLogins.forEach(login -> {
            login.setActive(false);
            userLoginRepository.save(login);
        });
    }

    public boolean isLoginValid(String token) {
        Optional<UserLogin> loginOpt = userLoginRepository.findByToken(token);
        if (loginOpt.isPresent()) {
            UserLogin login = loginOpt.get();
            return login.isActive() && login.getExpiryTime().isAfter(LocalDateTime.now());
        }
        return false;
    }
} 