package com.example.pasteapi.service;

import com.example.pasteapi.constants.Role;
import com.example.pasteapi.dto.*;
import com.example.pasteapi.entity.Paste;
import com.example.pasteapi.entity.User;
import com.example.pasteapi.exception.ConflictException;
import com.example.pasteapi.exception.ResourceNotFoundException;
import com.example.pasteapi.mapper.AdminMapper;
import com.example.pasteapi.repository.PasteRepository;
import com.example.pasteapi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final PasteRepository pasteRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminMapper adminMapper;

    @Transactional(readOnly = true)
    public Page<AdminUserResponse> getUsers(AdminSearchRequest filter,
                                            int page, int size) {
        Pageable pageable = buildPageable(filter.getSortBy(),
                filter.getSortDir(), page, size,
                Set.of("username", "email", "createdAt"));

        Role roleFilter = filter.getRole() != null
                ? Role.valueOf(filter.getRole()) : null;

        return userRepository.findWithFilters(
                        filter.getKeyword(),
                        roleFilter,
                        filter.getCreatedFrom(),
                        filter.getCreatedTo(),
                        pageable)
                .map(user -> {
                    long count = userRepository.countPastesByUserId(user.getId());
                    return adminMapper.toUserResponse(user, count);
                });
    }

    @Transactional(readOnly = true)
    public AdminUserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        long count = userRepository.countPastesByUserId(id);
        return adminMapper.toUserResponse(user, count);
    }

    @Transactional
    public AdminUserResponse updateUser(UUID id, AdminUpdateUserRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (req.getUsername() != null && !req.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(req.getUsername())) {
                throw new ConflictException("Username already taken");
            }
            log.info("Admin changed username: {} → {}", user.getUsername(), req.getUsername());
            user.setUsername(req.getUsername());
        }

        if (req.getEmail() != null && !req.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(req.getEmail())) {
                throw new ConflictException("Email already registered");
            }
            user.setEmail(req.getEmail());
        }

        if (req.getRole() != null) {
            Role newRole = Role.valueOf(req.getRole());
            if (newRole != user.getRole()) {
                log.warn("Admin changed role: {} {} → {}",
                        user.getUsername(), user.getRole(), newRole);
            }
            user.setRole(newRole);
        }

        User saved = userRepository.save(user);
        long count = userRepository.countPastesByUserId(id);
        return adminMapper.toUserResponse(saved, count);
    }

    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        userRepository.delete(user);
        log.warn("Admin deleted user: {} ({})", user.getUsername(), id);
    }

    @Transactional(readOnly = true)
    public Page<AdminPasteResponse> getPastes(String keyword,
                                              UUID authorId,
                                              int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        return pasteRepository
                .findAllForAdmin(keyword, authorId, pageable)
                .map(adminMapper::toPasteResponse);
    }

    @Transactional(readOnly = true)
    public AdminPasteResponse getPasteById(UUID id) {
        Paste paste = pasteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paste not found"));
        return adminMapper.toPasteResponse(paste);
    }

    @Transactional
    public void deletePaste(UUID id) {
        Paste paste = pasteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paste not found"));

        pasteRepository.delete(paste);
        log.warn("Admin force-deleted paste: {} ({})", paste.getShortLink(), id);
    }

    @Transactional
    public BulkDeleteResult bulkDeletePastes(List<UUID> ids) {
        int deleted = pasteRepository.deleteByIdIn(ids);
        log.warn("Admin bulk-deleted {} pastes", deleted);
        return new BulkDeleteResult(deleted, ids.size() - deleted);
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        return AdminStatsResponse.builder()
                .totalUsers(userRepository.count())
                .totalPastes(pasteRepository.count())
                .publicPastes(pasteRepository.countPublic())
                .privatePastes(pasteRepository.countPrivate())
                .passwordProtectedPastes(pasteRepository.countPasswordProtected())
                .expiredPastes(pasteRepository.countExpired(LocalDateTime.now()))
                .totalViews(pasteRepository.sumAllViews())
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private Pageable buildPageable(String sortBy, String sortDir,
                                   int page, int size,
                                   Set<String> allowedFields) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        String field = allowedFields.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction dir = "asc".equalsIgnoreCase(sortDir)
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(page, safeSize, Sort.by(dir, field));
    }

    public record BulkDeleteResult(int deleted, int notFound) {}
}
