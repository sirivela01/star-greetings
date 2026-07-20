using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StarGreetings.Backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Preserve casing from Python responses
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// Register HttpClient for Firebase and Gemini services
builder.Services.AddHttpClient();

// Register Custom Services
builder.Services.AddHttpClient<FirebaseService>();
builder.Services.AddHttpClient<GeminiService>();

// Configure CORS (enable all origins, headers, and methods, similar to Flask-CORS)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseCors("AllowAll");

// Serve static files if they are placed in wwwroot (fallback to root if needed)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();

app.MapControllers();

// Binds to PORT env variable if present (Render/Heroku compatible)
string portVar = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Run($"http://0.0.0.0:{portVar}");
