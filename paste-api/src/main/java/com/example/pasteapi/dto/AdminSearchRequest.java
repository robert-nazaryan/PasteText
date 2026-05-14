package com.example.pasteapi.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AdminSearchRequest {

    @Size(max = 200)
    private String keyword;

    private String role;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdFrom;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdTo;

    @Pattern(regexp = "^(username|email|createdAt|pasteCount)$",
            message = "sortBy must be one of: username, email, createdAt, pasteCount")
    private String sortBy = "createdAt";

    @Pattern(regexp = "^(asc|desc)$")
    private String sortDir = "desc";
}

