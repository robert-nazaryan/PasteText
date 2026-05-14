package com.example.pasteapi.service;

import com.example.pasteapi.dto.PasteCreateRequest;
import com.example.pasteapi.dto.PasteResponse;
import com.example.pasteapi.dto.PasteSearchRequest;
import com.example.pasteapi.entity.Paste;
import com.example.pasteapi.entity.Tag;
import com.example.pasteapi.entity.User;
import com.example.pasteapi.exception.InvalidPasswordException;
import com.example.pasteapi.exception.PasteExpiredException;
import com.example.pasteapi.exception.ResourceNotFoundException;
import com.example.pasteapi.kafka.PasteKafkaProducer;
import com.example.pasteapi.mapper.PasteMapper;
import com.example.pasteapi.repository.CategoryRepository;
import com.example.pasteapi.repository.PasteRepository;
import com.example.pasteapi.repository.TagRepository;
import com.example.pasteapi.repository.UserRepository;
import com.example.pasteapi.search.PastePageableBuilder;
import com.example.pasteapi.util.ShortLinkGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.example.pasteapi.search.PasteSpecifications.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasteService {

    private final PasteRepository pasteRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final ShortLinkGenerator shortLinkGenerator;
    private final PasswordEncoder passwordEncoder;
    private final PasteKafkaProducer kafkaProducer;
    private final PastePageableBuilder pageableBuilder;
    private final PasteMapper pasteMapper;

    @Transactional
    public PasteResponse create(PasteCreateRequest req, String username) {
        User author = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Paste paste = buildPaste(req, author);
        Paste saved = pasteRepository.save(paste);

        kafkaProducer.sendPasteCreated(saved);
        log.info("Paste created: {}", saved.getShortLink());

        return pasteMapper.toResponse(saved);
    }

    @Transactional
    public PasteResponse getByShortLink(String shortLink, String rawPassword) {
        Paste paste = pasteRepository.findByShortLink(shortLink)
                .orElseThrow(() -> new ResourceNotFoundException("Paste not found"));

        if (paste.isExpired()) {
            throw new PasteExpiredException("Paste has expired");
        }

        if (paste.hasPassword()) {
            if (rawPassword == null ||
                    !passwordEncoder.matches(rawPassword, paste.getPassword())) {
                throw new InvalidPasswordException("Invalid or missing password");
            }
        }

        pasteRepository.incrementViewsBy(paste.getId(), 1);
        return pasteMapper.toResponse(paste);
    }

    @Transactional
    public PasteResponse update(UUID id, PasteCreateRequest req, String username) {
        Paste paste = pasteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paste not found"));

        if (!paste.getAuthor().getUsername().equals(username)) {
            throw new AccessDeniedException("Not your paste");
        }

        applyUpdates(paste, req);
        Paste saved = pasteRepository.save(paste);
        return pasteMapper.toResponse(saved);
    }

    @Transactional
    public void delete(UUID id, String username, String role) {
        Paste paste = pasteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paste not found"));

        boolean isOwner = paste.getAuthor().getUsername().equals(username);
        boolean isAdmin = "ADMIN".equals(role);

        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("Not allowed");
        }

        pasteRepository.delete(paste);
        log.info("Paste deleted: {} by {}", paste.getShortLink(), username);
    }

    @Transactional(readOnly = true)
    public Page<PasteResponse> search(PasteSearchRequest filter,
                                      int page, int size,
                                      boolean isAuthenticated,
                                      String currentUsername) {
        Pageable pageable = pageableBuilder.build(filter, page, size);

        boolean forcePublic = !isAuthenticated ||
                Boolean.TRUE.equals(filter.getPublicOnly());

        Specification<Paste> spec = Specification
                .where(notExpired())
                .and(forcePublic ? isPublic() : null)
                .and(keywordMatches(filter.getKeyword()))
                .and(hasCategory(filter.getCategoryId()))
                .and(hasTag(filter.getTag()))
                .and(hasAuthor(filter.getAuthorUsername()))
                .and(createdBetween(filter.getCreatedFrom(), filter.getCreatedTo()));

        return pasteRepository.findAll(spec, pageable)
                .map(pasteMapper::toPreview);
    }

    private Paste buildPaste(PasteCreateRequest req, User author) {
        Paste paste = new Paste();
        paste.setTitle(req.getTitle());
        paste.setContent(req.getContent());
        paste.setPublic(req.isPublic());
        paste.setExpiresAt(req.getExpiresAt());
        paste.setShortLink(shortLinkGenerator.generate());
        paste.setAuthor(author);

        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            paste.setPassword(passwordEncoder.encode(req.getPassword()));
        }
        if (req.getCategoryId() != null) {
            paste.setCategory(categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found")));
        }
        paste.setTags(resolveOrCreateTags(req.getTags()));
        return paste;
    }

    private void applyUpdates(Paste paste, PasteCreateRequest req) {
        paste.setTitle(req.getTitle());
        paste.setContent(req.getContent());
        paste.setPublic(req.isPublic());
        paste.setExpiresAt(req.getExpiresAt());
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            paste.setPassword(passwordEncoder.encode(req.getPassword()));
        }
        if (req.getCategoryId() != null) {
            paste.setCategory(categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found")));
        }
        paste.setTags(resolveOrCreateTags(req.getTags()));
    }

    private Set<Tag> resolveOrCreateTags(Set<String> names) {
        if (names == null || names.isEmpty()) return new HashSet<>();
        return names.stream()
                .map(name -> tagRepository.findByName(name)
                        .orElseGet(() -> tagRepository.save(new Tag(name))))
                .collect(Collectors.toSet());
    }
}
