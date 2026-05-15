package com.example.pasteapi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "paste_expirations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasteExpiration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "paste_id", nullable = false, unique = true)
    private UUID pasteId;

    @Column(name = "short_link", nullable = false, length = 12)
    private String shortLink;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExpirationStatus status = ExpirationStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public enum ExpirationStatus {
        PENDING, DELETED, CANCELLED
    }
}
