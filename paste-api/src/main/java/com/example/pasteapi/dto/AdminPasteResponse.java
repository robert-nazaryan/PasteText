package com.example.pasteapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
public class AdminPasteResponse {
    private UUID            id;
    private String          title;
    private String          shortLink;
    private boolean         isPublic;
    private boolean         passwordProtected;
    private String          authorEmail;
    private String          category;
    private Set<String>     tags;
    private long            views;
    private LocalDateTime   expiresAt;
    private LocalDateTime   createdAt;
    private String          content;
}
