package com.example.pasteapi.search;

import com.example.pasteapi.entity.Paste;
import com.example.pasteapi.entity.Tag;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public class PasteSpecifications {

    private PasteSpecifications() {}

    public static Specification<Paste> isPublic() {
        return (root, query, cb) ->
                cb.isTrue(root.get("isPublic"));
    }

    public static Specification<Paste> notExpired() {
        return (root, query, cb) ->
                cb.or(
                        cb.isNull(root.get("expiresAt")),
                        cb.greaterThan(root.get("expiresAt"), LocalDateTime.now())
                );
    }

    public static Specification<Paste> keywordMatches(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) return null;
            String pattern = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("title")),   pattern),
                    cb.like(cb.lower(root.get("content")), pattern)
            );
        };
    }

    public static Specification<Paste> hasCategory(Integer categoryId) {
        return (root, query, cb) -> {
            if (categoryId == null) return null;
            return cb.equal(root.get("category").get("id"), categoryId);
        };
    }

    public static Specification<Paste> hasTag(String tagName) {
        return (root, query, cb) -> {
            if (tagName == null || tagName.isBlank()) return null;
            Join<Paste, Tag> tags = root.join("tags", JoinType.INNER);
            query.distinct(true);
            return cb.equal(cb.lower(tags.get("name")), tagName.toLowerCase());
        };
    }

    public static Specification<Paste> hasAuthor(String email) {
        return (root, query, cb) -> {
            if (email == null || email.isBlank()) return null;
            return cb.equal(root.get("author").get("email"), email);
        };
    }

    public static Specification<Paste> createdBetween(LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            if (from == null && to == null) return null;
            if (from == null) return cb.lessThanOrEqualTo(root.get("createdAt"), to);
            if (to == null)   return cb.greaterThanOrEqualTo(root.get("createdAt"), from);
            return cb.between(root.get("createdAt"), from, to);
        };
    }
}
