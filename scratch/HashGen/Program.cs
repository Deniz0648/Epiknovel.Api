using Microsoft.AspNetCore.Identity;

var hasher = new PasswordHasher<object>();
string hash = hasher.HashPassword(new object(), "EpikNovel123!");
Console.WriteLine(hash);
