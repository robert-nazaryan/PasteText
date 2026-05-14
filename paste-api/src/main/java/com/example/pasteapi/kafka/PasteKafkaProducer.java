package com.example.pasteapi.kafka;

import com.example.pasteapi.dto.PasteEventDto;
import com.example.pasteapi.entity.Paste;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PasteKafkaProducer {

    private static final String TOPIC_CREATED = "paste.created";
    private final KafkaTemplate<String, PasteEventDto> kafkaTemplate;

    public void sendPasteCreated(Paste paste) {
        PasteEventDto event = PasteEventDto.builder()
                .pasteId(paste.getId().toString())
                .shortLink(paste.getShortLink())
                .expiresAt(paste.getExpiresAt())
                .build();

        kafkaTemplate.send(TOPIC_CREATED, paste.getId().toString(), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send paste.created event: {}", ex.getMessage());
                    } else {
                        log.debug("paste.created sent: {}", paste.getShortLink());
                    }
                });
    }
}
