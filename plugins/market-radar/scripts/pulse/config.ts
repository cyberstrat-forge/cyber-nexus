/**
 * Pulse configuration management module
 *
 * Handles loading, validation, and manipulation of pulse-sources.json
 *
 * @module pulse/config
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  PulseSource,
  PulseSourcesConfig,
  PulseError,
} from './types.js';

// ==================== Constants ====================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
const SCHEMAS_DIR = path.resolve(PLUGIN_ROOT, 'schemas');

/** Default config file name */
export const CONFIG_FILENAME = 'pulse-sources.json';

// ==================== Schema Validation ====================

let validateSchema: ReturnType<Ajv['compile']> | null = null;

/**
 * Get compiled schema validator (lazy loaded)
 */
function getValidator(): ReturnType<Ajv['compile']> {
  if (!validateSchema) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    const schemaPath = path.join(SCHEMAS_DIR, 'pulse-sources.schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    validateSchema = ajv.compile(schema);
  }
  return validateSchema;
}

// ==================== Config Path Functions ====================

/**
 * Get default config file path
 *
 * The config file is stored in .claude-plugin/ directory at plugin root.
 *
 * @returns Absolute path to the default config file
 */
export function getDefaultConfigPath(): string {
  return path.join(PLUGIN_ROOT, '.claude-plugin', CONFIG_FILENAME);
}

/**
 * Generate user-friendly error message for missing config
 *
 * @param configPath - Path to the config file that was not found
 * @returns Formatted error message in Chinese
 */
export function generateConfigNotFoundMessage(configPath: string): string {
  return `配置文件不存在: ${configPath}

请先创建配置文件，示例如下:

\`\`\`json
{
  "sources": [
    {
      "name": "cyber-pulse",
      "url": "https://api.example.com",
      "key_ref": "CYBER_PULSE_API_KEY"
    }
  ],
  "default_source": "cyber-pulse"
}
\`\`\`

创建命令:
  mkdir -p ${path.dirname(configPath)}
  # 编辑 ${configPath} 文件添加上述内容
`;
}

// ==================== Config Loading ====================

/**
 * Validate config against JSON Schema
 *
 * @param config - Config object to validate
 * @throws {PulseError} If validation fails with code CONFIG_PARSE_ERROR
 */
export function validateConfig(config: unknown): asserts config is PulseSourcesConfig {
  const validate = getValidator();

  if (!validate(config)) {
    const errors = validate.errors?.map(err => {
      const path = err.instancePath || '(root)';
      return `${path}: ${err.message}`;
    }) || ['Unknown validation error'];

    throw new PulseError(
      'CONFIG_PARSE_ERROR',
      `配置校验失败:\n${errors.map(e => `  - ${e}`).join('\n')}`,
      { errors: validate.errors }
    );
  }

  // At this point, config is validated as PulseSourcesConfig
  // But we still need to check default_source
  const typedConfig = config as PulseSourcesConfig;

  // Additional validation: default_source must exist in sources
  const sourceNames = new Set(typedConfig.sources.map((s: PulseSource) => s.name));
  if (!sourceNames.has(typedConfig.default_source)) {
    throw new PulseError(
      'CONFIG_PARSE_ERROR',
      `默认源 "${typedConfig.default_source}" 不存在于 sources 列表中`,
      { default_source: typedConfig.default_source, available: [...sourceNames] }
    );
  }
}

/**
 * Load and validate config from file
 *
 * @param configPath - Optional path to config file (defaults to .claude-plugin/pulse-sources.json)
 * @returns Validated config object
 * @throws {PulseError} If file not found or validation fails
 */
export function loadConfig(configPath?: string): PulseSourcesConfig {
  const resolvedPath = configPath ? path.resolve(configPath) : getDefaultConfigPath();

  if (!fs.existsSync(resolvedPath)) {
    throw new PulseError(
      'CONFIG_NOT_FOUND',
      generateConfigNotFoundMessage(resolvedPath),
      { path: resolvedPath }
    );
  }

  let config: unknown;
  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    config = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PulseError(
      'CONFIG_PARSE_ERROR',
      `配置文件解析失败: ${message}`,
      { path: resolvedPath, error }
    );
  }

  validateConfig(config);
  return config;
}

// ==================== Source Management ====================

/**
 * Get source configuration by name
 *
 * @param config - Config object
 * @param name - Source name (defaults to default_source)
 * @returns Source configuration
 * @throws {PulseError} If source not found
 */
export function getSource(config: PulseSourcesConfig, name?: string): PulseSource {
  const sourceName = name || config.default_source;
  const source = config.sources.find(s => s.name === sourceName);

  if (!source) {
    const available = config.sources.map(s => s.name);
    throw new PulseError(
      'SOURCE_NOT_FOUND',
      `源 "${sourceName}" 不存在。可用源: ${available.join(', ')}`,
      { requested: sourceName, available }
    );
  }

  return source;
}

/**
 * Get API key from environment variable
 *
 * @param source - Source configuration
 * @returns API key value
 * @throws {PulseError} If environment variable not set
 */
export function getApiKey(source: PulseSource): string {
  const apiKey = process.env[source.key_ref];

  if (!apiKey) {
    throw new PulseError(
      'ENV_VAR_NOT_SET',
      `环境变量 "${source.key_ref}" 未设置。

设置方法:
  export ${source.key_ref}="your-api-key"

或在 ~/.zshrc 或 ~/.bashrc 中添加:
  ${source.key_ref}="your-api-key"
`,
      { key_ref: source.key_ref, source: source.name }
    );
  }

  return apiKey;
}

/**
 * Check if API key is set for a source
 *
 * @param source - Source configuration
 * @returns true if API key is set, false otherwise
 */
export function hasApiKey(source: PulseSource): boolean {
  return Boolean(process.env[source.key_ref]);
}

// ==================== Config Modification ====================

/**
 * Save config to file
 *
 * @param config - Config object to save
 * @param configPath - Optional path to config file
 */
export function saveConfig(config: PulseSourcesConfig, configPath?: string): void {
  const resolvedPath = configPath ? path.resolve(configPath) : getDefaultConfigPath();
  const dir = path.dirname(resolvedPath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = JSON.stringify(config, null, 2) + '\n';
  fs.writeFileSync(resolvedPath, content, 'utf-8');
}

/**
 * Add a new source to config
 *
 * @param config - Config object to modify
 * @param source - Source to add
 * @throws {PulseError} If source name already exists
 */
export function addSource(config: PulseSourcesConfig, source: PulseSource): void {
  const exists = config.sources.some(s => s.name === source.name);
  if (exists) {
    throw new PulseError(
      'CONFIG_PARSE_ERROR',
      `源 "${source.name}" 已存在`,
      { name: source.name }
    );
  }

  config.sources.push(source);
}

/**
 * Remove a source from config
 *
 * @param config - Config object to modify
 * @param name - Source name to remove
 * @throws {PulseError} If source not found or is the default source
 */
export function removeSource(config: PulseSourcesConfig, name: string): void {
  const index = config.sources.findIndex(s => s.name === name);

  if (index === -1) {
    throw new PulseError(
      'SOURCE_NOT_FOUND',
      `源 "${name}" 不存在`,
      { name }
    );
  }

  if (config.default_source === name) {
    throw new PulseError(
      'CONFIG_PARSE_ERROR',
      `无法删除默认源 "${name}"。请先设置其他默认源。`,
      { name }
    );
  }

  config.sources.splice(index, 1);
}

/**
 * Set the default source
 *
 * @param config - Config object to modify
 * @param name - Source name to set as default
 * @throws {PulseError} If source not found
 */
export function setDefaultSource(config: PulseSourcesConfig, name: string): void {
  const source = config.sources.find(s => s.name === name);

  if (!source) {
    const available = config.sources.map(s => s.name);
    throw new PulseError(
      'SOURCE_NOT_FOUND',
      `源 "${name}" 不存在。可用源: ${available.join(', ')}`,
      { requested: name, available }
    );
  }

  config.default_source = name;
}

// ==================== Display Helpers ====================

/**
 * Format sources list for display
 *
 * @param config - Config object
 * @returns Formatted string for terminal output
 */
export function formatSourcesList(config: PulseSourcesConfig): string {
  const lines: string[] = ['配置的情报源列表:', ''];

  for (const source of config.sources) {
    const isDefault = source.name === config.default_source;
    const hasKey = hasApiKey(source);
    const marker = isDefault ? ' *' : '  ';
    const keyStatus = hasKey ? '[已配置 API Key]' : '[未配置 API Key]';

    lines.push(`${marker} ${source.name}`);
    lines.push(`    URL: ${source.url}`);
    lines.push(`    API Key: ${source.key_ref} ${keyStatus}`);
    lines.push('');
  }

  lines.push(`默认源: ${config.default_source}`);

  return lines.join('\n');
}