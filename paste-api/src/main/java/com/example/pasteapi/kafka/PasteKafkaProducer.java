package com.example.pasteapi.kafka;

import com.example.pasteapi.dto.PasteEventDto;
import com.example.pasteapi.dto.PasteExpiringEvent;
import com.example.pasteapi.dto.UserRegisteredEvent;
import com.example.pasteapi.entity.Paste;
import com.example.pasteapi.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PasteKafkaProducer {

    private static final String TOPIC_PASTE_CREATED   = "paste.created";
    private static final String TOPIC_USER_REGISTERED = "user.registered";
    private static final String TOPIC_PASTE_EXPIRING  = "paste.expiring";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendPasteCreated(Paste paste) {
        PasteEventDto event = PasteEventDto.builder()
                .pasteId(paste.getId().toString())
                .shortLink(paste.getShortLink())
                .expiresAt(paste.getExpiresAt())
                .build();

        kafkaTemplate.send(TOPIC_PASTE_CREATED, paste.getId().toString(), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send paste.created event: {}", ex.getMessage());
                    } else {
                        log.debug("paste.created sent: {}", paste.getShortLink());
                    }
                });
    }

    public void sendUserRegistered(User user) {
        UserRegisteredEvent event = UserRegisteredEvent.builder()
                .userId(user.getId().toString())
                .email(user.getEmail())
                .registeredAt(user.getCreatedAt())
                .build();

        kafkaTemplate.send(TOPIC_USER_REGISTERED, user.getId().toString(), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send user.registered event for {}: {}",
                                user.getEmail(), ex.getMessage());
                    } else {
                        log.debug("user.registered sent for: {}", user.getEmail());
                    }
                });
    }

    public void sendPasteExpiring(Paste paste) {
        PasteExpiringEvent event = PasteExpiringEvent.builder()
                .pasteId(paste.getId().toString())
                .shortLink(paste.getShortLink())
                .title(paste.getTitle())
                .authorEmail(paste.getAuthor() != null ? paste.getAuthor().getEmail() : null)
                .expiresAt(paste.getExpiresAt())
                .build();

        kafkaTemplate.send(TOPIC_PASTE_EXPIRING, paste.getId().toString(), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send paste.expiring event for {}: {}",
                                paste.getShortLink(), ex.getMessage());
                    } else {
                        log.debug("paste.expiring sent for: {}", paste.getShortLink());
                    }
                });
    }
}
