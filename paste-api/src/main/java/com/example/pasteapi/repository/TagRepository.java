package com.example.pasteapi.repository;

import com.example.pasteapi.entity.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface TagRepository extends JpaRepository<Tag, Integer> {
    Optional<Tag> findByName(String name);

    List<Tag> findByNameIn(Set<String> names);

    @Query("SELECT t FROM Tag t JOIN t.pastes p GROUP BY t ORDER BY COUNT(p) DESC")
    List<Tag> findTopTags(Pageable pageable);
}
