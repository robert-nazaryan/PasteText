package com.example.pasteapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AdminUserResponse {
    private UUID id;
    private String        username;
    private String        email;
    private String        role;
    private long          pasteCount;
    private LocalDateTime createdAt;
}
