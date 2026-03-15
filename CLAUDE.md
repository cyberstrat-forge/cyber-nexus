# CLAUDE.md - AI 助手工作指南

> 本文件为 Claude Code 提供 Cyber Nexus 项目的工作规范和上下文。

## 项目概述

**Cyber Nexus** 是一个 Claude Code 插件集合，致力于将 AI 能力融入网络安全战略规划和产品管理的核心流程。

**仓库**: `https://github.com/cyberstrat-forge/cyber-nexus.git` (组织: `cyberstrat-forge`，非个人仓库)

当前状态：早期开发阶段，插件 `market-radar` 已发布两个核心命令。

## 技术栈

| 类型 | 技术 |
|------|------|
| 插件框架 | Claude Code Plugin System |
| 脚本语言 | TypeScript (Node.js 18+) |
| 格式校验 | JSON Schema + AJV |
| 文档格式 | Markdown |
| 包管理 | npm |

## 项目结构

```
cyber-nexus/
├── .claude/                      # Claude Code 配置
│   └── settings.local.json       # 本地权限配置
├── .claude-plugin/
│   └── marketplace.json          # 插件市场配置
├── plugins/
│   └── market-radar/             # 市场情报提取插件
│       ├── .claude-plugin/
│       │   └── plugin.json       # 插件元数据
│       ├── commands/             # 命令定义 (.md)
│       ├── agents/               # 智能代理 (.md)
│       ├── skills/               # 技能模块 (SKILL.md)
│       ├── schemas/              # JSON Schema 定义
│       └── scripts/              # TypeScript 工具脚本
│           ├── preprocess/       # 文件预处理模块
│           ├── reporting/        # 报告生成模块
│           ├── thematic/         # 主题分析模块
│           └── utils/            # 共享工具模块
├── README.md
```

---

## 开发规范

### Git 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**类型（type）**：

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(market-radar): add thematic-analysis command` |
| `fix` | Bug 修复 | `fix(market-radar): resolve clustering issue` |
| `docs` | 文档更新 | `docs: update README with new features` |
| `refactor` | 重构（不改变功能） | `refactor(market-radar): simplify validation logic` |
| `test` | 测试相关 | `test: add unit tests for preprocess` |
| `chore` | 构建/工具相关 | `chore: update dependencies` |

**范围（scope）**：使用完整模块名称，如 `market-radar`。

**提交信息示例**：

```
feat(market-radar): 实现 thematic-analysis 命令

- 新增 intelligence-cluster、theme-analyzer、panorama-synthesizer 三个 Agent
- 支持情报卡片聚类和主题分析
- 生成主题报告和全景报告

Closes #10
```

### 分支策略

```
main                    # 主分支，稳定版本
├── feature/xxx         # 功能分支
├── fix/xxx             # 修复分支
├── docs/xxx            # 文档分支
└── chore/xxx           # 杂项分支
```

**分支命名规范**：

- `feature/<功能名>` - 新功能开发
- `fix/<问题描述>` - Bug 修复
- `docs/<文档描述>` - 文档更新
- `refactor/<重构描述>` - 代码重构
- `chore/<描述>` - 配置、规范等杂项

**工作流程**：

1. 从 `main` 创建功能分支
2. 完成开发和测试
3. 创建 PR 并请求审核
4. 审核通过后合并到 `main`

**AI 助手行为约束**：

当用户请求开发任务（新功能、Bug 修复、重构等）时，Claude Code **必须**：

1. 首先检查当前分支
2. 如果在 `main` 分支：
   - 同步最新代码（`git pull origin main`）
   - 创建符合命名规范的功能分支
3. 在新分支上进行开发工作

**例外情况**：
- 用户明确指定"在当前分支开发"或"在 main 分支开发"

**分支保护策略**（已在 GitHub 启用）：

- `main` 分支保护，禁止直接推送
- 必须通过 PR 合并
- 已合并的分支自动删除

### PR 规范

**PR 标题格式**：与提交信息格式一致

```
feat(market-radar): 实现 thematic-analysis 命令
```

**PR 描述模板**：

```markdown
## Summary
- 变更点 1
- 变更点 2

## Test plan
- [ ] 测试项 1
- [ ] 测试项 2
```

**合并前检查清单**：

- [ ] 代码符合项目规范
- [ ] Schema 校验通过
- [ ] 文档已更新（参见"文档维护策略"）
- [ ] 版本号已更新（如需要）

### 版本管理

本项目采用**两级版本管理**：仓库级版本和插件级版本独立维护。

#### 插件版本

每个插件独立维护版本号，遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向后兼容的功能新增
- **PATCH**：向后兼容的问题修复

版本号在 `plugins/<name>/plugin.json` 中维护，README 徽章同步更新。

#### 仓库版本

仓库版本反映整体状态，**不严格遵循语义化版本**（仓库本身不是发布单元）：

| 版本位 | 含义 | 更新时机 |
|--------|------|---------|
| MAJOR | 仓库架构变更 | 目录结构重组、CI 大改、插件类型扩展 |
| MINOR | 插件生态扩展 | **新插件发布** |
| PATCH | 插件迭代 | 任意插件的更新（功能增强、bug 修复） |

#### 发布流程

**Tag 格式**：`v*.*.*`（如 `v1.0.5`）

**发布触发条件**：

以下变更需要更新版本号并执行发布流程：

| 变更类型 | 版本更新 | 示例 |
|----------|----------|------|
| 新增功能 | MINOR | 新增命令、新增 Agent、新增 Skill |
| 功能增强/优化 | PATCH | 现有功能改进、性能优化、体验提升 |
| Bug 修复 | PATCH | 问题修复 |
| 文档更新 | 无需发布 | README、CLAUDE.md 更新 |
| 规范调整 | 无需发布 | 代码风格、流程优化 |

**判断原则**：
- 如果变更会影响**用户使用**或**输出结果**，则需要发布
- 如果仅影响**开发流程**或**文档说明**，则无需发布

**发布步骤**：

1. 更新 `plugins/<name>/plugin.json` 版本号
2. 更新 `plugins/<name>/CHANGELOG.md`
3. 更新 `plugins/<name>/README.md` 版本徽章
4. 更新仓库 `README.md` 插件列表中的版本
5. 更新仓库 `CHANGELOG.md`（按插件分组汇总变更）
6. 创建 Git tag 并推送：
   ```bash
   git tag v1.0.5
   git push origin v1.0.5
   ```
7. GitHub Actions 自动创建 Release

**Release Notes 格式要求**：

```markdown
## 📦 插件更新

### <plugin-name> vX.Y.Z

#### 新增
- 功能描述

#### 变更
- 变更描述

---

## 📋 升级指南

（如有需要，提供升级注意事项）

---

## 🔗 相关 Issue

Closes #xxx
```

---

## 文档维护策略

本项目采用**两级文档架构**，仓库级与插件级文档独立维护。

### 仓库级文档

位置：项目根目录

| 文件 | 用途 | 更新时机 |
|------|------|---------|
| `README.md` | 仓库概述、插件列表、安装指南 | 新增插件、重大变更 |
| `CHANGELOG.md` | 仓库级变更记录 | 发布新版本时 |

**内容要求**：
- 插件列表保持最新版本号，每项一句话描述用途
- 变更记录汇总各插件的重大更新
- 不包含：命令详情、参数说明、输出结构、使用示例（归属插件 README）
- 快速开始仅提供安装步骤和 1-2 个示例，引导读者查阅插件文档

### 插件级文档

位置：`plugins/<plugin-name>/`

| 文件 | 用途 | 更新时机 |
|------|------|---------|
| `README.md` | 插件功能、使用方法、配置说明 | 插件功能变更 |
| `CHANGELOG.md` | 插件变更记录 | 插件版本更新 |
| `plugin.json` | 插件元数据（含版本号） | 插件版本更新 |

**内容要求**：
- 完整记录每个版本的变更细节
- 使用示例和参数说明保持最新

### 更新检查清单

**插件更新时**：
- [ ] 更新 `plugins/<name>/plugin.json` 版本号
- [ ] 更新 `plugins/<name>/CHANGELOG.md`
- [ ] 更新 `plugins/<name>/README.md` 徽章
- [ ] 更新仓库 `README.md` 插件列表版本
- [ ] 如有重大变更，更新仓库 `CHANGELOG.md`

**新增插件时**：
- [ ] 在仓库 `README.md` 插件列表添加条目
- [ ] 更新仓库 `CHANGELOG.md` 记录新增
- [ ] 更新仓库版本号（MINOR）

---

## 插件开发指南

本项目为 Claude Code 插件集合，开发时**优先参考官方插件**：

### 开发参考

| 场景 | 使用插件 |
|------|----------|
| 创建新插件 | `/plugin-dev:create-plugin` |
| 开发命令 | `/plugin-dev:command-development` |
| 开发 Agent | `/plugin-dev:agent-development` |
| 开发 Skill | `/plugin-dev:skill-development` 或 `/skill-creator:skill-creator` |
| 配置 MCP | `/plugin-dev:mcp-integration` |
| 添加 Hook | `/plugin-dev:hook-development` |

### 关键规范速查

> 以下为核心规范摘要，完整规范请使用上述官方插件。

**Agent description 要求**：
- 必须包含触发条件和 `<example>` 示例
- 使用 `<commentary>` 解释触发逻辑

**Skill 开发原则**：
- SKILL.md 控制在 500 行以内
- 使用 progressive disclosure：描述 → 正文 → references
- description 是触发关键，要"pushy"但准确

---

## 代码风格

### Frontmatter 格式速查

#### Command（commands/）

```markdown
---
name: command-name
description: Brief description
argument-hint: "[--option <value>]"
allowed-tools: Read, Write, Grep, Glob, Bash, Agent
---
```

#### Agent（agents/）

```markdown
---
name: agent-name
description: |
  Use this agent when...

  <example>
  Context: ...
  user: "..."
  assistant: "..."
  <commentary>...</commentary>
  </example>

model: inherit
color: cyan
tools: Read, Grep, Glob, Write, Bash
skills:
  - skill-name-1
---
```

#### Skill（skills/）

```markdown
---
name: skill-name
description: What this skill does and when to use it
---
```

> **注意**：`version` 字段已弃用，版本由 `plugin.json` 统一管理。
>
> 完整 frontmatter 规范请使用 `/plugin-dev:command-development`、`/plugin-dev:agent-development`、`/plugin-dev:skill-development`。

### TypeScript 代码规范

**文件头部注释**：

```typescript
#!/usr/bin/env node
/**
 * 模块描述
 *
 * Usage: npx tsx script-name.ts <args>
 */
```

**命名约定**：

| 类型 | 约定 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `validate-json.ts` |
| 变量/函数 | camelCase | `validateJson` |
| 常量 | UPPER_SNAKE_CASE | `SCHEMA_FILES` |
| 接口/类型 | PascalCase | `ValidationResult` |

**错误处理**：

```typescript
// 使用明确的错误码
interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// 退出码约定
// 0: 成功
// 1: 验证失败
// 2: 依赖缺失
```

### JSON Schema 规范

- 文件位置：`schemas/` 目录
- 文件命名：`<name>.schema.json`
- Schema 版本：Draft 7 或更高

---

## 插件开发规范

### 目录结构

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json       # 必需：插件元数据
├── commands/             # 命令定义
│   ├── <command>.md
│   └── references/       # 命令参考文档
├── agents/               # Agent 定义
│   ├── <agent>.md
│   └── references/       # Agent 参考文档
├── skills/               # Skill 定义
│   └── <skill-name>/
│       ├── SKILL.md
│       └── references/   # 参考文档（可选）
├── schemas/              # JSON Schema
└── scripts/              # 工具脚本
```

**重要**：`commands/`、`agents/`、`skills/` 目录必须放在插件根目录，而非 `.claude-plugin/` 内部。

### plugin.json 格式

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Brief description",
  "author": {
    "name": "author-name",
    "email": "email@example.com"
  },
  "keywords": ["keyword1", "keyword2"],
  "license": "MIT"
}
```

### Skill 开发原则

1. **单一职责**：每个 Skill 专注一个知识领域
2. **可组合**：多个 Skill 可组合使用
3. **自描述**：内容清晰，无需额外解释
4. **可维护**：避免重复，统一更新

---

## 开发流程与 Review 环节

### 开发流程

```
创建分支 → 开发 → 自测 → 提交 PR → Code Review → 合并
```

**提交前建议**（可选）：

- 代码变更较多时，运行 `/simplify` 进行自检
- 创建 PR 前，确认 `npx tsc --noEmit` 通过

### Code Review 检查项

**格式规范**：

- [ ] Command 的 `allowed-tools` 使用逗号分隔字符串格式
- [ ] Agent 的 `tools` 使用逗号分隔字符串格式
- [ ] Skill 的 `name` 使用 kebab-case 格式
- [ ] Skill 不包含 `version` 字段

**内容规范**：

- [ ] Agent 的 `description` 包含触发示例
- [ ] Agent 的 `skills` 引用正确的 skill name
- [ ] 新增的 JSON Schema 已添加到校验脚本

**文档规范**：

- [ ] 仓库级文档已更新（如有插件新增或重大变更）
- [ ] 插件级文档已更新（如有功能变更）
- [ ] 版本号已同步更新

### Review 工具

使用以下工具辅助 Review：

```bash
# 代码简化检查
/simplify

# PR 全面审核
Skill(pr-review-toolkit:review-pr)
```

### Git Hooks

项目使用 **husky + commitlint** 实现本地提交校验。

**自动校验内容**：

| Hook | 功能 |
|------|------|
| `commit-msg` | 校验提交信息符合 Conventional Commits 规范 |
| `pre-commit` | 阻止提交敏感文件（.env, .key, .pem 等） |

**首次使用**：

```bash
# 安装依赖，自动配置 Git Hooks
npm install
```

**提交信息格式示例**：

```bash
# 正确格式
git commit -m "feat(market-radar): add new feature"
git commit -m "fix: resolve issue"

# 错误格式（会被拒绝）
git commit -m "add feature"        # 缺少 type
git commit -m "Fix: something"     # type 应小写
```

### GitHub Actions CI

项目配置了 CI 自动检查：

| Job | 功能 | 触发条件 |
|-----|------|---------|
| `commitlint` | PR 提交信息格式校验 | PR 到 main |
| `typecheck` | TypeScript 类型检查 | PR/Push 到 main |
| `schema-validate` | JSON Schema 校验 | PR/Push 到 main |
| `lint` | 文件格式检查 | PR/Push 到 main |

**Release 自动化**：

推送 `v*.*.*` 格式的 tag 时，自动：
1. 从 CHANGELOG.md 提取版本更新内容
2. 创建 GitHub Release
3. 设置 Latest 标记

```bash
# 创建新版本发布
git tag v1.1.0
git push origin v1.1.0
```

---

## GitHub 操作

项目支持两种 GitHub 操作方式：

1. **GitHub MCP Server**（推荐）：使用 Claude Code 的 GitHub 集成工具（`mcp__plugin_github_github__*`）
2. **gh CLI**：命令行工具作为备选

**优先使用 MCP Server 工具**进行以下操作：
- PR 创建和管理
- Issue 操作
- 仓库和分支管理
- 代码审查

示例：
```bash
# 创建 PR（优先使用 MCP）
mcp__plugin_github_github__create_pull_request

# 备选：使用 gh CLI
gh pr create --title "..." --body "..."
```

---

## 常用命令

### 开发命令

```bash
# 安装根目录依赖（husky + commitlint）
npm install

# 安装插件依赖
cd plugins/market-radar/scripts && npm install

# 运行 Schema 校验
npx tsx validate-json.ts <schema-name> <json-file>

# TypeScript 类型检查
npx tsc --noEmit
```

### Git 命令

```bash
# 查看状态
git status

# 创建分支
git checkout -b feature/new-feature

# 提交变更
git add <files>
git commit -m "feat(market-radar): add new feature"

# 推送分支
git push -u origin feature/new-feature

# 创建 PR
gh pr create --title "feat(market-radar): add new feature" --body "..."
```

---

## 注意事项

### 安全

- 不要在代码中硬编码敏感信息
- 不要提交 `.env` 文件或凭证
- API 密钥应通过环境变量或安全配置管理

### 性能

- 处理大文件时使用流式读取
- 避免在循环中执行 I/O 操作
- 状态文件更新后立即写入

### 可维护性

- 保持文档与代码同步更新
- 变更后更新 CHANGELOG.md
- 复杂逻辑添加必要注释

---

## 相关文档

- [README.md](./README.md) - 项目概述
- [CHANGELOG.md](./CHANGELOG.md) - 更新日志
- [plugins/market-radar/README.md](./plugins/market-radar/README.md) - 插件文档