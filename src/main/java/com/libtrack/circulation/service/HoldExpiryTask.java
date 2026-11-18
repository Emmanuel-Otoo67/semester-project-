package com.libtrack.circulation.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class HoldExpiryTask {
    private static final Logger log=LoggerFactory.getLogger(HoldExpiryTask.class);
    private final CirculationService circulation;
    public HoldExpiryTask(CirculationService circulation){this.circulation=circulation;}

    @Scheduled(fixedDelayString="${libtrack.holds.expiry-check-ms:60000}")
    public void expireReadyHolds(){
        try{circulation.releaseExpiredReadyHolds();}
        catch(RuntimeException error){log.error("Could not release expired hold copies; the next scheduled check will retry.",error);}
    }
}
