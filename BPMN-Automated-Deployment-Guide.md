# BPMN Automated Deployment Guide

## Overview

Automatically deploy BPMN process definitions to Camunda 7 with every release to ensure your business processes are always aligned with your application code.

## Prerequisites

- Running Camunda 7 instance
- Network access to Camunda REST API
- Valid BPMN 2.0 files (`.bpmn` extension)
- Camunda credentials (username/password)

## Key Concepts

### Stable Deployment Names ⚠️ CRITICAL

Use stable deployment names without timestamps or random values for Camunda's duplicate filtering to work:

**Good**: `my-project-main`, `orderprocess-prod-main`  
**Bad**: `my-project-20231115-103045`, `orderprocess-${BUILD_NUMBER}`

### Deployment Process

1. **Test Connection**: `GET {CAMUNDA_URL}/engine-rest/version`
2. **Deploy Files**: `POST {CAMUNDA_URL}/engine-rest/deployment/create`
3. **Verify**: `GET {CAMUNDA_URL}/engine-rest/deployment?name={deployment_name}`

**Form Parameters**:
- `deployment-name`: String (required)
- `deploy-changed-only`: true (recommended)
- `enable-duplicate-filtering`: true (recommended)
- `file`: BPMN file(s) (required)

## API Documentation

For detailed API documentation, see the [official Camunda REST API docs](https://docs.camunda.org/rest/camunda-bpm-platform/7.23/#tag/Deployment/operation/createDeployment).

## Code Examples

### Kotlin Example

```kotlin
import java.io.File
import java.util.Base64
import kotlinx.coroutines.runBlocking
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class CamundaDeployer(
    private val url: String,
    private val username: String,
    private val password: String
) {
    private val client = OkHttpClient()
    private val auth = Base64.getEncoder().encodeToString("$username:$password".toByteArray())
    
    fun testConnection(): Boolean {
        val request = Request.Builder()
            .url("${url.trimEnd('/')}/engine-rest/version")
            .addHeader("Authorization", "Basic $auth")
            .build()
        
        return try {
            client.newCall(request).execute().use { response ->
                response.isSuccessful
            }
        } catch (e: IOException) {
            false
        }
    }
    
    fun deployBpmnFiles(deploymentName: String, bpmnFiles: List<String>): Pair<Boolean, String> {
        val multipartBuilder = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("deployment-name", deploymentName)
            .addFormDataPart("deploy-changed-only", "true")
            .addFormDataPart("enable-duplicate-filtering", "true")
        
        // Add BPMN files
        bpmnFiles.forEach { filePath ->
            val file = File(filePath)
            if (file.exists()) {
                multipartBuilder.addFormDataPart(
                    "file",
                    file.name,
                    file.asRequestBody("application/xml".toMediaType())
                )
            }
        }
        
        val request = Request.Builder()
            .url("${url.trimEnd('/')}/engine-rest/deployment/create")
            .addHeader("Authorization", "Basic $auth")
            .post(multipartBuilder.build())
            .build()
        
        return try {
            client.newCall(request).execute().use { response ->
                val responseBody = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Pair(true, responseBody)
                } else {
                    Pair(false, responseBody)
                }
            }
        } catch (e: IOException) {
            Pair(false, e.message ?: "Network error")
        }
    }
    
    fun verifyDeployment(deploymentName: String): Boolean {
        val request = Request.Builder()
            .url("${url.trimEnd('/')}/engine-rest/deployment?name=$deploymentName")
            .addHeader("Authorization", "Basic $auth")
            .build()
        
        return try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val responseBody = response.body?.string() ?: "[]"
                    val deployments = JSONObject("{\"deployments\": $responseBody}")
                    val deploymentsArray = deployments.getJSONArray("deployments")
                    
                    for (i in 0 until deploymentsArray.length()) {
                        val deployment = deploymentsArray.getJSONObject(i)
                        if (deployment.getString("name") == deploymentName) {
                            return true
                        }
                    }
                    false
                } else {
                    false
                }
            }
        } catch (e: IOException) {
            false
        }
    }
}

// Usage
fun main() {
    val deployer = CamundaDeployer(
        url = "https://camunda.example.com",
        username = "admin",
        password = "password"
    )
    
    if (!deployer.testConnection()) {
        println("Cannot connect to Camunda")
        return
    }
    
    // Use stable deployment name without timestamps or random values
    // This ensures Camunda's duplicate filtering works correctly
    val (success, result) = deployer.deployBpmnFiles(
        deploymentName = "my-project-main", // Stable name format: {project}-{branch}
        bpmnFiles = listOf("process1.bpmn", "process2.bpmn")
    )
    
    if (!success) {
        println("Deployment failed: $result")
        return
    }
    
    val jsonResult = JSONObject(result)
    println("Deployment successful: ${jsonResult.getString("id")}")
}
```

### Shell Script Example

```bash
#!/bin/bash

# Configuration
CAMUNDA_URL="${CAMUNDA_URL:-https://camunda.example.com}"
CAMUNDA_USER="${CAMUNDA_USER:-admin}"
CAMUNDA_PASS="${CAMUNDA_PASS:-password}"
# Use stable deployment name without timestamps for duplicate filtering
DEPLOYMENT_NAME="my-project-main"  # Format: {project}-{branch}

# Test connection
echo "Testing Camunda connection..."
if ! curl -sf -u "$CAMUNDA_USER:$CAMUNDA_PASS" \
  "$CAMUNDA_URL/engine-rest/version" > /dev/null; then
  echo "Error: Cannot connect to Camunda"
  exit 1
fi

# Build form arguments
FORM_ARGS=""
FORM_ARGS="$FORM_ARGS -F deployment-name=$DEPLOYMENT_NAME"
FORM_ARGS="$FORM_ARGS -F deploy-changed-only=true"
FORM_ARGS="$FORM_ARGS -F enable-duplicate-filtering=true"

# Add BPMN files
for file in *.bpmn; do
  if [ -f "$file" ]; then
    FORM_ARGS="$FORM_ARGS -F file=@$file"
    echo "Adding file: $file"
  fi
done

# Deploy to Camunda
echo "Deploying to Camunda..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -u "$CAMUNDA_USER:$CAMUNDA_PASS" \
  $FORM_ARGS \
  "$CAMUNDA_URL/engine-rest/deployment/create")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "Deployment failed with HTTP $HTTP_CODE"
  echo "$RESPONSE_BODY"
  exit 1
fi

echo "Deployment successful"
echo "$RESPONSE_BODY" | jq .
```

### .NET Example

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Linq;

public class CamundaDeployer
{
    private readonly HttpClient _httpClient;
    private readonly string _url;
    private readonly string _authHeader;

    public CamundaDeployer(string url, string username, string password)
    {
        _url = url.TrimEnd('/');
        _httpClient = new HttpClient();
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{username}:{password}"));
        _authHeader = $"Basic {credentials}";
    }

    public async Task<bool> TestConnectionAsync()
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{_url}/engine-rest/version");
            request.Headers.Add("Authorization", _authHeader);
            
            var response = await _httpClient.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception)
        {
            return false;
        }
    }

    public async Task<(bool Success, string Result)> DeployBpmnFilesAsync(string deploymentName, IEnumerable<string> bpmnFiles)
    {
        try
        {
            using var content = new MultipartFormDataContent();
            
            // Add form fields
            content.Add(new StringContent(deploymentName), "deployment-name");
            content.Add(new StringContent("true"), "deploy-changed-only");
            content.Add(new StringContent("true"), "enable-duplicate-filtering");
            
            // Add BPMN files
            foreach (var filePath in bpmnFiles)
            {
                if (File.Exists(filePath))
                {
                    var fileName = Path.GetFileName(filePath);
                    var fileContent = new StreamContent(File.OpenRead(filePath));
                    fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/xml");
                    content.Add(fileContent, "file", fileName);
                }
            }

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_url}/engine-rest/deployment/create");
            request.Headers.Add("Authorization", _authHeader);
            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                return (true, responseBody);
            }
            else
            {
                return (false, responseBody);
            }
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    public async Task<bool> VerifyDeploymentAsync(string deploymentName)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{_url}/engine-rest/deployment?name={deploymentName}");
            request.Headers.Add("Authorization", _authHeader);
            
            var response = await _httpClient.SendAsync(request);
            
            if (response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                var deployments = JsonSerializer.Deserialize<List<DeploymentInfo>>(responseBody);
                return deployments?.Any(d => d.Name == deploymentName) ?? false;
            }
            
            return false;
        }
        catch (Exception)
        {
            return false;
        }
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}

public class DeploymentInfo
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string DeploymentTime { get; set; }
}

// Usage
class Program
{
    static async Task Main(string[] args)
    {
        using var deployer = new CamundaDeployer(
            url: Environment.GetEnvironmentVariable("CAMUNDA_URL") ?? "https://camunda.example.com",
            username: Environment.GetEnvironmentVariable("CAMUNDA_USER") ?? "admin",
            password: Environment.GetEnvironmentVariable("CAMUNDA_PASS") ?? "password"
        );

        if (!await deployer.TestConnectionAsync())
        {
            Console.WriteLine("Cannot connect to Camunda");
            Environment.Exit(1);
        }

        // Use stable deployment name without timestamps or random values
        // This ensures Camunda's duplicate filtering works correctly
        var (success, result) = await deployer.DeployBpmnFilesAsync(
            deploymentName: "my-project-main", // Stable name format: {project}-{branch}
            bpmnFiles: new[] { "process1.bpmn", "process2.bpmn" }
        );

        if (!success)
        {
            Console.WriteLine($"Deployment failed: {result}");
            Environment.Exit(1);
        }

        var jsonResult = JsonSerializer.Deserialize<JsonElement>(result);
        Console.WriteLine($"Deployment successful: {jsonResult.GetProperty("id").GetString()}");
    }
}
```

## Common Issues

- **401 Unauthorized**: Check credentials and user permissions
- **400 Bad Request**: Validate BPMN XML syntax and unique process IDs
- **Connection Failed**: Verify network connectivity and Camunda URL
- **Duplicate Deployments**: Ensure stable deployment names (no timestamps/UUIDs)