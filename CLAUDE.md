# CLAUDE.md - AI 助手工作指南

> 本文件为 Claude Code 提供 Cyber Nexus 项目的工作规范和上下文。
> 全局规范见 `~/.claude/CLAUDE.md`，本文档仅补充项目特有约定。

## 项目概述

**Cyber Nexus** 是一个 Claude Code 插件集合，致力于将 AI 能力融入网络安全战略规划和产品管理的核心流程。

**仓库**: `https://github.com/cyberstrat-forge/cyber-nexus.git` (组织: `cyberstrat-forge`，非个人仓库)

当前状态：早期开发阶段，插件 `market-radar` 已发布三个核心命令。

## 技术栈

| 类型 | 技术 |
|------|------|
| 插件框架 | Claude Code Plugin System |
| 脚本语言 | TypeScript (Node.js 18+) |
| 格式校验 | JSON Schema + AJV |
| 文档格式 | Markdown |

> 包管理、Git 规范、GitHub 操作等遵循全局规范。

## 项目结构

```
cyber-nexus/
├── .claude/                      # Claude Code 配置
├── .claude-plugin/
│   └── marketplace.json          # 插件市场配置
├── plugins/
│   └── market-radar/             # 市场情报提取插件
│       ├── .claude-plugin/
│       │   └── plugin.json       # 插件元数据
│       ├── commands/             # 命令定义
│       ├── agents/               # 智能代理
│       ├── skills/               # 技能模块
│       ├── schemas/              # JSON Schema
│       └── scripts/              # 工具脚本
│           ├── preprocess/       # 文件预处理
│           ├── pulse/            # cyber-pulse API
│           ├── reporting/        # 报告生成
│           ├── thematic/         # 主题分析
│           └── utils/            # 共享工具
├── README.md
└── CHANGELOG.md
```

### 插件脚本

`plugins/market-radar/scripts/` 提供以下命令：

```bash
cd plugins/market-radar/scripts

pnpm run validate -- --input <path>      # JSON Schema 校验
pnpm run preprocess -- --input <dir>     # 文件预处理
pnpm run scan-cards -- --directory <dir> # 情报卡片扫描
pnpm run pulse -- --output <dir>         # 从 cyber-pulse API 拉取
```

## 开发规范

### 提交 Scope

项目规定的 scope 枚举：

| Scope | 说明 |
|-------|------|
| `market-radar` | market-radar 插件相关 |
| `plugin` | 插件框架相关 |
| `docs` | 文档更新 |
| `ci` | CI/CD 配置 |

> 提交格式遵循全局规范，类型包括 `feat` `fix` `docs` `refactor` `test` `chore`。

### 分支策略

**命名规范**：

- `feature/<功能名>` - 新功能开发
- `fix/<问题描述>` - Bug 修复
- `docs/<文档描述>` - 文档更新
- `refactor/<重构描述>` - 代码重构
- `chore/<描述>` - 配置、规范等杂项

**AI 助手行为约束**：开发任务必须在功能分支进行，禁止直接在 `main` 开发（用户明确指定除外）。

**分支保护**：`main` 分支禁止直接推送，必须通过 PR 合并。

### 版本管理

采用两级版本：仓库级和插件级独立维护。

**插件版本**：遵循语义化版本 `MAJOR.MINOR.PATCH`，在 `plugin.json` 中维护。

**仓库版本**：不严格遵循语义化版本
- MAJOR：架构变更
- MINOR：新插件发布
- PATCH：插件迭代

**发布触发条件**：

| 变更类型 | 版本更新 |
|----------|----------|
| 新增命令/Agent/Skill | MINOR |
| 功能增强/Bug 修复 | PATCH |
| 文档/规范更新 | 无需发布 |

**发布步骤**：

1. 更新 `plugin.json` 版本号
2. 更新插件 CHANGELOG.md 和 README.md
3. 更新仓库 README.md 插件列表版本
4. 更新仓库 CHANGELOG.md
5. 推送 tag：`git tag v1.0.0 && git push origin v1.0.0`

### 文档维护

| 文件 | 用途 | 更新时机 |
|------|------|---------|
| 仓库 `README.md` | 插件列表、安装指南 | 新增插件 |
| 仓库 `CHANGELOG.md` | 变更汇总 | 发布版本 |
| 插件 `README.md` | 功能说明、使用方法 | 功能变更 |
| 插件 `CHANGELOG.md` | 变更细节 | 版本更新 |

## 插件开发指南

### 开发参考

| 场景 | 使用 |
|------|------|
| 创建新插件 | `/plugin-dev:create-plugin` |
| 开发命令 | `/plugin-dev:command-development` |
| 开发 Agent | `/plugin-dev:agent-development` |
| 开发 Skill | `/plugin-dev:skill-development` |
| 配置 MCP | `/plugin-dev:mcp-integration` |
| 添加 Hook | `/plugin-dev:hook-development` |

### 关键规范

**Agent description**：必须包含触发条件和 `<example>` 示例。

**Skill 开发**：
- SKILL.md 控制在 500 行以内
- 使用 progressive disclosure：描述 → 正文 → references

**目录约定**：`commands/`、`agents/`、`skills/` 放在插件根目录，而非 `.claude-plugin/` 内部。

## 代码风格

### TypeScript 规范

**命名约定**：

| 类型 | 约定 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `validate-json.ts` |
| 变量/函数 | camelCase | `validateJson` |
| 常量 | UPPER_SNAKE_CASE | `SCHEMA_FILES` |
| 接口/类型 | PascalCase | `ValidationResult` |

**退出码约定**：`0` 成功，`1` 验证失败，`2` 依赖缺失。

### JSON Schema 规范

- 文件位置：`schemas/` 目录
- 文件命名：`<name>.schema.json`
- Schema 版本：Draft 7 或更高

## Review 与 CI

### Code Review 检查项

- [ ] Agent 的 `description` 包含触发示例
- [ ] Skill 的 `name` 使用 kebab-case
- [ ] 新增 JSON Schema 已添加到校验脚本
- [ ] 版本号已同步更新

### 自检工具

```bash
/simplify                              # 代码简化检查
pnpm exec tsc --noEmit                 # 类型检查
Skill(pr-review-toolkit:review-pr)     # PR 审核
```

### Git Hooks

项目使用 husky + commitlint 自动校验提交信息格式。

首次使用：`pnpm install`

### GitHub Actions CI

| Job | 功能 |
|-----|------|
| `commitlint` | PR 提交信息格式校验 |
| `typecheck` | TypeScript 类型检查 |
| `schema-validate` | JSON Schema 校验 |
| `lint` | 文件格式检查 |

**Release 自动化**：推送 `v*.*.*` tag 时自动创建 GitHub Release。

## 相关文档

- [README.md](./README.md) - 项目概述
- [CHANGELOG.md](./CHANGELOG.md) - 更新日志
- [plugins/market-radar/README.md](./plugins/market-radar/README.md) - 插件文档