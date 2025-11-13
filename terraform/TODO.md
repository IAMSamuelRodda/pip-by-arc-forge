# Terraform TODO - Missing Resources

**Status**: Lambda functions complete, but missing API Gateway, Cognito, S3, and CloudFront resources

## Completed ✅

1. **DynamoDB** (`dynamodb.tf`) - Single-table design
2. **IAM Roles** (`iam.tf`) - Agent, MCP, Auth roles with least-privilege policies
3. **Secrets Manager** (`secrets.tf`) - OAuth tokens, API keys, client secrets
4. **Lambda Functions** (`lambda.tf`) - Agent, MCP, Auth functions with CloudWatch logs
5. **Variables** (`variables.tf`) - Configuration inputs
6. **Outputs** (`outputs.tf`) - Export values for CLI/scripts
7. **Versions** (`versions.tf`) - Provider configuration

## Missing Resources ⚠️

### Priority 1: Required for Deployment

#### 1. API Gateway (`api-gateway.tf`) - **CRITICAL**
**Why needed**: Lambda functions need HTTP endpoints for PWA and OAuth callbacks

**Resources to create**:
- `aws_api_gateway_rest_api.main` - REST API
- `aws_api_gateway_resource` - Routes: `/chat`, `/sessions`, `/auth/*`
- `aws_api_gateway_method` - HTTP methods (GET, POST, OPTIONS)
- `aws_api_gateway_integration` - Lambda integrations
- `aws_api_gateway_authorizer` - Cognito authorizer
- `aws_api_gateway_deployment` - Deploy API
- `aws_api_gateway_stage.main` - Stage (dev, prod)
- CORS configuration for all routes

**Routes needed**:
```
POST   /chat                        → Agent Lambda
POST   /sessions                    → Agent Lambda
GET    /sessions/:id                → Agent Lambda
GET    /auth/xero/login             → Auth Lambda
GET    /auth/xero/callback          → Auth Lambda
POST   /auth/xero/refresh           → Auth Lambda
GET    /auth/status                 → Auth Lambda
```

**Estimated lines**: ~300 lines

#### 2. Cognito (`cognito.tf`) - **CRITICAL**
**Why needed**: User authentication for PWA

**Resources to create**:
- `aws_cognito_user_pool.main` - User pool
- `aws_cognito_user_pool_client.main` - App client
- `aws_cognito_user_pool_domain` - Hosted UI domain
- Password policies, MFA settings
- Custom attributes (xero_tenant_id, subscription_tier)

**Estimated lines**: ~150 lines

### Priority 2: Required for PWA Hosting

#### 3. S3 + CloudFront (`hosting.tf`)
**Why needed**: Host React PWA app

**Resources to create**:
- `aws_s3_bucket.pwa` - Static file hosting
- `aws_s3_bucket_public_access_block` - Block public access
- `aws_s3_bucket_policy` - CloudFront read access
- `aws_cloudfront_distribution.pwa` - CDN for PWA
- `aws_cloudfront_origin_access_identity` - S3 access
- CloudFront cache behavior, SSL certificate

**Estimated lines**: ~200 lines

**Note**: Can be deferred if testing with local PWA development server initially

### Priority 3: Optional Enhancements

#### 4. Route53 (`dns.tf`)
**Why needed**: Custom domain (deferred to production per ADR-010)

**Status**: NOT NEEDED for dev environment (use CloudFront URL)

#### 5. WAF (`waf.tf`)
**Why needed**: API protection, rate limiting

**Status**: Defer to production

#### 6. CloudWatch Alarms (`monitoring.tf`)
**Why needed**: Error alerts, latency monitoring

**Status**: Defer to post-deployment

## Deployment Options

### Option A: Minimal Viable Deployment (MVP)
**Create**: API Gateway + Cognito
**Deploy**: Lambda functions + DynamoDB + Secrets Manager
**Test with**: Local PWA dev server (no S3/CloudFront)
**Time**: 2-3 hours to create Terraform resources
**Cost**: ~$0.80/month (same as current)

### Option B: Full Dev Environment
**Create**: API Gateway + Cognito + S3 + CloudFront
**Deploy**: Complete infrastructure
**Test with**: Deployed PWA on CloudFront
**Time**: 4-5 hours to create all resources
**Cost**: ~$0.80/month (S3 + CloudFront free tier)

### Option C: Temporary Manual Setup
**Create**: API Gateway + Cognito via AWS Console (quick)
**Deploy**: Lambda functions via Terraform
**Test**: End-to-end flow
**Migrate**: Create Terraform resources later for IaC
**Time**: 30 minutes manual setup
**Cost**: ~$0.80/month
**Downside**: Not Infrastructure as Code (manual drift risk)

## Recommended Approach

**Phase 1** (Now): Create API Gateway + Cognito Terraform resources (Option A)
- Unblocks Lambda deployment
- Enables end-to-end testing
- Keeps cost <$1/month

**Phase 2** (Next session): Add S3 + CloudFront (Option B)
- Deploy PWA to production-like environment
- Test full user flow

**Phase 3** (Post-deployment): Add monitoring, WAF, alarms

## Next Steps

1. **Create `api-gateway.tf`** with REST API and Lambda integrations
2. **Create `cognito.tf`** with user pool and app client
3. **Update `outputs.tf`** to export API Gateway URLs
4. **Test deployment**: `terraform plan` → `terraform apply`
5. **Verify**: Check Lambda functions are created and accessible

## References

- API Gateway Lambda Integration: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-integrations.html
- Cognito User Pools: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html
- Lambda + API Gateway: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
