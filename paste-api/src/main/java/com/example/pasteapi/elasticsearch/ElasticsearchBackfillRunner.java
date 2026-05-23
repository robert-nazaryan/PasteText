package com.example.pasteapi.elasticsearch;

import com.example.pasteapi.entity.Paste;
import com.example.pasteapi.repository.PasteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ElasticsearchBackfillRunner implements ApplicationRunner {

    private final PasteRepository pasteRepository;
    private final PasteSearchRepository searchRepository;
    private final ElasticsearchPasteSearchService searchService;
    private final ElasticsearchOperations operations;

    @Override
    @Transactional(readOnly = true)
    public void run(ApplicationArguments args) {
        if (!searchService.isEnabled()) {
            log.info("Elasticsearch disabled — skipping backfill");
            return;
        }

        try {
            IndexOperations indexOps = operations.indexOps(PasteDocument.class);
            if (!indexOps.exists()) {
                indexOps.createWithMapping();
                log.info("Created Elasticsearch index 'pastes'");
            }
        } catch (Exception e) {
            log.warn("Failed to ensure 'pastes' index exists: {}", e.getMessage());
            return;
        }

        long dbCount;
        long indexCount;
        try {
            dbCount = pasteRepository.count();
            indexCount = searchRepository.count();
        } catch (Exception e) {
            log.warn("Backfill aborted — could not read counts: {}", e.getMessage());
            return;
        }

        if (indexCount >= dbCount) {
            log.info("Elasticsearch already has {}/{} pastes — skipping backfill", indexCount, dbCount);
            return;
        }

        log.info("Backfilling Elasticsearch from DB ({} pastes total, {} currently indexed)...",
                dbCount, indexCount);

        int batchSize = 500;
        int pageNumber = 0;
        long indexed = 0;
        while (true) {
            List<Paste> batch = pasteRepository.findAll(
                    org.springframework.data.domain.PageRequest.of(pageNumber, batchSize)
            ).getContent();
            if (batch.isEmpty()) break;

            for (Paste p : batch) {
                searchService.index(p);
                indexed++;
            }
            pageNumber++;
        }

        log.info("Elasticsearch backfill complete — indexed {} pastes", indexed);
    }
}
