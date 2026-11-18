package com.libtrack.circulation.service;

import com.libtrack.audit.data.AuditRepository;
import com.libtrack.circulation.api.CirculationConflictException;
import com.libtrack.circulation.data.CirculationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service public class HoldService {
    private final CirculationRepository repository; private final CirculationService circulation; private final AuditRepository audit;
    public HoldService(CirculationRepository repository,CirculationService circulation,AuditRepository audit){this.repository=repository;this.circulation=circulation;this.audit=audit;}
    public List<Map<String,Object>> list(String status){String value=status==null||status.isBlank()?"ALL":status.toUpperCase();if(!List.of("ALL","QUEUED","READY","FULFILLED","CANCELLED","EXPIRED").contains(value))throw new IllegalArgumentException("Unknown hold status.");return repository.holds(value);}
    @Transactional public UUID create(UUID memberId,UUID bookId,UUID actor){
        var member=repository.lockMember(memberId).orElseThrow(()->new CirculationConflictException("Member not found."));
        if(!"ACTIVE".equals(member.status()))throw new CirculationConflictException("This member account is not active.");
        if(!repository.lockBook(bookId))throw new CirculationConflictException("Book title not found.");
        if(repository.hasOpenHold(bookId,memberId))throw new CirculationConflictException("This member already has an open hold for the title.");
        int pickupDays=repository.settingInt("circulation","holdPickupDays",3);
        UUID id=repository.createHold(memberId,bookId,pickupDays);audit.record(actor,"HOLD_CREATED","HOLD",id);return id;
    }
    @Transactional public void cancel(UUID id,UUID actor){
        var hold=repository.lockHold(id).orElseThrow(()->new CirculationConflictException("Hold not found."));
        if(!List.of("QUEUED","READY").contains(hold.status()))throw new CirculationConflictException("Only queued or ready holds can be cancelled.");
        repository.lockBook(hold.bookId());
        repository.cancelHold(hold);audit.record(actor,"HOLD_CANCELLED","HOLD",id);
        if("READY".equals(hold.status())&&hold.copyId()!=null){int days=repository.settingInt("circulation","holdPickupDays",3);repository.claimNextHold(hold.bookId(),hold.copyId(),days).ifPresent(next->audit.record(actor,"HOLD_READY","HOLD",next));}
    }
    @Transactional public CirculationRepository.Loan fulfill(UUID id,UUID actor){
        var hold=repository.lockHold(id).orElseThrow(()->new CirculationConflictException("Hold not found."));
        if(!"READY".equals(hold.status())||hold.copyId()==null)throw new CirculationConflictException("This hold is not ready for pickup.");
        if(hold.readyUntil()==null||hold.readyUntil().isBefore(OffsetDateTime.now()))throw new CirculationConflictException("The pickup window has expired.");
        var member=repository.lockMember(hold.memberId()).orElseThrow(()->new CirculationConflictException("Member not found."));
        if(!"ACTIVE".equals(member.status()))throw new CirculationConflictException("This member account is not active.");
        repository.lockBook(hold.bookId());
        var copy=repository.lockCopy(hold.copyId()).orElseThrow(()->new CirculationConflictException("The reserved copy is no longer available."));
        if(!"ON_HOLD".equals(copy.status()))throw new CirculationConflictException("The reserved copy is no longer on hold.");
        if(repository.activeLoanCount(member.id())>=repository.settingInt("circulation","maxLoansPerMember",5))throw new CirculationConflictException("This member has reached the active-loan limit.");
        var availableCopy=new CirculationRepository.Copy(copy.id(),copy.bookId(),copy.barcode(),"AVAILABLE");
        var loan=repository.createLoan(availableCopy,member.id(),actor,repository.settingInt("circulation","defaultLoanDays",14));
        repository.fulfillHold(id);audit.record(actor,"HOLD_FULFILLED","HOLD",id);audit.record(actor,"LOAN_CHECKED_OUT","LOAN",loan.id());return loan;
    }
}
