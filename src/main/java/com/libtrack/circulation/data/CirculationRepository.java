package com.libtrack.circulation.data;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository public class CirculationRepository {
    private final JdbcTemplate jdbc;
    public CirculationRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public record Copy(UUID id,UUID bookId,String barcode,String status){}
    public record Member(UUID id,String status){}
    public record Loan(UUID id,UUID copyId,UUID bookId,UUID memberId,UUID checkedOutBy,String status,OffsetDateTime dueAt,short renewalCount){}
    public record Hold(UUID id,UUID memberId,UUID bookId,String status,UUID copyId,OffsetDateTime readyUntil){}

    public Optional<Copy> lockCopy(String barcode){return jdbc.query("select id,book_id,barcode,status from book_copies where barcode=? for update",rs->rs.next()?Optional.of(new Copy(rs.getObject("id",UUID.class),rs.getObject("book_id",UUID.class),rs.getString("barcode"),rs.getString("status"))):Optional.empty(),barcode.trim());}
    public Optional<Member> lockMember(UUID id){return jdbc.query("select id,status from members where id=? for update",rs->rs.next()?Optional.of(new Member(rs.getObject("id",UUID.class),rs.getString("status"))):Optional.empty(),id);}
    public int activeLoanCount(UUID memberId){return jdbc.queryForObject("select count(*) from loans where member_id=? and returned_at is null",Integer.class,memberId);}
    public int settingInt(String key,String field,int fallback){Integer value=jdbc.query("select (setting_value->>?)::integer from library_settings where setting_key=?",rs->rs.next()?rs.getObject(1,Integer.class):null,field,key);return value==null?fallback:value;}
    public Loan createLoan(Copy copy,UUID memberId,UUID actor,int days){
        UUID loanId=jdbc.queryForObject("insert into loans(copy_id,member_id,checked_out_by,due_at) values (?,?,?,now()+make_interval(days=>?)) returning id",UUID.class,copy.id(),memberId,actor,days);
        jdbc.update("update book_copies set status='ON_LOAN',updated_at=now() where id=?",copy.id());
        return findLoan(loanId).orElseThrow();
    }
    public Optional<Loan> lockLoan(UUID id){return jdbc.query("""
        select l.id,l.copy_id,c.book_id,l.member_id,l.checked_out_by,
          case when l.returned_at is null then 'ACTIVE' else 'RETURNED' end status,l.due_at,l.renewal_count
        from loans l join book_copies c on c.id=l.copy_id where l.id=? for update of l,c
        """,rs->rs.next()?Optional.of(mapLoan(rs)):Optional.empty(),id);}
    public Optional<Loan> findLoan(UUID id){return jdbc.query("select l.id,l.copy_id,c.book_id,l.member_id,l.checked_out_by,case when l.returned_at is null then 'ACTIVE' else 'RETURNED' end status,l.due_at,l.renewal_count from loans l join book_copies c on c.id=l.copy_id where l.id=?",rs->rs.next()?Optional.of(mapLoan(rs)):Optional.empty(),id);}
    private static Loan mapLoan(java.sql.ResultSet rs)throws java.sql.SQLException{return new Loan(rs.getObject("id",UUID.class),rs.getObject("copy_id",UUID.class),rs.getObject("book_id",UUID.class),rs.getObject("member_id",UUID.class),rs.getObject("checked_out_by",UUID.class),rs.getString("status"),rs.getObject("due_at",OffsetDateTime.class),rs.getShort("renewal_count"));}
    public boolean hasQueuedHold(UUID bookId){return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from holds where book_id=? and status='QUEUED')",Boolean.class,bookId));}
    public boolean hasOpenHold(UUID bookId,UUID memberId){return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from holds where book_id=? and member_id=? and status in ('QUEUED','READY'))",Boolean.class,bookId,memberId));}
    public void renew(UUID loanId,int days){jdbc.update("update loans set due_at=due_at+make_interval(days=>?),renewal_count=renewal_count+1 where id=? and returned_at is null",days,loanId);}
    public void returnLoan(UUID loanId,UUID copyId){jdbc.update("update loans set returned_at=now() where id=? and returned_at is null",loanId);jdbc.update("update book_copies set status='AVAILABLE',updated_at=now() where id=?",copyId);}
    public Optional<UUID> claimNextHold(UUID bookId,UUID copyId,int days){return jdbc.query("select id from holds where book_id=? and status='QUEUED' order by requested_at,id limit 1 for update skip locked",rs->rs.next()?Optional.of(rs.getObject("id",UUID.class)):Optional.empty(),bookId).map(id->{jdbc.update("update holds set status='READY',fulfilled_copy_id=?,ready_until=now()+make_interval(days=>?) where id=?",copyId,days,id);jdbc.update("update book_copies set status='ON_HOLD',updated_at=now() where id=?",copyId);return id;});}
    public UUID createHold(UUID memberId,UUID bookId){return jdbc.queryForObject("insert into holds(member_id,book_id) values (?,?) returning id",UUID.class,memberId,bookId);}
    public Optional<Hold> lockHold(UUID id){return jdbc.query("select id,member_id,book_id,status,fulfilled_copy_id,ready_until from holds where id=? for update",rs->rs.next()?Optional.of(new Hold(rs.getObject("id",UUID.class),rs.getObject("member_id",UUID.class),rs.getObject("book_id",UUID.class),rs.getString("status"),rs.getObject("fulfilled_copy_id",UUID.class),rs.getObject("ready_until",OffsetDateTime.class))):Optional.empty(),id);}
    public Optional<Copy> lockCopy(UUID id){return jdbc.query("select id,book_id,barcode,status from book_copies where id=? for update",rs->rs.next()?Optional.of(new Copy(rs.getObject("id",UUID.class),rs.getObject("book_id",UUID.class),rs.getString("barcode"),rs.getString("status"))):Optional.empty(),id);}
    public void cancelHold(Hold hold){jdbc.update("update holds set status='CANCELLED' where id=?",hold.id());if("READY".equals(hold.status())&&hold.copyId()!=null)jdbc.update("update book_copies set status='AVAILABLE',updated_at=now() where id=? and status='ON_HOLD'",hold.copyId());}
    public void fulfillHold(UUID holdId){jdbc.update("update holds set status='FULFILLED',fulfilled_at=now() where id=? and status='READY'",holdId);}
    public List<Map<String,Object>> loans(boolean current,UUID memberId,String barcode,boolean overdue){return jdbc.queryForList("""
      select l.id,l.member_id as \"memberId\",m.library_number as \"libraryNumber\",concat(m.first_name,' ',m.last_name) as \"memberName\",
        l.copy_id as \"copyId\",c.barcode,b.title,l.checked_out_at as \"checkedOutAt\",l.due_at as \"dueAt\",l.returned_at as \"returnedAt\",l.renewal_count as \"renewalCount\"
      from loans l join members m on m.id=l.member_id join book_copies c on c.id=l.copy_id join books b on b.id=c.book_id
      where (?=false or l.returned_at is null) and (?::uuid is null or l.member_id=?) and (?='' or c.barcode ilike ?) and (?=false or (l.returned_at is null and l.due_at<now()))
      order by l.due_at asc limit 500
      """,current,memberId,memberId,barcode==null?"":barcode,barcode==null?"":"%"+barcode+"%",overdue);}
    public List<Map<String,Object>> holds(String status){return jdbc.queryForList("select h.id,h.status,h.requested_at as \"requestedAt\",h.ready_until as \"readyUntil\",h.book_id as \"bookId\",b.title,h.member_id as \"memberId\",m.library_number as \"libraryNumber\",concat(m.first_name,' ',m.last_name) as \"memberName\" from holds h join books b on b.id=h.book_id join members m on m.id=h.member_id where (?='ALL' or h.status=?) order by case h.status when 'READY' then 0 else 1 end,h.requested_at",status,status);}
    public boolean bookExists(UUID id){return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from books where id=?)",Boolean.class,id));}
}
