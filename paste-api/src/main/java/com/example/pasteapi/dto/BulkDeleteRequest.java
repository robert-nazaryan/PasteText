package com.example.pasteapi.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class BulkDeleteRequest {

    @NotEmpty(message = "At least one id is required")
    @Size(max = 100, message = "Max 100 IDs per request")
    private List<UUID> ids;
}
