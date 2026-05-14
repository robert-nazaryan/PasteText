package com.example.pasteapi.controller;

import com.example.pasteapi.dto.AdminPasteResponse;
import com.example.pasteapi.dto.BulkDeleteRequest;
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
@RequestMapping("/api/v1/admin/pastes")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin — Pastes", description = "Paste management (ADMIN only)")
public class AdminPasteController {

    private final AdminService adminService;

    @GetMapping
    @Operation(summary = "List all pastes (including private)")
    public ResponseEntity<Page<AdminPasteResponse>> getPastes(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID authorId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                adminService.getPastes(keyword, authorId, page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get paste by ID (with content)")
    public ResponseEntity<AdminPasteResponse> getPasteById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getPasteById(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Force delete paste")
    public ResponseEntity<Void> deletePaste(@PathVariable UUID id) {
        adminService.deletePaste(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bulk")
    @Operation(summary = "Bulk delete pastes by IDs (max 100)")
    public ResponseEntity<AdminService.BulkDeleteResult> bulkDelete(
            @Valid @RequestBody BulkDeleteRequest req) {
        return ResponseEntity.ok(adminService.bulkDeletePastes(req.getIds()));
    }
}
