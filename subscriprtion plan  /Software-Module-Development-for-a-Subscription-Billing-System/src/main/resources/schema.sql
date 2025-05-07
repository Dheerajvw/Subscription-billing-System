DROP TABLE IF EXISTS subscription_plans;

CREATE TABLE subscription_plans (
    subscription_plan_id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_plan_name VARCHAR(100) NOT NULL UNIQUE,
    subscription_plan_description VARCHAR(500) NOT NULL,
    subscription_plan_price DECIMAL(10,2) NOT NULL,
    subscription_plan_duration INT NOT NULL,
    usage_limit INT NOT NULL
); 