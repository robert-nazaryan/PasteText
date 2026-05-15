package com.example.pasteapi.mapper;

import com.example.pasteapi.dto.AdminPasteResponse;
import com.example.pasteapi.dto.AdminUserResponse;
import com.example.pasteapi.entity.Paste;
import com.example.pasteapi.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AdminMapper {

    @Mapping(target = "role", expression = "java(user.getRole().name())")
    @Mapping(target = "pasteCount", ignore = true)
    AdminUserResponse toUserResponseInternal(User user);

    default AdminUserResponse toUserResponse(User user, long pasteCount) {
        AdminUserResponse response = toUserResponseInternal(user);
        return response.builder().pasteCount(pasteCount).build();
    }

    @Mapping(target = "passwordProtected", expression = "java(paste.hasPassword())")
    @Mapping(target = "authorEmail", expression = "java(paste.getAuthor() != null ? paste.getAuthor().getEmail() : null)")
    @Mapping(target = "category", expression = "java(paste.getCategory() != null ? paste.getCategory().getName() : null)")
    @Mapping(target = "tags", expression = "java(paste.getTags().stream().map(com.example.pasteapi.entity.Tag::getName).collect(java.util.stream.Collectors.toSet()))")
    AdminPasteResponse toPasteResponse(Paste paste);
}
