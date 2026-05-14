package com.example.pasteapi.repository;

import com.example.pasteapi.entity.RefreshToken;
import com.example.pasteapi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByToken(String token);

    void deleteByUser(User user);

    void deleteAllByExpiresAtBefore(LocalDateTime now);
}
