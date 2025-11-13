# Lambda Functions

This directory contains AWS Lambda function implementations for the Xero Agent serverless architecture.

## Functions

### 1. MCP Lambda (`mcp/`)
**Purpose**: Wraps the MCP Xero Server for Lambda invocation

**Trigger**: Invoked by Agent Lambda when MCP tools are needed

**Key Responsibilities**:
- Spawns MCP server process with stdio transport
- Routes tool calls to appropriate MCP handlers
- Returns tool execution results to Agent Lambda

**Environment Variables**:
- `MCP_SERVER_PATH`: Path to compiled MCP server (default: `/opt/nodejs/mcp-xero-server/dist/index.js`)
- `TENANT_ID`: Xero tenant ID
- `USER_ID`: User ID for token lookup
- `AWS_REGION`: AWS region

### 2. Agent Lambda (`agent/`)
**Purpose**: Main orchestrator that processes user messages via Claude Agent SDK

**Trigger**: API Gateway (POST /chat, GET /sessions, etc.)

**Key Responsibilities**:
- Receives messages from PWA via API Gateway
- Orchestrates conversation flow with Claude API
- Invokes MCP Lambda for Xero tool execution
- Manages session/memory in DynamoDB

**Environment Variables**:
- `ANTHROPIC_API_KEY`: Claude API key
- `MCP_LAMBDA_ARN`: ARN of MCP Lambda function
- `DYNAMODB_TABLE`: DynamoDB table name
- `AWS_REGION`: AWS region

**API Routes**:
- `POST /chat` - Send message, get response
- `POST /sessions` - Create new session
- `GET /sessions/:id` - Get conversation history

### 3. Auth Lambda (`auth/`)
**Purpose**: Handles Xero OAuth 2.0 authorization flow

**Trigger**: API Gateway (GET /auth/xero/login, GET /auth/xero/callback, etc.)

**Key Responsibilities**:
- Initiates OAuth flow with Xero
- Exchanges authorization code for tokens
- Stores tokens in Secrets Manager (per-user)
- Refreshes expired access tokens

**Environment Variables**:
- `XERO_CLIENT_ID`: Xero OAuth client ID
- `XERO_CLIENT_SECRET_ARN`: ARN of Secrets Manager secret
- `REDIRECT_URI`: OAuth callback URL (API Gateway URL)
- `FRONTEND_URL`: PWA URL for post-auth redirect
- `AWS_REGION`: AWS region

**API Routes**:
- `GET /auth/xero/login` - Redirect to Xero for authorization
- `GET /auth/xero/callback` - OAuth callback from Xero
- `POST /auth/xero/refresh` - Refresh access token
- `GET /auth/status` - Check authentication status

## Building Lambda Packages

### Build All Functions
```bash
# From repository root
pnpm build:lambda
```

### Build Individual Function
```bash
# MCP Lambda
cd functions/mcp
pnpm build

# Agent Lambda
cd functions/agent
pnpm build

# Auth Lambda
cd functions/auth
pnpm build
```

This will:
1. Compile TypeScript to JavaScript
2. Install production dependencies
3. Create deployment zip file (e.g., `mcp-lambda.zip`)

## Deploying to AWS

### Prerequisites
1. Build all Lambda packages: `pnpm build:lambda`
2. Configure Terraform variables in `terraform/terraform.tfvars`
3. Ensure AWS credentials are configured

### Deploy with Terraform
```bash
cd terraform
terraform workspace new dev  # First time only
terraform apply
```

Terraform will:
- Upload Lambda zip files to S3
- Create Lambda functions with correct IAM roles
- Configure API Gateway routes
- Set environment variables

### Manual Deployment (Development)
```bash
# Upload Lambda function
aws lambda update-function-code \
  --function-name xero-agent-dev-mcp \
  --zip-file fileb://functions/mcp/mcp-lambda.zip \
  --region us-east-1
```

## Lambda Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         PWA (React)                         │
│                    CloudFront + S3                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│  Routes: /chat, /sessions, /auth/*                          │
│  Auth: Cognito User Pool                                    │
└─────┬───────────────────────────────────┬───────────────────┘
      │                                   │
      │ /chat                             │ /auth/*
      ▼                                   ▼
┌─────────────────┐              ┌──────────────────┐
│  Agent Lambda   │──────────────│  Auth Lambda     │
│                 │  Invoke      │                  │
│ - Orchestrator  │              │ - OAuth Flow     │
│ - Claude API    │              │ - Token Storage  │
│ - Session Mgmt  │              │                  │
└────────┬────────┘              └─────────┬────────┘
         │                                 │
         │ Invoke                          │ Store/Retrieve
         ▼                                 ▼
┌─────────────────┐              ┌──────────────────┐
│  MCP Lambda     │              │ Secrets Manager  │
│                 │──Read────────│                  │
│ - Xero Tools    │   Tokens     │ - OAuth Tokens   │
│ - Stdio Server  │              │ - API Keys       │
└────────┬────────┘              └──────────────────┘
         │
         │ Call Xero API
         ▼
┌─────────────────┐
│   Xero API      │
│   (External)    │
└─────────────────┘
```

## Local Development

### Test MCP Lambda Locally
```bash
cd functions/mcp
pnpm dev  # Runs tsx watch

# Test with sample event
node -e "
const handler = require('./dist/index.js').handler;
handler({
  tool: 'list_invoices',
  arguments: { cursor: null },
  tenantId: 'test-tenant',
  userId: 'test-user'
}).then(console.log);
"
```

### Test Agent Lambda with SAM
```bash
# Install AWS SAM CLI
brew install aws-sam-cli  # macOS

# Create sam template (template.yaml)
sam local start-api
```

## Environment Variables Reference

| Variable | Lambda | Required | Description |
|----------|--------|----------|-------------|
| `ANTHROPIC_API_KEY` | Agent | ✅ | Claude API key |
| `MCP_LAMBDA_ARN` | Agent | ✅ | ARN of MCP Lambda |
| `MCP_SERVER_PATH` | MCP | ⚪ | Path to MCP server (default: /opt/nodejs) |
| `XERO_CLIENT_ID` | Auth | ✅ | Xero OAuth client ID |
| `XERO_CLIENT_SECRET_ARN` | Auth | ✅ | Secrets Manager ARN |
| `REDIRECT_URI` | Auth | ✅ | OAuth callback URL |
| `FRONTEND_URL` | Auth | ✅ | PWA URL |
| `DYNAMODB_TABLE` | Agent, MCP | ✅ | DynamoDB table name |
| `AWS_REGION` | All | ✅ | AWS region (auto-set by Lambda) |

## Performance Considerations

### Cold Start Optimization
- **Agent Lambda**: 1024 MB memory (faster cold starts)
- **MCP Lambda**: 512 MB memory (sufficient for tool execution)
- **Auth Lambda**: 256 MB memory (lightweight HTTP handling)

### Provisioned Concurrency
For production (when needed):
```bash
aws lambda put-provisioned-concurrency-config \
  --function-name xero-agent-prod-agent \
  --provisioned-concurrent-executions 2
```

Cost: ~$10/month per Lambda (2 instances)

## Security

### IAM Roles
Each Lambda has a dedicated IAM role with least-privilege permissions:

- **Agent Lambda**: DynamoDB, Lambda:InvokeFunction (MCP), Secrets Manager (read API keys)
- **MCP Lambda**: Secrets Manager (read OAuth tokens), DynamoDB (read/write)
- **Auth Lambda**: Secrets Manager (read/write OAuth tokens)

### Secrets Management
- Xero OAuth tokens stored per-user: `xero-agent/oauth/{userId}`
- API keys stored centrally: `xero-agent/anthropic-api-key`
- Client secret stored centrally: `xero-agent/xero-client-secret`

## Monitoring

### CloudWatch Logs
```bash
# View Agent Lambda logs
aws logs tail /aws/lambda/xero-agent-dev-agent --follow

# View MCP Lambda logs
aws logs tail /aws/lambda/xero-agent-dev-mcp --follow
```

### CloudWatch Metrics
- `Invocations` - Function call count
- `Duration` - Execution time
- `Errors` - Error count
- `Throttles` - Rate limit hits

## Troubleshooting

### Common Issues

**1. MCP Lambda Timeout**
- Increase timeout in Terraform: `lambda_timeout_mcp = 30`
- Check MCP server logs in stderr

**2. OAuth Callback Fails**
- Verify `REDIRECT_URI` matches Xero app configuration
- Check Secrets Manager permissions
- Ensure `offline_access` scope is included

**3. Agent Lambda Memory Issues**
- Increase memory: `lambda_memory_size_agent = 2048`
- Check DynamoDB session size

**4. Cold Start Latency**
- Enable provisioned concurrency (production only)
- Optimize package size (exclude dev dependencies)

## Next Steps

1. **Complete Agent Orchestrator**: Implement Claude Agent SDK integration
2. **Add Tests**: Unit tests for each Lambda function
3. **CI/CD Pipeline**: Automated build and deployment
4. **Monitoring**: CloudWatch alarms for errors/latency
5. **Cost Optimization**: Review Lambda duration, optimize memory allocation

## References

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [MCP Protocol Specification](https://modelcontextprotocol.io/specification/2025-03-26/)
- [Claude Agent SDK](https://docs.anthropic.com/en/api/agent-sdk/overview)
- [Xero OAuth 2.0](https://developer.xero.com/documentation/guides/oauth2/overview/)
