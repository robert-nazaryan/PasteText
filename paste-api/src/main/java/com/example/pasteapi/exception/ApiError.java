package com.example.pasteapi.exception;

import java.time.LocalDateTime;
import java.util.Map;

public record ApiError(
        int status,
        String error,
        String message,
        Map<String, String> fieldErrors,
        LocalDateTime timestamp
) {}
