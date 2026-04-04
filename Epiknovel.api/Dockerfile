# build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build-env
WORKDIR /app

# Copy all .csproj files to leverage layer caching for restore
COPY ["Epiknovel.api/Epiknovel.api.csproj", "Epiknovel.api/"]
COPY ["src/Modules/Books/Epiknovel.Modules.Books.csproj", "src/Modules/Books/"]
COPY ["src/Modules/Compliance/Epiknovel.Modules.Compliance.csproj", "src/Modules/Compliance/"]
COPY ["src/Modules/Identity/Epiknovel.Modules.Identity.csproj", "src/Modules/Identity/"]
COPY ["src/Modules/Infrastructure/Epiknovel.Modules.Infrastructure.csproj", "src/Modules/Infrastructure/"]
COPY ["src/Modules/Management/Epiknovel.Modules.Management.csproj", "src/Modules/Management/"]
COPY ["src/Modules/Search/Epiknovel.Modules.Search.csproj", "src/Modules/Search/"]
COPY ["src/Modules/Social/Epiknovel.Modules.Social.csproj", "src/Modules/Social/"]
COPY ["src/Modules/Users/Epiknovel.Modules.Users.csproj", "src/Modules/Users/"]
COPY ["src/Modules/Wallet/Epiknovel.Modules.Wallet.csproj", "src/Modules/Wallet/"]
COPY ["src/Shared/Epiknovel.Shared.Core/Epiknovel.Shared.Core.csproj", "src/Shared/Epiknovel.Shared.Core/"]
COPY ["src/Shared/Epiknovel.Shared.Infrastructure/Epiknovel.Shared.Infrastructure.csproj", "src/Shared/Epiknovel.Shared.Infrastructure/"]

# Restore only the projects (Cached if csproj files didn't change)
RUN dotnet restore Epiknovel.api/Epiknovel.api.csproj

# Copy the rest of the source code
COPY . .

# Build and publish
RUN dotnet publish Epiknovel.api/Epiknovel.api.csproj -c Release -o out

# runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
WORKDIR /app

# 🛡️ Hardening Alpine for Npgsql 10 & PostgreSQL 17
# libgssapi_krb5.so.2 ve icu-libs (Postgres/Npgsql uyumu için)
RUN apk add --no-cache icu-libs krb5-libs
COPY --from=build-env /app/out .

EXPOSE 8080
ENTRYPOINT ["dotnet", "Epiknovel.api.dll"]