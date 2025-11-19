# Changelog

All notable changes to Zero Agent will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **CLI Chat Interface** - Interactive REPL for conversational Xero queries (`pnpm chat`)
- **Native Tool Calling** - Anthropic Claude tool use integration for automatic Xero API access
- **Chat History Viewer** - View conversation history from SQLite database
- **Documentation**:
  - CHAT_GUIDE.md - Complete CLI usage guide
  - Updated README.md with quick start instructions
- AWS-based serverless architecture (Lambda, DynamoDB, Cognito, S3/CloudFront)
- Terraform infrastructure-as-code definitions
- DynamoDB single-table design for sessions, users, cache, and memory
- AWS Secrets Manager integration for OAuth token security
- IAM roles and policies for Lambda functions
- **Memory Persistence System** (ADR-007):
  - Core memory (permanent, free tier): preferences, milestones, relationship stage
  - Extended memory (paid tier): conversation history, semantic search, deep learning
  - Relationship progression: colleague (0-3mo) → partner (3-12mo) → friend (12mo+)
  - Graceful degradation: users retain core memory when subscription lapses
- **Voice-to-Voice Integration** (ADR-008):
  - Premium tier feature ($29/month Pro, unlimited Enterprise)
  - AWS Transcribe for speech-to-text (streaming)
  - Amazon Polly or ElevenLabs for text-to-speech
  - WebSocket infrastructure for real-time audio
  - < 2s latency target
- **Subscription Model**:
  - Free tier: text-only, 50 requests/month, core memory
  - Pro tier: $29/month, voice (1000 min), extended memory, 1000 requests
  - Enterprise tier: custom pricing, unlimited usage, SSO, custom integrations
  - Stripe integration for billing
  - Usage tracking (voice minutes, agent requests)

### Changed
- **BREAKING**: Project renamed from "Xero Agent" to "Zero Agent"
  - All package names updated: `@xero-agent/*` → `@zero-agent/*`
  - All import statements and dependencies updated
  - All documentation updated (README, ARCHITECTURE, CLAUDE, STATUS)
- **Tool Calling Approach**: Switched from JSON parsing to native Anthropic tool use
  - More reliable tool detection and execution
  - Automatic parameter extraction and validation
- **BREAKING**: Migrated from Firebase to AWS infrastructure
- Updated all documentation to reflect AWS architecture
- Architecture decision records updated:
  - ADR-001: AWS over Firebase
  - ADR-007: Memory persistence and relationship building
  - ADR-008: Voice-to-voice integration (premium tier)

---

## [0.1.0] - 2025-11-12

### Summary
Initial project setup with documentation structure and architectural planning.

### Added
- **Documentation Foundation** - Established 7-document structure following project-documentation-template skill
- **Architecture Planning** - Defined multi-tier serverless architecture on AWS
- **Technology Stack** - Selected AWS (Lambda, DynamoDB, Cognito) + Claude Agent SDK + MCP + React
- **Database Schema** - Defined DynamoDB single-table design with access patterns
- **Security Model** - Token encryption in Secrets Manager, IAM policies, Cognito authentication
- **ADRs** - Documented key architectural decisions (AWS, Terraform, DynamoDB, Agent SDK, MCP, PWA)

### Changed
- Migrated from draft documentation to structured templates
- Archived old documentation drafts to `docs/archive/`

---

## Version Guidelines

- **Major (X.0.0)**: Breaking changes, API changes, schema migrations
- **Minor (0.X.0)**: New features (backward compatible)
- **Patch (0.0.X)**: Bug fixes, security patches

---

[Unreleased]: https://github.com/your-org/zero-agent/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/zero-agent/releases/tag/v0.1.0
