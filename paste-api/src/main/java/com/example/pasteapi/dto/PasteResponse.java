package com.example.pasteapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
public class PasteResponse {
    private UUID            id;
    private String          title;
    private String          content;
    private String          shortLink;
    private boolean         isPublic;
    private boolean         passwordProtected;
    private String          category;
    private Set<String>     tags;
    private long            views;
    private String          authorEmail;
    private LocalDateTime   expiresAt;
    private LocalDateTime   createdAt;
}
