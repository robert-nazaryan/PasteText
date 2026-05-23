package com.example.pasteapi.elasticsearch;

import com.example.pasteapi.dto.PasteSearchRequest;
import com.example.pasteapi.entity.Paste;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Query;
import org.springframework.stereotype.Service;

import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.QueryBuilders;
import co.elastic.clients.json.JsonData;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ElasticsearchPasteSearchService {

    private static final DateTimeFormatter ES_DATE =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final PasteSearchRepository repository;
    private final ElasticsearchOperations operations;

    @Value("${app.elasticsearch.enabled:true}")
    private boolean enabled;

    public boolean isEnabled() {
        return enabled;
    }

    public void index(Paste paste) {
        if (!enabled) return;
        try {
            repository.save(PasteDocument.from(paste));
            log.debug("Indexed paste {} into Elasticsearch", paste.getId());
        } catch (Exception e) {
            log.warn("Failed to index paste {} into Elasticsearch: {}", paste.getId(), e.getMessage());
        }
    }

    public void delete(UUID pasteId) {
        if (!enabled) return;
        try {
            repository.deleteById(pasteId.toString());
            log.debug("Removed paste {} from Elasticsearch", pasteId);
        } catch (Exception e) {
            log.warn("Failed to delete paste {} from Elasticsearch: {}", pasteId, e.getMessage());
        }
    }

    public void deleteAll(Collection<UUID> pasteIds) {
        if (!enabled || pasteIds == null || pasteIds.isEmpty()) return;
        for (UUID id : pasteIds) {
            delete(id);
        }
    }

    public Page<UUID> searchIds(PasteSearchRequest filter,
                                boolean forcePublic,
                                Pageable pageable) {
        if (!enabled) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        BoolQuery.Builder bool = new BoolQuery.Builder();

        String keyword = filter.getKeyword();
        if (keyword != null && !keyword.isBlank()) {
            bool.must(m -> m.multiMatch(mm -> mm
                    .query(keyword)
                    .fields("title^3", "content")
                    .fuzziness("AUTO")));
        } else {
            bool.must(QueryBuilders.matchAll().build()._toQuery());
        }

        if (forcePublic) {
            bool.filter(f -> f.term(t -> t.field("isPublic").value(true)));
        }

        if (filter.getCategoryId() != null) {
            int categoryId = filter.getCategoryId();
            bool.filter(f -> f.term(t -> t.field("categoryId").value(categoryId)));
        }

        if (filter.getTag() != null && !filter.getTag().isBlank()) {
            String tag = filter.getTag();
            bool.filter(f -> f.term(t -> t.field("tags").value(tag)));
        }

        if (filter.getAuthorEmail() != null && !filter.getAuthorEmail().isBlank()) {
            String email = filter.getAuthorEmail();
            bool.filter(f -> f.term(t -> t.field("authorEmail").value(email)));
        }

        String nowStr = LocalDateTime.now().format(ES_DATE);
        bool.filter(f -> f.bool(b -> b
                .should(s -> s.bool(bb -> bb.mustNot(mn -> mn.exists(e -> e.field("expiresAt")))))
                .should(s -> s.range(r -> r.field("expiresAt").gt(JsonData.of(nowStr))))
                .minimumShouldMatch("1")));

        if (filter.getCreatedFrom() != null || filter.getCreatedTo() != null) {
            String from = filter.getCreatedFrom() != null
                    ? filter.getCreatedFrom().format(ES_DATE) : null;
            String to = filter.getCreatedTo() != null
                    ? filter.getCreatedTo().format(ES_DATE) : null;
            bool.filter(f -> f.range(r -> {
                r.field("createdAt");
                if (from != null) r.gte(JsonData.of(from));
                if (to != null) r.lte(JsonData.of(to));
                return r;
            }));
        }

        Pageable esPageable = translateSort(pageable);
        Query query = NativeQuery.builder()
                .withQuery(q -> q.bool(bool.build()))
                .withPageable(esPageable)
                .build();

        SearchHits<PasteDocument> hits = operations.search(query, PasteDocument.class);

        List<UUID> ids = hits.getSearchHits().stream()
                .map(h -> UUID.fromString(h.getContent().getId()))
                .toList();

        return new PageImpl<>(ids, pageable, hits.getTotalHits());
    }

    private Pageable translateSort(Pageable in) {
        if (in.getSort().isUnsorted()) return in;
        List<Sort.Order> orders = new ArrayList<>();
        for (Sort.Order o : in.getSort()) {
            String prop = "title".equals(o.getProperty()) ? "title.keyword" : o.getProperty();
            orders.add(new Sort.Order(o.getDirection(), prop));
        }
        return PageRequest.of(in.getPageNumber(), in.getPageSize(), Sort.by(orders));
    }
}
