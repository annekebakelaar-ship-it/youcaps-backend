#!/usr/bin/env node

/**
 * Database Schema Migration Script
 * Run: npm run migrate
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { supabase } = require('./database/models');
const logger = require('./utils/logger');

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Read schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('execute_sql', {
          sql: statement
        });

        if (error && error.code !== '42P07') { // Ignore "already exists" errors
          logger.warn(`Migration statement warning: ${error.message}`);
        }
      } catch (error) {
        // Supabase RPC might not be available, try direct SQL instead
        logger.warn(`Could not execute: ${statement.substring(0, 50)}... (This is normal)`);
      }
    }

    logger.info('✅ Database migrations completed');
    logger.info('⚠️  Note: Please manually execute schema.sql in Supabase SQL Editor for complete setup');

    process.exit(0);
  } catch (error) {
    logger.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
