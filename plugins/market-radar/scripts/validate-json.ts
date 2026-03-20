#!/usr/bin/env node
/**
 * JSON Schema Validation Script
 *
 * Usage: npx tsx validate-json.ts <schema-name> <json-file>
 *
 * Examples:
 *   npx tsx validate-json.ts agent-result ./temp/result.json
 *   npx tsx validate-json.ts state ./.intel/state.json
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = resolve(__dirname, '../schemas');

// Schema name mapping
const SCHEMA_FILES: Record<string, string> = {
  'agent-result': 'agent-result.schema.json',
  'intelligence-output': 'intelligence-output.schema.json',
  'state': 'state.schema.json',
  'themes-config': 'themes-config.schema.json',
  'theme-state': 'theme-state.schema.json',
  'pulse-sources': 'pulse-sources.schema.json',
};

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

function validateJson(schemaName: string, jsonPath: string): ValidationResult {
  // Resolve schema file
  const schemaFile = SCHEMA_FILES[schemaName];
  if (!schemaFile) {
    return {
      valid: false,
      errors: [`Unknown schema: ${schemaName}. Available: ${Object.keys(SCHEMA_FILES).join(', ')}`],
    };
  }

  const schemaPath = resolve(SCHEMAS_DIR, schemaFile);

  // Check files exist
  if (!existsSync(schemaPath)) {
    return { valid: false, errors: [`Schema file not found: ${schemaPath}`] };
  }
  if (!existsSync(jsonPath)) {
    return { valid: false, errors: [`JSON file not found: ${jsonPath}`] };
  }

  // Load schema and data
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  const data = JSON.parse(readFileSync(resolve(jsonPath), 'utf-8'));

  // Configure Ajv
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv); // Add format validators (date-time, etc.)

  // Validate
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
    return { valid: true };
  } else {
    const errors = validate.errors?.map(err => {
      const path = err.instancePath || '(root)';
      return `${path}: ${err.message}`;
    }) || ['Unknown validation error'];
    return { valid: false, errors };
  }
}

// CLI entry point
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npx tsx validate-json.ts <schema-name> <json-file>');
  console.log('');
  console.log('Available schemas:');
  Object.keys(SCHEMA_FILES).forEach(name => console.log(`  ${name}`));
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx validate-json.ts agent-result ./temp/result.json');
  console.log('  npx tsx validate-json.ts state ./.intel/state.json');
  process.exit(1);
}

const [schemaName, jsonPath] = args;
console.log(`Schema: ${schemaName}`);
console.log(`File: ${jsonPath}`);
console.log('');

const result = validateJson(schemaName, jsonPath);

if (result.valid) {
  console.log('✓ Validation passed');
  process.exit(0);
} else {
  console.log('✗ Validation failed');
  result.errors?.forEach(err => console.log(`  - ${err}`));
  process.exit(1);
}