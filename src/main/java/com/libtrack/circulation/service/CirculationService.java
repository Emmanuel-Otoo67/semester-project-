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

@Service public class CirculationService {
    private final CirculationRepository repository; private final AuditRepository audit;
    public CirculationService(CirculationRepository repository,AuditRepository audit){this.repository=repository;this.audit=audit;}
    @Transactional public CirculationRepository.Loan checkout(UUID memberId,String barcode,UUID actor){
        var member=repository.lockMember(memberId).orElseThrow(()->new CirculationConflictException("Member not found."));
        if(!"ACTIVE".equals(member.status()))throw new CirculationConflictException("This member account is not active.");
        var copy=repository.lockCopy(barcode).orElseThrow(()->new CirculationConflictException("No book copy matches that barcode."));
        if(!"AVAILABLE".equals(copy.status()))throw new CirculationConflictException("This copy is not available for checkout.");
        int maxLoans=repository.settingInt("circulation","maxLoansPerMember",5);
        if(repository.activeLoanCount(memberId)>=maxLoans)throw new CirculationConflictException("This member has reached the active-loan limit.");
        int days=repository.settingInt("circulation","defaultLoanDays",14);
        var loan=repository.createLoan(copy,memberId,actor,days);audit.record(actor,"LOAN_CHECKED_OUT","LOAN",loan.id());return loan;
    }
    @Transactional public CirculationRepository.Loan renew(UUID loanId,UUID actor){
        var loan=repository.lockLoan(loanId).orElseThrow(()->new CirculationConflictException("Loan not found."));
        if(!"ACTIVE".equals(loan.status()))throw new CirculationConflictException("This loan has already been returned.");
        var member=repository.lockMember(loan.memberId()).orElseThrow(()->new CirculationConflictException("Member not found."));
        if(!"ACTIVE".equals(member.status()))throw new CirculationConflictException("This member account is not active.");
        int max=repository.settingInt("circulation","maxRenewals",1);
        if(loan.renewalCount()>=max)throw new CirculationConflictException("The renewal limit has been reached.");
        if(repository.hasQueuedHold(loan.bookId()))throw new CirculationConflictException("This title has a waiting hold and cannot be renewed.");
        int days=repository.settingInt("circulation","defaultLoanDays",14);repository.renew(loanId,days);
        audit.record(actor,"LOAN_RENEWED","LOAN",loanId);return repository.findLoan(loanId).orElseThrow();
    }
    @Transactional public void returnLoan(UUID loanId,UUID actor){
        var loan=repository.lockLoan(loanId).orElseThrow(()->new CirculationConflictException("Loan not found."));
        if(!"ACTIVE".equals(loan.status()))throw new CirculationConflictException("This loan has already been returned.");
        repository.returnLoan(loan.id(),loan.copyId());audit.record(actor,"LOAN_RETURNED","LOAN",loan.id());
        int pickupDays=repository.settingInt("circulation","holdPickupDays",3);
        repository.claimNextHold(loan.bookId(),loan.copyId(),pickupDays).ifPresent(holdId->audit.record(actor,"HOLD_READY","HOLD",holdId));
    }
    public List<Map<String,Object>> list(boolean current,UUID memberId,String barcode,boolean overdue){return repository.loans(current,memberId,barcode,overdue);}
}
