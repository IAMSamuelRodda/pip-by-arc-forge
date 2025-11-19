# Zero Agent - Chat Interface Guide

## Quick Start

You can chat with Zero Agent using the interactive CLI:

```bash
pnpm chat
```

This starts an interactive chat session where you can ask questions about your Xero data.

## Example Conversation

```
🤖 Zero Agent - Interactive Chat

Type your questions about Xero data. Type 'exit' to quit.

Session started: 73c37f14-d08a-498d-89c5-55d28be8171d

You: How many unpaid invoices do I have?

Agent: Based on the results, you have 1 unpaid invoice:

Invoice Details:
- Invoice Number: INV-25001
- Customer: Embark Earthworks
- Total Amount: $1,500 AUD
- Status: Authorised (Unpaid)

The invoice is currently outstanding and due for payment...

You: What is my organization name?

Agent: Thank you for providing the full details. Let me clarify the organisation information:

Organisation Details:
- Name: Samuel Rodda
- Legal Name: Samuel Rodda
- Status: Active
- Base Currency: Australian Dollar (AUD)
- Country: Australia
- Financial Year End: 30 June

You: exit

Goodbye! 👋
```

## What You Can Ask

Zero Agent can answer questions about:

- **Invoices**: "How many unpaid invoices do I have?", "Show me paid invoices"
- **Organization**: "What is my company name?", "What currency do I use?"
- **Contacts**: "List my customers", "Show me suppliers"
- **Reports**: "Show me profit and loss", "Get my balance sheet"

## How It Works

1. **Natural Language**: Just type your questions naturally
2. **Tool Execution**: The agent automatically calls the right Xero API tools
3. **Conversational**: It maintains context throughout the conversation
4. **Session Management**: Your conversation history is saved to the database

## Technical Details

- **LLM Provider**: Uses Anthropic Claude (configurable in .env)
- **Database**: SQLite for local development (see ./data/zero-agent.db)
- **OAuth**: Connects to Xero via OAuth 2.0 (tokens stored securely)
- **Session Persistence**: Conversations are saved and can be resumed

## Troubleshooting

### "No Xero authentication found"
You need to connect to Xero first. Run the OAuth server:
```bash
pnpm --filter @zero-agent/oauth-server dev
```
Then visit http://localhost:3000/auth/xero to connect.

### "Connection refused" or "Port in use"
Make sure the OAuth server is running in a separate terminal.

### "Database not found"
The database will be created automatically in `./data/zero-agent.db` on first run.

## Configuration

Edit `.env` to configure:
- `LLM_PROVIDER` - Choose your LLM (anthropic, openai, ollama)
- `DATABASE_PROVIDER` - Choose database (sqlite, dynamodb)
- `XERO_CLIENT_ID` - Your Xero app client ID
- `XERO_CLIENT_SECRET` - Your Xero app secret

## Next Steps

Want a web interface? The PWA frontend is coming soon. For now, enjoy the CLI chat!
