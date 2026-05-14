package com.example.pasteapi.search;

import com.example.pasteapi.dto.PasteSearchRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class PastePageableBuilder {

    private static final Set<String> ALLOWED_SORT_FIELDS =
            Set.of("views", "createdAt", "title");

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE     = 100;

    public Pageable build(PasteSearchRequest filter, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        if (safeSize == 0) safeSize = DEFAULT_PAGE_SIZE;

        String sortField = ALLOWED_SORT_FIELDS.contains(filter.getSortBy())
                ? filter.getSortBy()
                : "createdAt";

        Sort.Direction direction = "asc".equalsIgnoreCase(filter.getSortDir())
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        return PageRequest.of(page, safeSize, Sort.by(direction, sortField));
    }
}
