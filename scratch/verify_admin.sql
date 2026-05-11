SELECT ur."UserId", r."Name" FROM identity."UserRoles" ur JOIN identity."Roles" r ON ur."RoleId" = r."Id" WHERE ur."UserId" = '019d0303-ab53-7621-869b-76d5901f14bb';
