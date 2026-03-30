# build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build-env
WORKDIR /app

# copy all projects
COPY . ./
RUN dotnet restore Epiknovel.api/Epiknovel.api.csproj

# build and publish
RUN dotnet publish Epiknovel.api/Epiknovel.api.csproj -c Release -o out

# runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build-env /app/out .

EXPOSE 8080
ENTRYPOINT ["dotnet", "Epiknovel.api.dll"]