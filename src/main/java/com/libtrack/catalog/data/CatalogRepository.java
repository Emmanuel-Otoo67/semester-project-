package com.libtrack.catalog.data;

import com.libtrack.catalog.api.BookRequest;
import com.libtrack.catalog.api.BookSummary;
import com.libtrack.catalog.api.CatalogNotFoundException;
import com.libtrack.platform.api.PageResult;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class CatalogRepository {
    private final JdbcTemplate jdbc;
    public CatalogRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public PageResult<BookSummary> list(String query, int page, int size) {
        String filter = "%" + query.trim() + "%";
        Long total = jdbc.queryForObject("select count(*) from books b where b.title ilike ? or coalesce(b.isbn,'') ilike ?", Long.class, filter, filter);
        List<BookSummary> items = jdbc.query("""
                select b.id,b.title,b.isbn,b.publisher,b.publication_year,
                  coalesce((select string_agg(distinct a.name, ', ' order by a.name) from book_authors ba join authors a on a.id=ba.author_id where ba.book_id=b.id),'') authors,
                  coalesce((select string_agg(distinct c.name, ', ' order by c.name) from book_categories bc join categories c on c.id=bc.category_id where bc.book_id=b.id),'') categories,
                  (select count(*) from book_copies cp where cp.book_id=b.id) copies,
                  (select count(*) from book_copies cp where cp.book_id=b.id and cp.status='AVAILABLE') available_copies
                from books b where b.title ilike ? or coalesce(b.isbn,'') ilike ?
                order by b.title limit ? offset ?
                """, (rs, row) -> new BookSummary(rs.getObject("id", UUID.class), rs.getString("title"),
                rs.getString("isbn"), rs.getString("publisher"), (Integer) rs.getObject("publication_year"),
                rs.getString("authors"), rs.getString("categories"), rs.getLong("copies"), rs.getLong("available_copies")),
                filter, filter, size, (long) page * size);
        return new PageResult<>(items, page, size, total == null ? 0 : total);
    }

    public BookSummary get(UUID id) {
        return jdbc.query("""
                select b.id,b.title,b.isbn,b.publisher,b.publication_year,
                  coalesce((select string_agg(distinct a.name, ', ' order by a.name) from book_authors ba join authors a on a.id=ba.author_id where ba.book_id=b.id),'') authors,
                  coalesce((select string_agg(distinct c.name, ', ' order by c.name) from book_categories bc join categories c on c.id=bc.category_id where bc.book_id=b.id),'') categories,
                  (select count(*) from book_copies cp where cp.book_id=b.id) copies,
                  (select count(*) from book_copies cp where cp.book_id=b.id and cp.status='AVAILABLE') available_copies
                from books b where b.id=?
                """, rs -> rs.next() ? new BookSummary(rs.getObject("id", UUID.class), rs.getString("title"),
                rs.getString("isbn"), rs.getString("publisher"), (Integer) rs.getObject("publication_year"),
                rs.getString("authors"), rs.getString("categories"), rs.getLong("copies"), rs.getLong("available_copies"))
                : null, id);
    }

    public UUID create(BookRequest request) {
        UUID id = jdbc.queryForObject("insert into books(title,isbn,publisher,publication_year,description) values (?,?,?,?,?) returning id",
                UUID.class, request.title().trim(), emptyToNull(request.isbn()), emptyToNull(request.publisher()), request.publicationYear(), request.description());
        linkNames(id, request.authors(), "authors", "book_authors", "author_id", "author_order");
        linkNames(id, request.categories(), "categories", "book_categories", "category_id", null);
        return id;
    }

    public void update(UUID id, BookRequest request) {
        int changed = jdbc.update("update books set title=?,isbn=?,publisher=?,publication_year=?,description=?,updated_at=now() where id=?",
                request.title().trim(), emptyToNull(request.isbn()), emptyToNull(request.publisher()), request.publicationYear(), request.description(), id);
        if (changed == 0) throw new CatalogNotFoundException("Book not found.");
        jdbc.update("delete from book_authors where book_id=?", id);
        jdbc.update("delete from book_categories where book_id=?", id);
        linkNames(id, request.authors(), "authors", "book_authors", "author_id", "author_order");
        linkNames(id, request.categories(), "categories", "book_categories", "category_id", null);
    }

    private void linkNames(UUID bookId, List<String> names, String lookupTable, String linkTable, String idColumn, String orderColumn) {
        if (names == null) return;
        int order = 0;
        for (String raw : names.stream().filter(name -> name != null && !name.isBlank()).distinct().toList()) {
            String name = raw.trim();
            UUID itemId = jdbc.queryForObject("insert into " + lookupTable + "(name) values (?) on conflict (name) do update set name=excluded.name returning id", UUID.class, name);
            if (orderColumn == null) jdbc.update("insert into " + linkTable + "(book_id," + idColumn + ") values (?,?)", bookId, itemId);
            else jdbc.update("insert into " + linkTable + "(book_id," + idColumn + "," + orderColumn + ") values (?,?,?)", bookId, itemId, ++order);
        }
    }

    public UUID addCopy(UUID bookId, String barcode) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from books where id=?)", Boolean.class, bookId)))
            throw new CatalogNotFoundException("Book not found.");
        return jdbc.queryForObject("insert into book_copies(book_id,barcode) values (?,?) returning id", UUID.class, bookId, barcode.trim());
    }

    public List<java.util.Map<String,Object>> copies(UUID bookId) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from books where id=?)", Boolean.class, bookId)))
            throw new CatalogNotFoundException("Book not found.");
        return jdbc.queryForList("select id, barcode, status, acquired_on as \"acquiredOn\" from book_copies where book_id=? order by barcode", bookId);
    }

    private static String emptyToNull(String text) { return text == null || text.isBlank() ? null : text.trim(); }
}
