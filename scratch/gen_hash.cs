using Microsoft.AspNetCore.Identity;

public class User {}
var hasher = new PasswordHasher<User>();
string hash = hasher.HashPassword(new User(), "EpikNovel123!");
Console.WriteLine(hash);
