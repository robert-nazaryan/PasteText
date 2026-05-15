package com.example.pasteapi.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpirationSchedulerService {

    private final PasteExpirationService expirationService;

    @Scheduled(fixedDelayString = "${expiration.scan-interval-ms:300000}")
    public void runExpirationScan() {
        log.debug("Starting expiration scan...");
        LocalDateTime now   = LocalDateTime.now();
        int total   = 0;
        int batches = 0;

        try {
            int deleted;
            do {
                deleted = expirationService.deleteExpiredBatch(now);
                total  += deleted;
                batches++;
            } while (deleted > 0);

            if (total > 0) {
                log.info("Expiration scan complete: deleted {} pastes in {} batch(es)", total, batches);
            } else {
                log.debug("Expiration scan: nothing to delete");
            }

        } catch (Exception e) {
            log.error("Expiration scan failed after deleting {} pastes: {}", total, e.getMessage(), e);
        }
    }

    @Scheduled(fixedDelay = 3_600_000)
    public void runOrphanCleanup() {
        log.debug("Starting orphan expiration cleanup...");
        try {
            int count = expirationService.deleteOrphanExpired(LocalDateTime.now().minusMinutes(5));
            if (count > 0) {
                log.warn("Orphan cleanup removed {} pastes", count);
            }
        } catch (Exception e) {
            log.error("Orphan cleanup failed: {}", e.getMessage(), e);
        }
    }

    @Scheduled(fixedDelay = 900_000)
    public void logMetrics() {
        long pending = expirationService.countPending();
        log.info("Expiration metrics — pending deletions: {}", pending);
    }
}
