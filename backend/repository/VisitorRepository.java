package com.athiestate.repository;

import com.athiestate.models.Visitor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VisitorRepository extends JpaRepository<Visitor, Long> {
    List<Visitor> findByStatus(String status);
    List<Visitor> findByResidentID(Long residentID);
}
