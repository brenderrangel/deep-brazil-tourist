-- Tabela para o Módulo 6: Concierge Premium (Consultoria Assíncrona de Roteiros)
CREATE TABLE IF NOT EXISTS concierge_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    destination VARCHAR(100) NOT NULL,
    travel_dates VARCHAR(100) NULL,
    travelers_count INT NOT NULL DEFAULT 1,
    budget_level ENUM('budget', 'moderate', 'luxury') NOT NULL DEFAULT 'moderate',
    interests VARCHAR(255) NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'in_review', 'answered') NOT NULL DEFAULT 'pending',
    response_text TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    answered_at DATETIME NULL,
    INDEX idx_concierge_user (user_id),
    INDEX idx_concierge_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

