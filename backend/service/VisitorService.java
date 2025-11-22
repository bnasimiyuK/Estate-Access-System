package com.athiestate.service;

import com.athiestate.models.Visitor;
import com.athiestate.repository.VisitorRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class VisitorService {

    private final VisitorRepository visitorRepository;

    public VisitorService(VisitorRepository visitorRepository) {
        this.visitorRepository = visitorRepository;
    }

    public Visitor preapproveVisitor(Visitor visitor) {
        visitor.setStatus("Pending");
        return visitorRepository.save(visitor);
    }

    public List<Visitor> getPendingVisitors() {
        return visitorRepository.findByStatus("Pending");
    }

    public void approveVisitor(Long id) {
        Visitor visitor = visitorRepository.findById(id).orElseThrow();
        visitor.setStatus("Approved");
        visitorRepository.save(visitor);
    }

    public void rejectVisitor(Long id) {
        Visitor visitor = visitorRepository.findById(id).orElseThrow();
        visitor.setStatus("Rejected");
        visitorRepository.save(visitor);
    }
}
