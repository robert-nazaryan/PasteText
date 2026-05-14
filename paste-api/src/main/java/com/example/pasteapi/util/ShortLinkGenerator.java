package com.example.pasteapi.util;

import com.example.pasteapi.repository.PasteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
@RequiredArgsConstructor
@Slf4j
public class ShortLinkGenerator {

    private static final String ALPHABET =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int LENGTH       = 8;
    private static final int MAX_ATTEMPTS = 10;

    private final PasteRepository pasteRepository;
    private final SecureRandom random = new SecureRandom();

    public String generate() {
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            String candidate = randomBase62();
            if (!pasteRepository.existsByShortLink(candidate)) {
                log.debug("Short link generated in {} attempt(s): {}", attempt, candidate);
                return candidate;
            }
            log.warn("Short link collision on attempt {}: {}", attempt, candidate);
        }
        throw new IllegalStateException(
                "Failed to generate unique short link after " + MAX_ATTEMPTS + " attempts");
    }

    private String randomBase62() {
        StringBuilder sb = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
