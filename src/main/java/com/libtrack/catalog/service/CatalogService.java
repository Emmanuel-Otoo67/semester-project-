package com.libtrack.catalog.service;

import com.libtrack.audit.data.AuditRepository;
import com.libtrack.catalog.api.BookRequest;
import com.libtrack.catalog.api.BookSummary;
import com.libtrack.catalog.api.CatalogNotFoundException;
import com.libtrack.catalog.data.CatalogRepository;
import com.libtrack.platform.api.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CatalogService {
    private final CatalogRepository repository;
    private final AuditRepository audit;
    public CatalogService(CatalogRepository repository, AuditRepository audit) { this.repository=repository; this.audit=audit; }
    public PageResult<BookSummary> list(String query, int page, int size) {
        checkPage(page,size); return repository.list(query == null ? "" : query, page, size);
    }
    public BookSummary get(UUID id) { BookSummary book=repository.get(id); if (book==null) throw new CatalogNotFoundException("Book not found."); return book; }
    @Transactional public BookSummary create(BookRequest request, UUID actor) {
        UUID id=repository.create(request); audit.record(actor,"BOOK_CREATED","BOOK",id); return get(id);
    }
    @Transactional public BookSummary update(UUID id, BookRequest request, UUID actor) {
        repository.update(id,request); audit.record(actor,"BOOK_UPDATED","BOOK",id); return get(id);
    }
    @Transactional public Map<String,Object> addCopy(UUID bookId, String barcode, UUID actor) {
        UUID id=repository.addCopy(bookId,barcode); audit.record(actor,"COPY_ADDED","BOOK_COPY",id);
        return Map.of("id",id,"barcode",barcode.trim(),"status","AVAILABLE");
    }
    public List<Map<String,Object>> copies(UUID bookId) { return repository.copies(bookId); }
    private static void checkPage(int page,int size) { if(page<0||size<1||size>100) throw new IllegalArgumentException("Page must be zero or greater and size must be between 1 and 100."); }
}
