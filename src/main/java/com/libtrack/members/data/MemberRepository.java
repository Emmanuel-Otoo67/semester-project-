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
    public PageResult<MemberRecord> list(String query,int page,int size){String filter="%"+query.trim()+"%";long total=jdbc.queryForObject("select count(*) from members where library_number ilike ? or first_name ilike ? or last_name ilike ? or coalesce(email,'') ilike ?",Long.class,filter,filter,filter,filter);
        List<MemberRecord> rows=jdbc.query("select id,library_number,first_name,last_name,member_type,email,phone,status from members where library_number ilike ? or first_name ilike ? or last_name ilike ? or coalesce(email,'') ilike ? order by last_name,first_name limit ? offset ?",(rs,n)->new MemberRecord(rs.getObject("id",UUID.class),rs.getString("library_number"),rs.getString("first_name"),rs.getString("last_name"),rs.getString("member_type"),rs.getString("email"),rs.getString("phone"),rs.getString("status")),filter,filter,filter,filter,size,(long)page*size);
        return new PageResult<>(rows,page,size,total);}
    public MemberRecord get(UUID id){return jdbc.query("select id,library_number,first_name,last_name,member_type,email,phone,status from members where id=?",rs->rs.next()?map(rs):null,id);}
    public UUID create(MemberRequest r){return jdbc.queryForObject("insert into members(library_number,first_name,last_name,member_type,email,phone,status) values (?,?,?,?,?,?,coalesce(?, 'ACTIVE')) returning id",UUID.class,r.libraryNumber().trim(),r.firstName().trim(),r.lastName().trim(),r.memberType()==null?"STUDENT":r.memberType(),blank(r.email()),blank(r.phone()),blank(r.status()));}
    public void update(UUID id,MemberRequest r){int n=jdbc.update("update members set library_number=?,first_name=?,last_name=?,member_type=?,email=?,phone=?,status=coalesce(?,status),updated_at=now() where id=?",r.libraryNumber().trim(),r.firstName().trim(),r.lastName().trim(),r.memberType()==null?"STUDENT":r.memberType(),blank(r.email()),blank(r.phone()),blank(r.status()),id);if(n==0)throw new MemberNotFoundException("Member not found.");}
    private static MemberRecord map(java.sql.ResultSet rs)throws java.sql.SQLException{return new MemberRecord(rs.getObject("id",UUID.class),rs.getString("library_number"),rs.getString("first_name"),rs.getString("last_name"),rs.getString("member_type"),rs.getString("email"),rs.getString("phone"),rs.getString("status"));}
    private static String blank(String s){return s==null||s.isBlank()?null:s.trim();}
}
