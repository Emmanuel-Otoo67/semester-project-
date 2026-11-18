package com.libtrack.catalog;

import com.libtrack.audit.data.AuditRepository;
import com.libtrack.catalog.data.CatalogRepository;
import com.libtrack.catalog.service.CatalogService;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CatalogServiceTest {
    private final CatalogRepository repository=mock(CatalogRepository.class);
    private final CatalogService service=new CatalogService(repository,mock(AuditRepository.class));

    @Test void boundsSearchPageSize(){
        var error=assertThrows(IllegalArgumentException.class,()->service.list("",0,101));
        assertTrue(error.getMessage().contains("1 and 100"));
        verifyNoInteractions(repository);
    }

    @Test void rejectsNegativePageNumber(){assertThrows(IllegalArgumentException.class,()->service.list("book",-1,25));verifyNoInteractions(repository);}
}
