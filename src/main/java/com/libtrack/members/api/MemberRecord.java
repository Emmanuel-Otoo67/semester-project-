package com.libtrack.members.api;
import java.util.UUID;
public record MemberRecord(UUID id,String libraryNumber,String firstName,String lastName,String memberType,String email,String phone,String status,String programme,String level,boolean authLinked) {}
