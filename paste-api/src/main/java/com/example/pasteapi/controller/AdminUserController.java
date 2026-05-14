package com.example.pasteapi.controller;

import com.example.pasteapi.dto.AdminSearchRequest;
import com.example.pasteapi.dto.AdminStatsResponse;
import com.example.pasteapi.dto.AdminUpdateUserRequest;
import com.example.pasteapi.dto.AdminUserResponse;
import com.example.pasteapi.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin — Users", description = "User management (ADMIN only)")
public class AdminUserController {

    private final AdminService adminService;

    @GetMapping
    @Operation(summary = "List all users with filters")
    public ResponseEntity<Page<AdminUserResponse>> getUsers(
            @ModelAttribute @Valid AdminSearchRequest filter,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getUsers(filter, page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<AdminUserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getUserById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update user (username / email / role)")
    public ResponseEntity<AdminUserResponse> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody AdminUpdateUserRequest req) {
        return ResponseEntity.ok(adminService.updateUser(id, req));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete user and all their pastes")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    @Operation(summary = "Platform-wide statistics")
    public ResponseEntity<AdminStatsResponse> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }
}
