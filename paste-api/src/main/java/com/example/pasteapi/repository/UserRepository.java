package com.example.pasteapi.repository;

import com.example.pasteapi.constants.Role;
import com.example.pasteapi.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @Query("""
    SELECT u FROM User u
    WHERE (:keyword IS NULL
        OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
        OR LOWER(u.email)    LIKE LOWER(CONCAT('%', :keyword, '%')))
      AND (:role IS NULL OR u.role = :role)
      AND (:from IS NULL OR u.createdAt >= :from)
      AND (:to   IS NULL OR u.createdAt <= :to)
    """)
    Page<User> findWithFilters(
            @Param("keyword") String keyword,
            @Param("role") Role role,
            @Param("from") LocalDateTime from,
            @Param("to")      LocalDateTime to,
            Pageable pageable
    );

    @Query("SELECT COUNT(p) FROM Paste p WHERE p.author.id = :userId")
    long countPastesByUserId(@Param("userId") UUID userId);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") Role role);
}
