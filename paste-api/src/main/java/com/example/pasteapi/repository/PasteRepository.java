package com.example.pasteapi.repository;

import com.example.pasteapi.entity.Paste;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasteRepository extends JpaRepository<Paste, UUID>,
        JpaSpecificationExecutor<Paste> {

    Optional<Paste> findByShortLink(String shortLink);

    boolean existsByShortLink(String shortLink);

    @Query("""
            SELECT p FROM Paste p
            WHERE p.author.id = :authorId
              AND (p.expiresAt IS NULL OR p.expiresAt > CURRENT_TIMESTAMP)
            """)
    Page<Paste> findAllByAuthorId(@Param("authorId") UUID authorId, Pageable pageable);

    @Modifying
    @Query("UPDATE Paste p SET p.views = p.views + :delta WHERE p.id = :id")
    void incrementViewsBy(@Param("id") UUID id, @Param("delta") long delta);

    @Query("SELECT p FROM Paste p WHERE p.expiresAt IS NOT NULL AND p.expiresAt < :now")
    List<Paste> findAllExpired(@Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM Paste p WHERE p.expiresAt IS NOT NULL AND p.expiresAt < :now")
    int deleteAllExpiredBefore(@Param("now") LocalDateTime now);

    // Admin видит все пасты включая приватные
    @Query("""
    SELECT p FROM Paste p
    LEFT JOIN FETCH p.author
    LEFT JOIN FETCH p.category
    WHERE (:keyword IS NULL
        OR LOWER(p.title)   LIKE LOWER(CONCAT('%', :keyword, '%'))
        OR LOWER(p.content) LIKE LOWER(CONCAT('%', :keyword, '%')))
      AND (:authorId IS NULL OR p.author.id = :authorId)
    """)
    Page<Paste> findAllForAdmin(
            @Param("keyword")  String keyword,
            @Param("authorId") UUID   authorId,
            Pageable pageable
    );

    @Modifying
    @Query("DELETE FROM Paste p WHERE p.id IN :ids")
    int deleteByIdIn(@Param("ids") List<UUID> ids);

    @Query("SELECT COUNT(p) FROM Paste p WHERE p.isPublic = true")
    long countPublic();

    @Query("SELECT COUNT(p) FROM Paste p WHERE p.isPublic = false")
    long countPrivate();

    @Query("SELECT COUNT(p) FROM Paste p WHERE p.password IS NOT NULL")
    long countPasswordProtected();

    @Query("""
    SELECT COUNT(p) FROM Paste p
    WHERE p.expiresAt IS NOT NULL AND p.expiresAt < :now
    """)
    long countExpired(@Param("now") LocalDateTime now);

    @Query("SELECT COALESCE(SUM(p.views), 0) FROM Paste p")
    long sumAllViews();
}
