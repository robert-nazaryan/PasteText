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

    @Size(max = 255)
    private String title;

    @NotBlank
    private String content;

    private boolean isPublic = true;

    private String password;

    private Integer categoryId;

    private Set<String> tags = new HashSet<>();

    @Future
    private LocalDateTime expiresAt;
}
