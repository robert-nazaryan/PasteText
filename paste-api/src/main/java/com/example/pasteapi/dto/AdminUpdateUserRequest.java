package com.example.pasteapi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminUpdateUserRequest {

    @Size(min = 3, max = 50)
    @Pattern(regexp = "^[a-zA-Z0-9_]+$",
            message = "Only letters, digits and underscore")
    private String username;

    @Email
    private String email;

    @Pattern(regexp = "^(USER|ADMIN)$",
            message = "Role must be USER or ADMIN")
    private String role;
}
