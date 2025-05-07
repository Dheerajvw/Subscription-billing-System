package com.Select.Project.Users;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserLoginRepository extends JpaRepository<UserLogin, Long> {
    Optional<UserLogin> findByToken(String token);
    List<UserLogin> findByUserAndActiveTrue(User user);
    List<UserLogin> findByUserAndDeviceIdAndActiveTrue(User user, String deviceId);
} 