package com.example.pasteapi.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
public class PasteCreateRequest {

    @Size(max = 255, message = "Title must be at most 255 characters")
    private String title;

    @NotBlank(message = "Content is required")
    @Size(max = 1_000_000, message = "Content must be at most 1,000,000 characters")
    private String content;

    private boolean isPublic = true;

    @Size(max = 72, message = "Password must be at most 72 characters")
    private String password;

    private Integer categoryId;

    private Set<String> tags = new HashSet<>();

    @Future(message = "Expiration must be in the future")
    private LocalDateTime expiresAt;
}
