package com.libtrack.circulation;

import com.libtrack.audit.data.AuditRepository;
import com.libtrack.circulation.api.CirculationConflictException;
import com.libtrack.circulation.data.CirculationRepository;
import com.libtrack.circulation.service.CirculationService;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CirculationServiceTest {
    private final CirculationRepository repository=mock(CirculationRepository.class);
    private final AuditRepository audit=mock(AuditRepository.class);
    private final CirculationService service=new CirculationService(repository,audit);
    private final UUID member=UUID.randomUUID(), actor=UUID.randomUUID(), book=UUID.randomUUID(), copyId=UUID.randomUUID();

    @Test void checkoutRequiresAnActiveMemberAndAvailableCopy(){
        when(repository.lockMember(member)).thenReturn(Optional.of(new CirculationRepository.Member(member,"ACTIVE")));
        when(repository.lockCopy("B-100")).thenReturn(Optional.of(new CirculationRepository.Copy(copyId,book,"B-100","ON_LOAN")));
        var error=assertThrows(CirculationConflictException.class,()->service.checkout(member,"B-100",actor));
        assertEquals("This copy is not available for checkout.",error.getMessage());
        verify(repository,never()).createLoan(any(),any(),any(),anyInt());
    }

    @Test void checkoutRejectsSuspendedMembersBeforeTouchingCopies(){
        when(repository.lockMember(member)).thenReturn(Optional.of(new CirculationRepository.Member(member,"SUSPENDED")));
        var error=assertThrows(CirculationConflictException.class,()->service.checkout(member,"B-100",actor));
        assertEquals("This member account is not active.",error.getMessage());
        verify(repository,never()).lockCopy(anyString());
    }

    @Test void checkoutUsesPolicyAndAuditsSuccessfulLoan(){
        var copy=new CirculationRepository.Copy(copyId,book,"B-100","AVAILABLE");
        var loan=new CirculationRepository.Loan(UUID.randomUUID(),copyId,book,member,actor,"ACTIVE",null,(short)0);
        when(repository.lockMember(member)).thenReturn(Optional.of(new CirculationRepository.Member(member,"ACTIVE")));
        when(repository.lockCopy("B-100")).thenReturn(Optional.of(copy));
        when(repository.settingInt("circulation","maxLoansPerMember",5)).thenReturn(5);
        when(repository.activeLoanCount(member)).thenReturn(0);
        when(repository.settingInt("circulation","defaultLoanDays",14)).thenReturn(21);
        when(repository.createLoan(copy,member,actor,21)).thenReturn(loan);
        assertEquals(loan,service.checkout(member,"B-100",actor));
        verify(audit).record(actor,"LOAN_CHECKED_OUT","LOAN",loan.id());
    }

    @Test void renewalIsBlockedWhenAStudentIsWaitingForTheTitle(){
        UUID loanId=UUID.randomUUID();
        when(repository.lockLoan(loanId)).thenReturn(Optional.of(new CirculationRepository.Loan(loanId,copyId,book,member,actor,"ACTIVE",null,(short)0)));
        when(repository.lockMember(member)).thenReturn(Optional.of(new CirculationRepository.Member(member,"ACTIVE")));
        when(repository.settingInt("circulation","maxRenewals",1)).thenReturn(1);
        when(repository.hasQueuedHold(book)).thenReturn(true);
        assertThrows(CirculationConflictException.class,()->service.renew(loanId,actor));
        verify(repository,never()).renew(any(),anyInt());
    }
}
