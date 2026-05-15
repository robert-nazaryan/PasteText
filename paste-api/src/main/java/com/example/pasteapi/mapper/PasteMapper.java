package com.example.pasteapi.mapper;

import com.example.pasteapi.dto.PasteResponse;
import com.example.pasteapi.entity.Paste;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface PasteMapper {

    @Mapping(target = "content", expression = "java(paste.hasPassword() ? null : paste.getContent())")
    @Mapping(target = "passwordProtected", expression = "java(paste.hasPassword())")
    @Mapping(target = "authorEmail", expression = "java(paste.getAuthor() != null ? paste.getAuthor().getEmail() : null)")
    @Mapping(target = "category", expression = "java(paste.getCategory() != null ? paste.getCategory().getName() : null)")
    @Mapping(target = "tags", expression = "java(paste.getTags().stream().map(com.example.pasteapi.entity.Tag::getName).collect(java.util.stream.Collectors.toSet()))")
    PasteResponse toResponse(Paste paste);

    @Mapping(target = "content", constant = "null")
    @Mapping(target = "passwordProtected", expression = "java(paste.hasPassword())")
    @Mapping(target = "authorEmail", expression = "java(paste.getAuthor() != null ? paste.getAuthor().getEmail() : null)")
    @Mapping(target = "category", expression = "java(paste.getCategory() != null ? paste.getCategory().getName() : null)")
    @Mapping(target = "tags", expression = "java(paste.getTags().stream().map(com.example.pasteapi.entity.Tag::getName).collect(java.util.stream.Collectors.toSet()))")
    PasteResponse toPreview(Paste paste);
}
