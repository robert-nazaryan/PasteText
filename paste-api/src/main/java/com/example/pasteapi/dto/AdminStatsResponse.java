package com.example.pasteapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminStatsResponse {
    private long totalUsers;
    private long totalPastes;
    private long publicPastes;
    private long privatePastes;
    private long passwordProtectedPastes;
    private long expiredPastes;
    private long totalViews;
    private long pendingExpirations;
    private LocalDateTime generatedAt;
}
