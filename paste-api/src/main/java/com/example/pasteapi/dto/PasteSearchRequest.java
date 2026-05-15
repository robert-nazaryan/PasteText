package com.example.pasteapi.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PasteSearchRequest {

    @Size(max = 200)
    private String keyword;

    private Integer categoryId;

    @Size(max = 50)
    private String tag;

    @Size(max = 100)
    private String authorEmail;

    private Boolean publicOnly = true;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdFrom;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdTo;

    @Pattern(regexp = "^(views|createdAt|title)$",
            message = "sortBy must be one of: views, createdAt, title")
    private String sortBy = "createdAt";

    @Pattern(regexp = "^(asc|desc)$",
            message = "sortDir must be asc or desc")
    private String sortDir = "desc";
}
