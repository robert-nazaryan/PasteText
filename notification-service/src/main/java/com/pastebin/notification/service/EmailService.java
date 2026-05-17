package com.pastebin.notification.service;

import com.pastebin.notification.kafka.dto.PasteExpiringEvent;
import com.pastebin.notification.kafka.dto.UserRegisteredEvent;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${notification.from-email}")
    private String fromEmail;

    @Value("${notification.base-url}")
    private String baseUrl;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public void sendWelcomeEmail(UserRegisteredEvent event) {
        if (!isMailConfigured()) {
            log.warn("Mail not configured — skipping welcome email for: {}", event.getEmail());
            return;
        }

        Context ctx = new Context();
        ctx.setVariable("email", event.getEmail());
        ctx.setVariable("loginUrl", baseUrl + "/login");

        String html = templateEngine.process("welcome", ctx);

        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(event.getEmail());
            helper.setSubject("Welcome to PasteText!");
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Welcome email sent to: {}", event.getEmail());
        } catch (MessagingException e) {
            log.error("Failed to send welcome email to {}: {}", event.getEmail(), e.getMessage());
            throw new RuntimeException("Failed to send welcome email", e);
        }
    }

    public void sendPasteExpiringEmail(PasteExpiringEvent event) {
        if (!isMailConfigured()) {
            log.warn("Mail not configured — skipping expiring email for paste: {}", event.getPasteId());
            return;
        }

        Context ctx = new Context();
        ctx.setVariable("email", event.getAuthorEmail());
        ctx.setVariable("pasteTitle",
                event.getTitle() != null && !event.getTitle().isBlank()
                        ? event.getTitle() : event.getShortLink());
        ctx.setVariable("pasteUrl", baseUrl + "/p/" + event.getShortLink());
        ctx.setVariable("expiresAt", event.getExpiresAt());

        String html = templateEngine.process("paste-expiring", ctx);

        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(event.getAuthorEmail());
            helper.setSubject("Your paste expires soon");
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Paste expiring email sent for paste: {}", event.getPasteId());
        } catch (MessagingException e) {
            log.error("Failed to send paste expiring email for {}: {}", event.getPasteId(), e.getMessage());
            throw new RuntimeException("Failed to send paste expiring email", e);
        }
    }

    private boolean isMailConfigured() {
        return mailUsername != null && !mailUsername.isBlank();
    }
}
