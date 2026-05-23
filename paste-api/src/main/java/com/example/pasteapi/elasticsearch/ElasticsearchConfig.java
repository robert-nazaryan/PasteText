package com.example.pasteapi.elasticsearch;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;

@Configuration
@EnableElasticsearchRepositories(basePackages = "com.example.pasteapi.elasticsearch")
public class ElasticsearchConfig {
}
