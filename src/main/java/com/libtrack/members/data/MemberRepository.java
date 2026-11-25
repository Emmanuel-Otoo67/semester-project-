package com.libtrack.members.data;

import com.libtrack.members.api.MemberRecord;
import com.libtrack.members.api.MemberNotFoundException;
import com.libtrack.members.api.MemberRequest;
import com.libtrack.platform.api.PageResult;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository public class MemberRepository {
    private final JdbcTemplate jdbc;
    public MemberRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public PageResult<MemberRecord> list(String query,int page,int size){String filter="%"+query.trim()+"%";long total=jdbc.queryForObject("select count(*) from members where library_number ilike ? or first_name ilike ? or last_name ilike ? or coalesce(email,'') ilike ? or coalesce(programme,'') ilike ? or coalesce(level,'') ilike ?",Long.class,filter,filter,filter,filter,filter,filter);
        List<MemberRecord> rows=jdbc.query("select id,library_number,first_name,last_name,member_type,email,phone,status,programme,level,auth_user_id is not null as auth_linked from members where library_number ilike ? or first_name ilike ? or last_name ilike ? or coalesce(email,'') ilike ? or coalesce(programme,'') ilike ? or coalesce(level,'') ilike ? order by last_name,first_name limit ? offset ?",(rs,n)->new MemberRecord(rs.getObject("id",UUID.class),rs.getString("library_number"),rs.getString("first_name"),rs.getString("last_name"),rs.getString("member_type"),rs.getString("email"),rs.getString("phone"),rs.getString("status"),rs.getString("programme"),rs.getString("level"),rs.getBoolean("auth_linked")),filter,filter,filter,filter,filter,filter,size,(long)page*size);
        return new PageResult<>(rows,page,size,total);}
    public MemberRecord get(UUID id){return jdbc.query("select id,library_number,first_name,last_name,member_type,email,phone,status,programme,level,auth_user_id is not null as auth_linked from members where id=?",rs->rs.next()?map(rs):null,id);}
    public void update(UUID id,MemberRequest r){int n=jdbc.update("update members set library_number=?,first_name=?,last_name=?,member_type=?,email=?,phone=?,programme=?,level=?,status=coalesce(?,status),updated_at=now() where id=?",r.libraryNumber().trim(),r.firstName().trim(),r.lastName().trim(),r.memberType()==null?"STUDENT":r.memberType(),blank(r.email()),blank(r.phone()),blank(r.programme()),blank(r.level()),blank(r.status()),id);if(n==0)throw new MemberNotFoundException("Member not found.");}
    private static MemberRecord map(java.sql.ResultSet rs)throws java.sql.SQLException{return new MemberRecord(rs.getObject("id",UUID.class),rs.getString("library_number"),rs.getString("first_name"),rs.getString("last_name"),rs.getString("member_type"),rs.getString("email"),rs.getString("phone"),rs.getString("status"),rs.getString("programme"),rs.getString("level"),rs.getBoolean("auth_linked"));}
    private static String blank(String s){return s==null||s.isBlank()?null:s.trim();}
}
