package com.pastebin.notification.kafka;

import com.pastebin.notification.kafka.dto.PasteExpiringEvent;
import com.pastebin.notification.kafka.dto.UserRegisteredEvent;
import com.pastebin.notification.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumer {

    private final EmailService emailService;

    @KafkaListener(
            topics           = "user.registered",
            containerFactory = "userRegisteredListenerFactory"
    )
    public void onUserRegistered(UserRegisteredEvent event, Acknowledgment ack) {
        log.debug("Received user.registered event for userId={}", event.getUserId());
        try {
            emailService.sendWelcomeEmail(event);
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process user.registered event: userId={}, error={}",
                    event.getUserId(), e.getMessage(), e);
            throw e;
        }
    }

    @KafkaListener(
            topics           = "paste.expiring",
            containerFactory = "pasteExpiringListenerFactory"
    )
    public void onPasteExpiring(PasteExpiringEvent event, Acknowledgment ack) {
        log.debug("Received paste.expiring event for pasteId={}", event.getPasteId());
        try {
            emailService.sendPasteExpiringEmail(event);
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process paste.expiring event: pasteId={}, error={}",
                    event.getPasteId(), e.getMessage(), e);
            throw e;
        }
    }

    @KafkaListener(
            topics           = "user.registered.DLT",
            containerFactory = "userRegisteredListenerFactory"
    )
    public void onDeadLetter(Object event, Acknowledgment ack) {
        log.error("DLT message received — manual intervention needed: {}", event);
        ack.acknowledge();
    }

    @KafkaListener(
            topics           = "paste.shared",
            containerFactory = "pasteSharedListenerFactory"
    )
    public void onPasteShared(String rawEvent, Acknowledgment ack) {
        log.info("paste.shared event received — placeholder for future implementation");
        ack.acknowledge();
    }
}
