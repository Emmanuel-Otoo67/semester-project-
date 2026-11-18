package com.libtrack.settings.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.libtrack.audit.data.AuditRepository;
import com.libtrack.platform.auth.CurrentStaff;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service public class SettingsService {
    private final JdbcTemplate jdbc; private final ObjectMapper mapper; private final AuditRepository audit;
    public SettingsService(JdbcTemplate jdbc,ObjectMapper mapper,AuditRepository audit){this.jdbc=jdbc;this.mapper=mapper;this.audit=audit;}
    public Map<String,Object> read(){Map<String,Object> result=new LinkedHashMap<>();for(Map<String,Object> row:jdbc.queryForList("select setting_key,setting_value::text as value from library_settings order by setting_key")){try{result.put((String)row.get("setting_key"),mapper.readTree((String)row.get("value")));}catch(JsonProcessingException e){throw new IllegalStateException("Stored library settings are invalid JSON.",e);}}return result;}
    @Transactional public Map<String,Object> update(String key,Map<String,Object> value,CurrentStaff actor){validate(key,value);String json;try{json=mapper.writeValueAsString(value);}catch(JsonProcessingException e){throw new IllegalArgumentException("Settings could not be serialized.");}
        int changed=jdbc.update("insert into library_settings(setting_key,setting_value,updated_by,updated_at) values (?,?::jsonb,?,now()) on conflict(setting_key) do update set setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=now()",key,json,actor.id());
        audit.record(actor.id(),"SETTINGS_UPDATED","LIBRARY_SETTINGS",UUID.nameUUIDFromBytes(key.getBytes(java.nio.charset.StandardCharsets.UTF_8)));return read();}
    private static void validate(String key,Map<String,Object> value){
        if(value==null)throw new IllegalArgumentException("Settings object is required.");
        if("circulation".equals(key)){range(value,"defaultLoanDays",1,365);range(value,"maxLoansPerMember",1,100);range(value,"maxRenewals",0,10);range(value,"holdPickupDays",1,30);return;}
        if("fees".equals(key)){if(!(value.get("enabled") instanceof Boolean))throw new IllegalArgumentException("fees.enabled must be true or false.");double daily=number(value,"overdueFeePerDay"),max=number(value,"maxOverdueFee");if(daily<0||max<0)throw new IllegalArgumentException("Fee amounts cannot be negative.");Object currency=value.get("currency");if(currency!=null&&(!(currency instanceof String text)||!text.matches("[A-Z]{3}")))throw new IllegalArgumentException("Currency must be a three-letter uppercase code.");return;}
        throw new IllegalArgumentException("Unknown library setting.");
    }
    private static void range(Map<String,Object> value,String key,int min,int max){Object raw=value.get(key);if(!(raw instanceof Number n)||n.doubleValue()!=n.longValue()||n.longValue()<min||n.longValue()>max)throw new IllegalArgumentException(key+" must be a whole number between "+min+" and "+max+".");}
    private static double number(Map<String,Object> value,String key){Object raw=value.get(key);if(!(raw instanceof Number n))throw new IllegalArgumentException(key+" must be a number.");return n.doubleValue();}
}
