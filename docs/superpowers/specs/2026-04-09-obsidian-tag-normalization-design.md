# Obsidian Tag 规范化设计文档

## 背景

`intel-pull` 命令从 cyber-pulse API 拉取情报内容并生成 Markdown 文件，这些文件在用户侧通过 Obsidian 进行查看。当前生成的 frontmatter 中 `tags` 字段未经规范化处理，导致不符合 Obsidian tag 规范。

### 问题现象

| 问题类型 | 示例 | Obsidian 行为 |
|---------|------|--------------|
| 含空格 | `"threat intelligence"` | 拆分为 `#threat` 和 `#intelligence` |
| 嵌套分隔符错误 | `"geo:china"` | 应为 `geo/china`，`: ` 不被识别为嵌套分隔符 |
| 特殊符号 | `"C++"`、`"#security"` | 可能被忽略或导致解析错误 |

### Obsidian Tag 规范

允许的字符：
- 字母（a-z, A-Z）
- 数字（0-9）
- 下划线 `_`
- 连字符 `-`
- 正斜杠 `/`（用于嵌套层级）
- 中文/Unicode 字符

不允许的字符：
- 空格
- 特殊符号（`#`、`.`、`,`、`:`、`?`、`!`、`@` 等）

## 设计目标

在 `intel-pull` 输出层规范化 tags，确保生成的 Markdown 文件符合 Obsidian 使用规范。

## 处理规则

| 输入 | 处理 | 输出 |
|------|------|------|
| 空格 | 替换为 `-` | `"threat intelligence"` → `"threat-intelligence"` |
| `:` 分隔符 | 替换为 `/` | `"geo:china"` → `"geo/china"` |
| 特殊符号 | 替换为 `-` | `"C++"` → `"C-"` |
| 多个连续 `-` | 合并为单个 | `"AI,,  ML"` → `"AI-ML"` |
| 中文/Unicode | 保留 | `"威胁情报"` → `"威胁情报"` |
| 空/无效 tag | 过滤 | `"---"` → 丢弃 |

## 实现方案

### 文件位置

新建独立模块：`plugins/market-radar/scripts/utils/tag-utils.ts`

**Why**: 职责清晰、可复用、便于测试，符合项目现有的模块化风格（参考 `utils/frontmatter.ts`）。

### 核心函数

```typescript
/**
 * 规范化 Obsidian tag
 *
 * @param tag - 原始 tag
 * @returns 规范化后的 tag，或空字符串（无效 tag）
 */
export function normalizeObsidianTag(tag: string): string;

/**
 * 规范化 tag 数组，过滤无效 tag
 *
 * @param tags - 原始 tag 数组
 * @returns 规范化后的 tag 数组（不含空字符串）
 */
export function normalizeObsidianTags(tags: string[]): string[];
```

### 规范化算法

```typescript
function normalizeObsidianTag(tag: string): string {
  if (!tag || tag.trim() === '') return '';

  let result = tag.trim();

  // Step 1: `:` → `/` (preserve nesting semantics)
  result = result.replace(/:/g, '/');

  // Step 2: Allowed chars: letters, digits, _, -, /, Unicode
  // Replace all other chars with `-`
  result = result.replace(/[^\p{L}\p{N}_\-/]/gu, '-');

  // Step 3: Collapse multiple consecutive `-` to single `-`
  result = result.replace(/-+/g, '-');

  // Step 4: Remove leading/trailing `-`
  result = result.replace(/^-+|-+$/g, '');

  return result;
}
```

### 调用位置

修改 `plugins/market-radar/scripts/pulse/output.ts:115-117`：

```typescript
// Before
if (content.tags && content.tags.length > 0) {
  const escapedTags = content.tags.map(t => `"${escapeYamlString(t)}"`).join(', ');
  lines.push(`tags: [${escapedTags}]`);
}

// After
if (content.tags && content.tags.length > 0) {
  const normalizedTags = normalizeObsidianTags(content.tags);
  if (normalizedTags.length > 0) {
    const escapedTags = normalizedTags.map(t => `"${escapeYamlString(t)}"`).join(', ');
    lines.push(`tags: [${escapedTags}]`);
  }
}
```

## 测试用例

### 基本用例

| 输入 | 预期输出 | 说明 |
|------|---------|------|
| `"threat intelligence"` | `"threat-intelligence"` | 空格替换为 `-` |
| `"geo:china"` | `"geo/china"` | 嵌套分隔符 |
| `"geo:china/beijing"` | `"geo/china/beijing"` | 多层嵌套 |
| `"C++"` | `"C"` | 特殊符号+合并+尾随移除 |
| `"#security"` | `"security"` | 移除 `#` 前缀 |
| `"威胁情报"` | `"威胁情报"` | 中文保留 |
| `"AI, ML"` | `"AI-ML"` | 多字符合并 |
| `"tag.name"` | `"tag-name"` | `.` 替换 |
| `["valid", "---"]` | `["valid"]` | 数组过滤 |

### 边界用例

| 输入 | 预期输出 | 说明 |
|------|---------|------|
| `null` 或 `undefined` | `""` (过滤) | null/undefined 处理 |
| `""` | `""` (过滤) | 空字符串 |
| `"   "` | `""` (过滤) | 纯空白字符 |
| `"---"` | `""` (过滤) | 无效 tag（全特殊字符） |
| `"/geo:china/"` | `"geo/china"` | 首尾特殊字符移除 |
| `"-tag-"` | `"tag"` | 首尾 `-` 移除 |
| `"tag--name"` | `"tag-name"` | 连续 `-` 合并 |
| `"::nested::"` | `"/nested/"` → `"nested"` | 多个 `:` + 首尾处理 |
| `"  spaced  "` | `"spaced"` | trim 后处理 |
| `["", null, "valid"]` | `["valid"]` | 数组含 null/空值 |
| `[]` | `[]` | 空数组

## 影响范围

### 代码文件

| 文件 | 变更类型 |
|------|---------|
| `scripts/utils/tag-utils.ts` | 新增 |
| `scripts/pulse/output.ts` | 修改（导入+调用） |
| `scripts/utils/tag-utils.test.ts` | 新增测试用例 |

### 文档文件

| 文件 | 变更类型 |
|------|---------|
| `commands/intel-pull.md` | 更新 frontmatter 示例和说明 |
| `CHANGELOG.md` | 添加版本更新记录 |

### 命令文档更新内容

**`commands/intel-pull.md` 需更新**：

1. **Frontmatter 示例**（约第 488-489 行）：
   ```yaml
   # 当前示例
   tags: ["APT", "威胁情报"]

   # 更新为（展示规范化效果）
   tags: ["APT", "威胁情报", "geo/china"]
   ```

2. **字段说明表**（约第 528 行）添加备注：
   ```markdown
   | `tags` | array | ❌ | 标签列表（自动规范化为 Obsidian 格式） |
   ```

3. **新增说明段落**（在"输出文件格式"部分）：
   ```markdown
   ### Tag 规范化

   tags 字段会自动规范化以符合 Obsidian 标签规范：
   - 空格 → 连字符 `-`
   - 冒号 `:` → 正斜杠 `/`（保持嵌套语义）
   - 特殊符号 → 连字符 `-`
   - 保留中文/Unicode 字符
   - 无效 tag（如 `---`）会被过滤

   | 原始 tag | 规范化后 |
   |----------|---------|
   | `"threat intelligence"` | `"threat-intelligence"` |
   | `"geo:china"` | `"geo/china"` |
   | `"C++"` | `"C-"` |
   ```

## 边界情况处理

1. **空数组**：`normalizeObsidianTags([])` → `[]`
2. **全过滤**：`normalizeObsidianTags(["---", ""])` → `[]` → 不写入 `tags` 字段
3. **保留 `:` 在路径中**：仅替换 tag 中的 `:`，不影响 URL 等其他字段
4. **向后兼容**：已生成的文件不受影响，仅影响新拉取的文件
5. **null/undefined 处理**：`normalizeObsidianTags([null, "valid"])` → `["valid"]`

## 范围限制

**本次修改范围**：仅修改 `intel-pull` 命令的 `output.ts`。

**不在范围内**：
- `intel-distill` 的 `preprocess/index.ts`：该脚本在处理 cyber-pulse 文件时会保留原始 tags，不做二次规范化
- 本地文件的 tags：由用户提供，不做规范化

**设计决策**：intel-pull 是 tags 数据的入口点，在此处规范化可以从源头保证数据质量。如果用户手动修改 inbox 文件后需要重新规范化，可重新执行 `intel-pull --init`。

## 后续建议

- 版本更新：PATCH 级别（功能增强）
- 可考虑在 cyber-pulse API 端预先规范化 tags，减少客户端处理逻辑