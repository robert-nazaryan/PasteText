package com.example.pasteapi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasteExpiringEvent {
    private String        pasteId;
    private String        shortLink;
    private String        title;
    private String        authorEmail;
    private LocalDateTime expiresAt;
}
