# BPMN Automated Deployment Guide

## 1. Overview

This guide provides a language-agnostic approach to implementing automated deployments of BPMN (Business Process Model and Notation) files to Camunda 7 engines. The process described here can be adapted to any programming language or deployment tool while maintaining the same core functionality.

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Core Concepts](#3-core-concepts)
4. [Authentication](#4-authentication)
5. [Deployment Process](#5-deployment-process)
6. [Change Detection](#6-change-detection)
7. [API Implementation](#7-api-implementation)
8. [Error Handling](#8-error-handling)
9. [Best Practices](#9-best-practices)
10. [Code Examples](#10-code-examples)
11. [Troubleshooting](#11-troubleshooting)
12. [Security Considerations](#12-security-considerations)
13. [Conclusion](#13-conclusion)

## 2. Prerequisites

Before implementing automated BPMN deployments, ensure you have:

1. **Camunda 7 Engine** - A running Camunda 7 instance (version 7.x)
2. **API Access** - Network connectivity to the Camunda REST API
3. **Credentials** - Username and password for Camunda authentication
4. **BPMN Files** - Valid BPMN 2.0 XML files (`.bpmn` extension)

### Required Information

- `CAMUNDA_URL`: Base URL of your Camunda instance (e.g., `https://your-camunda-server.com`)
- `CAMUNDA_USER`: Username for authentication
- `CAMUNDA_PASS`: Password for authentication

## 3. Core Concepts

### What is BPMN Deployment?

BPMN deployment is the process of uploading business process definitions to the Camunda engine, making them available for execution. Each deployment:

- Contains one or more BPMN files
- Has a unique deployment name
- Can filter duplicates to avoid redundant deployments
- Tracks deployment history and versions

### Key Deployment Features

1. **Deploy Changed Only**: Only deploy files that have been modified
2. **Duplicate Filtering**: Prevent redeployment of unchanged processes (requires stable deployment names)
3. **Atomic Deployments**: All files in a deployment succeed or fail together
4. **Version Management**: Camunda automatically versions process definitions

### Stable Deployment Names

A stable deployment name is crucial for Camunda's duplicate filtering mechanism. The deployment name, combined with resource names and content hashes, determines whether a deployment is considered a duplicate. If the deployment name changes between deployments (e.g., by including timestamps), Camunda will create new process definitions even when the BPMN content is identical, leading to:

- Multiple versions of the same process
- Increased database storage
- Confusion about which version is active
- Defeated purpose of duplicate filtering

## 4. Authentication

Camunda 7 uses HTTP Basic Authentication for API access.

### Authentication Headers

```
Authorization: Basic base64(username:password)
```

### Testing Connectivity

Before deployment, verify your connection:

```
GET {CAMUNDA_URL}/engine-rest/version
Headers:
  Authorization: Basic {base64_encoded_credentials}
```

Expected response: HTTP 200 with JSON containing version information:
```json
{
  "version": "7.23.0"
}
```

## 5. Deployment Process

### Step 1: Prepare Deployment

1. **Collect BPMN Files**
   - Identify all `.bpmn` files to deploy
   - Validate XML structure (well-formed XML)
   - Ensure files are accessible in your build environment

2. **Generate Deployment Name**
   
   **⚠️ IMPORTANT**: The deployment name MUST be stable across deployments for Camunda's duplicate filtering to work correctly. Use a consistent naming pattern without timestamps or random values.
   
   ```
   deployment_name = "{project_name}-{branch_name}"
   ```
   Example: `my-project-main`
   
   **Why stable names matter**: Camunda uses the deployment name along with resource names and content hashes to detect duplicates. If the deployment name changes with each deployment (e.g., includes timestamps), Camunda will treat each deployment as new, creating duplicate process definitions and defeating the purpose of duplicate filtering.

### Step 2: Create Deployment

**Endpoint**: `POST {CAMUNDA_URL}/engine-rest/deployment/create`

**Request Type**: `multipart/form-data`

**Form Parameters**:
- `deployment-name`: String - Name of the deployment (required)
- `deploy-changed-only`: Boolean - Only deploy changed resources (optional, default: false, recommended: `true`)
- `enable-duplicate-filtering`: Boolean - Filter duplicate deployments (optional, default: false, recommended: `true`)
- `file`: File - BPMN file(s) to deploy (required, can be multiple files)

For detailed request structure and examples, refer to the [official Camunda REST API documentation](https://docs.camunda.org/rest/camunda-bpm-platform/7.23/#tag/Deployment/operation/createDeployment).

### Step 3: Verify Deployment

After successful deployment, verify it exists:

**Endpoint**: `GET {CAMUNDA_URL}/engine-rest/deployment?name={deployment_name}`

**Expected Response**: JSON array containing the deployment details.

## 6. Change Detection

### Option 1: Version Control Integration

If using Git or similar VCS:

1. **Get Changed Files**
   ```
   git diff --name-only --diff-filter=ACM {previous_commit} {current_commit} | grep '\.bpmn$'
   ```

2. **First Deployment**
   ```
   git ls-files | grep '\.bpmn$'
   ```

### Option 2: File Comparison

Without VCS, implement file comparison:

1. **Checksum-based**
   - Calculate hash (MD5/SHA256) of each BPMN file
   - Store hashes after successful deployment
   - Compare current hashes with stored values

2. **Timestamp-based**
   - Track last deployment timestamp
   - Compare file modification times

### Option 3: Always Deploy

For simplicity, always deploy all BPMN files and rely on Camunda's duplicate filtering.

## 7. API Implementation

### Response Handling

For detailed information about success and error response formats, refer to the [official Camunda REST API documentation for deployment creation](https://docs.camunda.org/rest/camunda-bpm-platform/7.23/#tag/Deployment/operation/createDeployment).

**Success**: HTTP 200 with deployment details including deployed process definitions
**Error**: HTTP 400/500 with error details

## 8. Error Handling

### Common Errors and Solutions

1. **Authentication Failed (401)**
   - Verify credentials
   - Check authorization header format
   - Ensure user has deployment permissions

2. **Connection Failed**
   - Verify network connectivity
   - Check firewall rules
   - Validate Camunda URL

3. **Invalid BPMN (400)**
   - Validate XML structure
   - Check BPMN schema compliance
   - Ensure process IDs are unique

4. **Server Error (500)**
   - Check Camunda server logs
   - Verify server resources
   - Ensure database connectivity

### Retry Strategy

Implement exponential backoff for transient failures:
```
retry_delays = [1, 2, 4, 8, 16] seconds
max_retries = 5
```

## 9. Best Practices

### 1. Deployment Naming Convention

**Critical**: Use stable, consistent deployment names without timestamps or random values. This is essential for Camunda's duplicate filtering mechanism to work properly.

```
{project}-{environment}-{branch}
```

Good examples (stable names):
- `orderprocess-prod-main`
- `payment-staging-feature-123`
- `customer-service-dev-develop`

Bad examples (unstable names):
- `orderprocess-prod-main-20231115-103045` ❌ (includes timestamp)
- `payment-staging-feature-123-uuid-abc123` ❌ (includes random UUID)
- `customer-service-dev-${BUILD_NUMBER}` ❌ (changes with each build)

**Remember**: Changing the deployment name will cause Camunda to create new process definition versions even if the BPMN content hasn't changed.

### 2. Environment Separation

- Use different Camunda instances for dev/staging/prod
- Implement environment-specific configuration
- Never hardcode credentials

### 3. Pre-deployment Validation

Before deployment:
- Validate XML syntax
- Check for required process IDs
- Verify no ID conflicts
- Test locally if possible

### 4. Logging and Monitoring

Log all deployment activities:
- Timestamp
- Files deployed
- Success/failure status
- Error messages
- Deployment ID

### 5. Rollback Strategy

Maintain deployment history:
- Keep previous BPMN versions
- Document deployment-to-commit mapping
- Implement rollback procedures

## 10. Code Examples

### Python Example

```python
import requests
from pathlib import Path
import base64

class CamundaDeployer:
    def __init__(self, url, username, password):
        self.url = url.rstrip('/')
        self.auth = base64.b64encode(f"{username}:{password}".encode()).decode()
    
    def test_connection(self):
        """Test connection to Camunda"""
        headers = {"Authorization": f"Basic {self.auth}"}
        response = requests.get(
            f"{self.url}/engine-rest/version",
            headers=headers
        )
        return response.status_code == 200
    
    def deploy_bpmn_files(self, deployment_name, bpmn_files):
        """Deploy BPMN files to Camunda"""
        headers = {"Authorization": f"Basic {self.auth}"}
        
        # Prepare multipart form data
        files = []
        data = {
            "deployment-name": deployment_name,
            "deploy-changed-only": "true",
            "enable-duplicate-filtering": "true"
        }
        
        # Add BPMN files
        for file_path in bpmn_files:
            with open(file_path, 'rb') as f:
                files.append(('file', (Path(file_path).name, f, 'application/xml')))
        
        # Send deployment request
        response = requests.post(
            f"{self.url}/engine-rest/deployment/create",
            headers=headers,
            data=data,
            files=files
        )
        
        return response.status_code == 200, response.json()
    
    def verify_deployment(self, deployment_name):
        """Verify deployment exists"""
        headers = {"Authorization": f"Basic {self.auth}"}
        response = requests.get(
            f"{self.url}/engine-rest/deployment",
            headers=headers,
            params={"name": deployment_name}
        )
        
        if response.status_code == 200:
            deployments = response.json()
            return any(d['name'] == deployment_name for d in deployments)
        return False

# Usage
deployer = CamundaDeployer(
    url="https://camunda.example.com",
    username="admin",
    password="password"
)

if deployer.test_connection():
    # Use stable deployment name without timestamps or random values
    # This ensures Camunda's duplicate filtering works correctly
    success, result = deployer.deploy_bpmn_files(
        deployment_name="my-project-main",  # Stable name format: {project}-{branch}
        bpmn_files=["process1.bpmn", "process2.bpmn"]
    )
    
    if success:
        print(f"Deployment successful: {result['id']}")
    else:
        print(f"Deployment failed: {result}")
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

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "Deployment successful"
  echo "$RESPONSE_BODY" | jq .
else
  echo "Deployment failed with HTTP $HTTP_CODE"
  echo "$RESPONSE_BODY"
  exit 1
fi
```

### Node.js Example

```javascript
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

class CamundaDeployer {
  constructor(url, username, password) {
    this.url = url.replace(/\/$/, '');
    this.auth = Buffer.from(`${username}:${password}`).toString('base64');
  }

  async testConnection() {
    try {
      const response = await axios.get(
        `${this.url}/engine-rest/version`,
        {
          headers: { Authorization: `Basic ${this.auth}` }
        }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async deployBpmnFiles(deploymentName, bpmnFiles) {
    const form = new FormData();
    
    // Add form fields
    form.append('deployment-name', deploymentName);
    form.append('deploy-changed-only', 'true');
    form.append('enable-duplicate-filtering', 'true');
    
    // Add BPMN files
    for (const filePath of bpmnFiles) {
      const fileName = path.basename(filePath);
      const fileStream = fs.createReadStream(filePath);
      form.append('file', fileStream, {
        filename: fileName,
        contentType: 'application/xml'
      });
    }

    try {
      const response = await axios.post(
        `${this.url}/engine-rest/deployment/create`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Basic ${this.auth}`
          }
        }
      );
      
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || error.message 
      };
    }
  }
}

// Usage
async function deploy() {
  const deployer = new CamundaDeployer(
    process.env.CAMUNDA_URL,
    process.env.CAMUNDA_USER,
    process.env.CAMUNDA_PASS
  );

  if (await deployer.testConnection()) {
    // Use stable deployment name - critical for duplicate filtering
    const deploymentName = 'my-project-main'; // Format: {project}-{branch}
    
    const result = await deployer.deployBpmnFiles(
      deploymentName,
      ['process1.bpmn', 'process2.bpmn']
    );
    
    if (result.success) {
      console.log('Deployment successful:', result.data.id);
    } else {
      console.error('Deployment failed:', result.error);
      process.exit(1);
    }
  } else {
    console.error('Cannot connect to Camunda');
    process.exit(1);
  }
}

deploy();
```

## 11. Troubleshooting

### Debug Checklist

1. **Connection Issues**
   - [ ] Verify Camunda URL is correct
   - [ ] Check network connectivity
   - [ ] Confirm firewall allows HTTPS/HTTP traffic
   - [ ] Test with curl or browser

2. **Authentication Issues**
   - [ ] Verify username and password
   - [ ] Check user permissions in Camunda
   - [ ] Ensure proper encoding of credentials

3. **Deployment Failures**
   - [ ] Validate BPMN XML syntax
   - [ ] Check for unique process IDs
   - [ ] Verify file paths are correct
   - [ ] Review Camunda server logs

4. **Performance Issues**
   - [ ] Deploy files in batches
   - [ ] Implement proper timeouts
   - [ ] Consider async processing

## 12. Security Considerations

1. **Credential Management**
   - Never hardcode credentials
   - Use environment variables
   - Implement secret management
   - Rotate credentials regularly

2. **Network Security**
   - Use HTTPS for API calls
   - Implement IP whitelisting if possible
   - Use VPN for sensitive environments
   - Monitor API access logs

3. **File Validation**
   - Validate BPMN files before deployment
   - Scan for malicious content
   - Limit file sizes
   - Implement access controls

## 13. Conclusion

This guide provides a comprehensive, language-agnostic approach to implementing automated BPMN deployments. The key principles remain the same regardless of your technology stack:

1. Authenticate securely with Camunda
2. Prepare BPMN files for deployment
3. Use the REST API to create deployments
4. Handle errors gracefully
5. Verify successful deployments

By following these guidelines, you can build a robust automated deployment system that works reliably in environments behind firewalls or with restricted network access.