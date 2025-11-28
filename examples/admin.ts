#!/usr/bin/env npx tsx
/**
 * Admin CLI for managing Pip
 *
 * Usage:
 *   pnpm admin generate-codes 10    # Generate 10 invite codes
 *   pnpm admin list-codes           # List all invite codes
 *   pnpm admin create-admin email   # Create an admin user
 *   pnpm admin list-users           # List all users
 */

import { createDatabaseProvider } from '@zero-agent/core';
import { hashPassword } from '../packages/server/src/services/auth.js';

// Generate random invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Pip Admin CLI

Usage:
  pnpm admin generate-codes [count]  - Generate invite codes (default: 1)
  pnpm admin list-codes              - List all invite codes
  pnpm admin create-admin <email> <password> [name]  - Create an admin user
  pnpm admin list-users              - List all users
`);
    process.exit(0);
  }

  // Initialize database
  const db = await createDatabaseProvider({
    provider: 'sqlite',
    connection: {
      type: 'sqlite',
      filename: process.env.DB_PATH || './data/pip.db',
    },
  });

  await db.connect();
  console.log('Connected to database\n');

  try {
    switch (command) {
      case 'generate-codes': {
        const count = parseInt(args[1]) || 1;
        const codes: string[] = [];

        for (let i = 0; i < count; i++) {
          const code = generateInviteCode();
          await db.createInviteCode(code, 'admin-cli');
          codes.push(code);
        }

        console.log(`Generated ${count} invite code(s):\n`);
        codes.forEach((code) => console.log(`  ${code}`));
        console.log('\nShare these codes with beta testers to sign up.');
        break;
      }

      case 'list-codes': {
        const codes = await db.listInviteCodes();

        if (codes.length === 0) {
          console.log('No invite codes found.');
          break;
        }

        console.log('Invite Codes:\n');
        console.log('CODE        STATUS      USED BY                CREATED');
        console.log('─'.repeat(70));

        for (const code of codes) {
          const status = code.usedBy ? 'Used' : 'Available';
          const usedBy = code.usedBy || '-';
          const created = new Date(code.createdAt).toISOString().split('T')[0];
          console.log(
            `${code.code.padEnd(12)}${status.padEnd(12)}${usedBy.padEnd(23)}${created}`
          );
        }

        console.log(`\nTotal: ${codes.length} codes (${codes.filter((c) => !c.usedBy).length} available)`);
        break;
      }

      case 'create-admin': {
        const email = args[1];
        const password = args[2];
        const name = args[3];

        if (!email || !password) {
          console.error('Usage: pnpm admin create-admin <email> <password> [name]');
          process.exit(1);
        }

        const passwordHash = await hashPassword(password);
        const user = await db.createUser({
          email,
          passwordHash,
          name,
          isAdmin: true,
        });

        console.log(`Admin user created:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.name || '(not set)'}`);
        console.log(`  Admin: Yes`);
        break;
      }

      case 'list-users': {
        // We'll need to add a listUsers method, for now use a workaround
        console.log('Listing users is not yet implemented.');
        console.log('Use SQLite CLI: sqlite3 data/pip.db "SELECT id, email, name, is_admin, datetime(created_at/1000, \'unixepoch\') FROM users"');
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } finally {
    await db.disconnect();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
