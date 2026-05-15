package com.example.pasteapi.service;

import com.example.pasteapi.dto.PasteEventDto;
import com.example.pasteapi.entity.PasteExpiration;
import com.example.pasteapi.repository.PasteExpirationRepository;
import com.example.pasteapi.repository.PasteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasteExpirationService {

    private final PasteExpirationRepository expirationRepository;
    private final PasteRepository pasteRepository;

    @Value("${expiration.batch-size:500}")
    private int batchSize;

    @Transactional
    public void scheduleExpiration(PasteEventDto event) {
        UUID pasteId = UUID.fromString(event.getPasteId());

        PasteExpiration record = expirationRepository
                .findByPasteId(pasteId)
                .orElseGet(() -> PasteExpiration.builder()
                        .pasteId(pasteId)
                        .shortLink(event.getShortLink())
                        .build());

        record.setExpiresAt(event.getExpiresAt());
        record.setStatus(PasteExpiration.ExpirationStatus.PENDING);
        expirationRepository.save(record);
    }

    @Transactional
    public int deleteExpiredBatch(LocalDateTime now) {
        Pageable page = PageRequest.of(0, batchSize, Sort.by("expiresAt").ascending());

        List<PasteExpiration> due = expirationRepository.findAllDue(now, page);
        if (due.isEmpty()) return 0;

        List<UUID>   pasteIds   = due.stream().map(PasteExpiration::getPasteId).toList();
        List<String> shortLinks = due.stream().map(PasteExpiration::getShortLink).toList();

        int deleted = pasteRepository.deleteByIdIn(pasteIds);
        expirationRepository.markDeleted(pasteIds, now);

        log.info("Expired {} pastes. Short links: {}",
                deleted,
                shortLinks.size() > 5
                        ? shortLinks.subList(0, 5) + "... +" + (shortLinks.size() - 5)
                        : shortLinks);

        return deleted;
    }

    @Transactional
    public int deleteOrphanExpired(LocalDateTime now) {
        int count = pasteRepository.deleteAllExpiredBefore(now);
        if (count > 0) {
            log.warn("Orphan cleanup deleted {} pastes not tracked by expiration service", count);
        }
        return count;
    }

    @Transactional(readOnly = true)
    public long countPending() {
        return expirationRepository.countByStatus(PasteExpiration.ExpirationStatus.PENDING);
    }
}
