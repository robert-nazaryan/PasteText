package com.example.pasteapi.service;

import com.example.pasteapi.entity.Paste;
import com.example.pasteapi.kafka.PasteKafkaProducer;
import com.example.pasteapi.repository.PasteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpiringNotificationScheduler {

    private final PasteRepository pasteRepository;
    private final PasteKafkaProducer kafkaProducer;

    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void notifySoonToExpire() {
        LocalDateTime now       = LocalDateTime.now();
        LocalDateTime threshold = now.plusHours(24);

        List<Paste> candidates = pasteRepository.findSoonToExpire(now, threshold);
        if (candidates.isEmpty()) {
            log.debug("No pastes expiring in the next 24h to notify");
            return;
        }

        for (Paste paste : candidates) {
            try {
                kafkaProducer.sendPasteExpiring(paste);
                paste.setNotifiedExpiring(true);
            } catch (Exception e) {
                log.error("Failed to publish paste.expiring for pasteId={}: {}",
                        paste.getId(), e.getMessage(), e);
            }
        }

        pasteRepository.saveAll(candidates.stream()
                .filter(Paste::isNotifiedExpiring)
                .toList());

        log.info("Sent paste.expiring notifications for {} paste(s)", candidates.size());
    }
}
