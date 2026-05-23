package com.example.pasteapi.elasticsearch;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PasteSearchRepository
        extends ElasticsearchRepository<PasteDocument, String> {
}
