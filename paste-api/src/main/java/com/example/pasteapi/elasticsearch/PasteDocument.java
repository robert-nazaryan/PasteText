package com.example.pasteapi.elasticsearch;

import com.example.pasteapi.entity.Paste;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.DateFormat;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.InnerField;
import org.springframework.data.elasticsearch.annotations.MultiField;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(indexName = "pastes")
public class PasteDocument {

    @Id
    private String id;

    @MultiField(
            mainField = @Field(type = FieldType.Text, analyzer = "standard"),
            otherFields = {
                    @InnerField(suffix = "keyword", type = FieldType.Keyword, ignoreAbove = 256)
            }
    )
    private String title;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String content;

    @Field(type = FieldType.Keyword)
    private String shortLink;

    @Field(type = FieldType.Boolean)
    private boolean isPublic;

    @Field(type = FieldType.Keyword)
    private String authorEmail;

    @Field(type = FieldType.Integer)
    private Integer categoryId;

    @Field(type = FieldType.Keyword)
    private Set<String> tags;

    @Field(type = FieldType.Long)
    private long views;

    @Field(type = FieldType.Date, format = DateFormat.date_hour_minute_second)
    private LocalDateTime createdAt;

    @Field(type = FieldType.Date, format = DateFormat.date_hour_minute_second)
    private LocalDateTime expiresAt;

    public static PasteDocument from(Paste paste) {
        return PasteDocument.builder()
                .id(paste.getId().toString())
                .title(paste.getTitle())
                .content(paste.getContent())
                .shortLink(paste.getShortLink())
                .isPublic(paste.isPublic())
                .authorEmail(paste.getAuthor() != null ? paste.getAuthor().getEmail() : null)
                .categoryId(paste.getCategory() != null ? paste.getCategory().getId() : null)
                .tags(paste.getTags() == null
                        ? Set.of()
                        : paste.getTags().stream()
                                .map(t -> t.getName())
                                .collect(Collectors.toSet()))
                .views(paste.getViews())
                .createdAt(paste.getCreatedAt())
                .expiresAt(paste.getExpiresAt())
                .build();
    }

    public UUID asUuid() {
        return UUID.fromString(id);
    }
}
