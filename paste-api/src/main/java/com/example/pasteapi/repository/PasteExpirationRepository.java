package com.example.pasteapi.repository;

import com.example.pasteapi.entity.PasteExpiration;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasteExpirationRepository extends JpaRepository<PasteExpiration, UUID> {

    Optional<PasteExpiration> findByPasteId(UUID pasteId);

    @Query("""
        SELECT e FROM PasteExpiration e
        WHERE e.status = 'PENDING'
          AND e.expiresAt <= :now
        ORDER BY e.expiresAt ASC
        """)
    List<PasteExpiration> findAllDue(@Param("now") LocalDateTime now, Pageable pageable);

    long countByStatus(PasteExpiration.ExpirationStatus status);

    @Modifying
    @Query("""
        UPDATE PasteExpiration e
        SET e.status = 'DELETED', e.deletedAt = :now
        WHERE e.pasteId IN :pasteIds
        """)
    int markDeleted(@Param("pasteIds") List<UUID> pasteIds, @Param("now") LocalDateTime now);
}
