package com.example.pasteapi.kafka;

import com.example.pasteapi.dto.PasteEventDto;
import com.example.pasteapi.service.PasteExpirationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PasteCreatedConsumer {

    private static final String TOPIC = "paste.created";
    private static final String DLT   = "paste.created.DLT";

    private final PasteExpirationService expirationService;

    @KafkaListener(
            topics           = TOPIC,
            groupId          = "paste-api-expiration-group",
            containerFactory = "pasteCreatedListenerContainerFactory"
    )
    public void onPasteCreated(
            @Payload PasteEventDto event,
            @Header(KafkaHeaders.RECEIVED_TOPIC)     String topic,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET)             long offset,
            Acknowledgment ack) {

        log.debug("Received [{}] partition={} offset={} pasteId={}",
                topic, partition, offset, event.getPasteId());

        try {
            if (event.getExpiresAt() != null) {
                expirationService.scheduleExpiration(event);
                log.info("Scheduled expiration for paste: {} at {}",
                        event.getPasteId(), event.getExpiresAt());
            }
            ack.acknowledge();

        } catch (Exception e) {
            log.error("Failed to process paste.created event: pasteId={}, error={}",
                    event.getPasteId(), e.getMessage(), e);
            throw e;
        }
    }

    @KafkaListener(
            topics  = DLT,
            groupId = "paste-api-expiration-dlt-group"
    )
    public void onDeadLetter(
            @Payload PasteEventDto event,
            Acknowledgment ack) {
        log.error("DLT message received — manual intervention needed: pasteId={}",
                event != null ? event.getPasteId() : "null");
        ack.acknowledge();
    }
}
