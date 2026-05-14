package com.example.pasteapi.controller;

import com.example.pasteapi.dto.PasteCreateRequest;
import com.example.pasteapi.dto.PasteResponse;
import com.example.pasteapi.dto.PasteSearchRequest;
import com.example.pasteapi.service.PasteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pastes")
@RequiredArgsConstructor
@Tag(name = "Pastes", description = "Paste CRUD")
public class PasteController {

    private final PasteService pasteService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PasteResponse> create(
            @Valid @RequestBody PasteCreateRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pasteService.create(req, user.getUsername()));
    }

    @GetMapping("/{shortLink}")
    public ResponseEntity<PasteResponse> getByShortLink(
            @PathVariable String shortLink,
            @RequestHeader(value = "X-Paste-Password", required = false) String password) {
        return ResponseEntity.ok(pasteService.getByShortLink(shortLink, password));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PasteResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody PasteCreateRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(pasteService.update(id, req, user.getUsername()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        pasteService.delete(id, user.getUsername(),
                user.getAuthorities().stream().findFirst()
                        .map(a -> a.getAuthority().replace("ROLE_", "")).orElse(""));
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @Operation(summary = "Search pastes with filters")
    public ResponseEntity<Page<PasteResponse>> search(
            @ModelAttribute @Valid PasteSearchRequest filter,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails user) {

        boolean authenticated = user != null;
        String  username      = authenticated ? user.getUsername() : null;

        return ResponseEntity.ok(
                pasteService.search(filter, page, size, authenticated, username)
        );
    }
}
