# Market Radar

[![Version](https://img.shields.io/badge/version-1.3.3-blue.svg)](https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.3.3)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> 为网络安全战略规划提供战略性市场洞察

## 概述

Market Radar 是一个 Claude Code 插件，用于从文档中提取战略情报并进行主题分析，支持网络安全战略规划。它分析源文件，识别具有战略价值的信息，生成结构化的情报卡片，并对情报进行跨文档的主题趋势分析。

## 整体工作流

Market Radar 的核心工作流分为三个阶段：**情报拉取 → 情报蒸馏 → 主题分析**。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            整体工作流                                         │
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │ 阶段一：情报拉取  │                                                        │
│  │   intel-pull    │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐     ┌──────────────┐                                   │
│  │ cyber-pulse API │────→│    inbox/    │←──── 本地文档                      │
│  │  增量/范围拉取   │     │   待处理队列  │     PDF/DOCX/MD                    │
│  └─────────────────┘     └──────┬───────┘                                   │
│                                 │                                           │
│           ┌─────────────────────┼─────────────────────┐                     │
│           │                     │                     │                     │
│           ▼                     ▼                     ▼                     │
│  ┌─────────────────┐   ┌──────────────┐   ┌────────────────┐               │
│  │ 阶段二：情报蒸馏  │   │  archive/    │   │  converted/    │               │
│  │  intel-distill  │──→│   源文件归档  │   │   Markdown     │               │
│  │                 │   └──────────────┘   └────────────────┘               │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │                    intelligence/                              │           │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│           │
│  │  │威胁态势    │ │行业分析    │ │厂商情报    │ │新兴技术    ││           │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘│           │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐              │           │
│  │  │客户与市场  │ │政策法规    │ │资本动态    │              │           │
│  │  └────────────┘ └────────────┘ └────────────┘              │           │
│  └─────────────────────────────────────────────────────────────┘           │
│           │                                                                 │
│           ├──────────────────────┬──────────────────────┐                  │
│           │                      │                      │                  │
│           ▼                      ▼                      ▼                  │
│  ┌─────────────────┐   ┌──────────────┐   ┌──────────────────┐            │
│  │ 阶段三：主题分析  │   │ reports/     │   │    .themes/      │            │
│  │ thematic-analysis│   │ 周报/月报    │   │ 主题报告/全景    │            │
│  └─────────────────┘   └──────────────┘   └──────────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 阶段一：情报拉取（intel-pull）

从 cyber-pulse API 拉取标准化情报内容：

```
cyber-pulse API → 增量/时间范围/单条拉取 → inbox/ 目录
```

- **增量拉取**：基于 cursor 分页，只拉取新内容
- **时间范围拉取**：指定 `--since` 参数拉取历史数据
- **多源管理**：配置多个情报源，支持 `--all` 并行拉取

### 阶段二：情报蒸馏（intel-distill）

将源文档转化为结构化情报卡片，核心流程：

```
源文档 → 预处理（格式转换+内容清洗） → 战略价值评估 → 情报卡片生成
         ↓                              ↓                ↓
    archive/归档             无价值→跳过         intelligence/七大领域
    converted/转换           需复核→审核队列
```

1. **预处理**：扫描 `inbox/` 目录，将 PDF/DOCX 转为 Markdown，清洗噪声，归档源文件
2. **去重检测**：基于源文件哈希和内容哈希，自动跳过已处理文件
3. **战略价值评估**：AI Agent 分析文档，判断是否具有战略情报价值
4. **三路分流**：
   - 有价值 → 生成情报卡片（自动归入七大领域）
   - 无价值 → 跳过并记录
   - 需复核 → 进入审核队列，等待人工 `--review approve/reject`
5. **报告生成**：从已有卡片生成周报/月报（`--report weekly/monthly`）

### 阶段三：主题分析（thematic-analysis）

对情报卡片进行跨文档分析，发现趋势和模式：

```
情报卡片 → 智能聚类 → 主题深度分析 → 报告输出
            ↓           ↓              ↓
       主题分配     趋势+实体网络   主题报告/全景报告
```

1. **智能聚类**：将情报卡片自动分配到相关主题
2. **深度分析**：识别时间趋势、构建实体关系网络
3. **报告输出**：单主题深度报告 + 全景概览报告

### 典型使用流程

```bash
# 1. 从 API 拉取情报（可选）
/intel-pull

# 2. 或将本地文档放入 inbox
cp ~/Downloads/*.pdf ./docs/inbox/

# 3. 执行情报蒸馏
/intel-distill --source ./docs

# 4. 处理审核队列（如有）
/intel-distill --review list
/intel-distill --review approve pending-xxx --reason "确认有价值"

# 5. 生成周报
/intel-distill --report weekly

# 6. 执行主题分析
/thematic-analysis --source ./docs/intelligence --report both
```

## 命令列表

| 命令 | 状态 | 功能 |
|------|------|------|
| `intel-pull` | ✅ 可用 | 情报拉取：从 cyber-pulse API 拉取标准化情报内容 |
| `intel-distill` | ✅ 可用 | 情报蒸馏：从文档提取战略情报，生成情报卡片 |
| `thematic-analysis` | ✅ 可用 | 主题分析：跨文档识别趋势和模式，生成分析报告 |
| `insight-cards` | 📋 规划中 | 洞察卡片：生成结构化洞察报告 |
| `strategic-judgment` | 📋 规划中 | 战略判断：基于情报生成决策建议 |

## 功能特性

### 情报拉取（intel-pull）

- **多源管理**：支持配置多个 cyber-pulse 情报源
- **增量拉取**：基于 cursor 分页，只拉取新内容
- **时间范围拉取**：支持指定时间范围拉取历史数据
- **状态共享**：与 intel-distill 共用 `state.json`
- **输出格式**：标准化 Markdown 文件，兼容 intel-distill

### 情报蒸馏（intel-distill）

- **情报提取**：使用严格标准分析文档的战略价值
- **七大情报领域**：覆盖威胁态势、行业分析、厂商情报、新兴技术、客户与市场、政策法规、资本动态
- **多格式支持**：支持 Markdown、文本、PDF 和 DOCX 文件
- **目录结构**：
  - `inbox/` 目录：待处理文档入口
  - `archive/YYYY/MM/`：源文件归档
  - `converted/YYYY/MM/`：转换后文件
- **审核机制**：支持 `--review list/approve/reject` 审核待定情报
- **情报持久化**：卡片独立于源文件，支持追溯
- **去重机制**：基于源文件哈希自动去重
- **情报报告**：从现有卡片生成结构化周报/月报
- **增量处理**：跟踪已处理文件，检测变更，避免重复处理
- **JSON Schema 校验**：自动校验输出结构，确保数据质量

### 主题分析（thematic-analysis）

- **智能聚类**：自动将情报卡片聚类到相关主题
- **趋势分析**：识别时间趋势、热度变化、新兴主题
- **实体网络**：构建厂商、威胁组织、技术的关系网络
- **主题报告**：生成单个主题的深度分析报告
- **全景报告**：输出所有主题的综合概览
- **自定义主题**：支持用户自定义跟踪主题
- **增量更新**：只分析新增或更新的情报卡片

## 安装

### 方式一：从市场安装

```bash
/plugin install market-radar@cyber-nexus
```

### 方式二：本地插件目录

```bash
# 克隆或复制到你的插件目录
cp -r market-radar ~/.claude/plugins/

# 或使用 --plugin-dir 参数
cc --plugin-dir /path/to/market-radar
```

### 方式三：项目级安装

```bash
# 复制到你的项目
cp -r market-radar /path/to/your/project/.claude-plugin/
```

## 使用方法

### 首次使用

```bash
# 安装校验依赖
cd plugins/market-radar/scripts && pnpm install
```

### intel-pull 基本用法

```bash
# 显示帮助
/intel-pull --help

# 配置情报源（首次使用）
/intel-pull --add-source

# 列出已配置的情报源
/intel-pull --list-sources

# 增量拉取（默认源）
/intel-pull

# 指定源拉取
/intel-pull --source cloud

# 拉取所有源
/intel-pull --all

# 时间范围拉取
/intel-pull --since "2026-03-01"

# 单条拉取
/intel-pull --id "cnt_20260319143052_a1b2c3d4"
```

### intel-distill 基本用法

```bash
# 显示帮助
/intel-distill --help

# 处理当前目录下的所有文档
/intel-distill

# 处理指定目录下的文档
/intel-distill --source ./docs

# 指定输出位置
/intel-distill --source ./docs --output ./intelligence

# === 审核模式 ===

# 列出所有待审核任务
/intel-distill --review list

# 批准待审核项
/intel-distill --review approve pending-threat-20260313-001 --reason "情报准确"

# 拒绝待审核项
/intel-distill --review reject pending-threat-20260313-002 --reason "信息来源不可靠"

# === 报告模式 ===

# 生成当前周报（从现有卡片）
/intel-distill --report weekly

# 生成指定周报
/intel-distill --report weekly 2026-W10

# 生成当前月报
/intel-distill --report monthly

# 生成指定月报
/intel-distill --report monthly 2026-03

# 指定情报卡片位置生成报告
/intel-distill --report weekly --output ./intel
```

### thematic-analysis 基本用法

```bash
# 执行主题分析
/thematic-analysis --source ./intel

# 执行分析并输出报告
/thematic-analysis --source ./intel --report both

# 只分析指定主题
/thematic-analysis --source ./intel --theme ai-security

# 列出所有主题
/thematic-analysis --list-themes

# 新增主题配置
/thematic-analysis --add-theme
```

### intel-distill 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--source <dir>` | 包含文档的源目录 | 当前目录 |
| `--output <dir>` | 情报卡片输出目录 | 当前目录 |
| `--review <action> [id]` | 审核操作：`list`（列出）/`approve`（批准）/`reject`（拒绝） | - |
| `--reason <text>` | 审核原因（approve/reject 时推荐） | - |
| `--report <type> [period]` | 生成情报简报：`weekly`（周报）或 `monthly`（月报），可选周期参数 | - |
| `--help` | 显示帮助信息 | - |

### thematic-analysis 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--source <dir>` | 情报卡片源目录 | 当前目录 |
| `--output <dir>` | 分析输出目录 | source/.themes/ |
| `--report <type>` | 报告类型：reports/panorama/both | - |
| `--theme <id>` | 指定分析的主题 | 全部主题 |
| `--list-themes` | 列出所有主题 | - |
| `--add-theme` | 新增主题配置 | - |
| `--incremental` | 只处理新增/更新的卡片 | false |

### 支持的文件格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| Markdown | `.md` | 清洗噪声后输出 |
| 文本 | `.txt` | 清洗噪声后输出 |
| PDF | `.pdf` | 转换为 Markdown |
| Word | `.docx` | 需要 pandoc，转换为 Markdown |

### 预处理输出

源文件会自动预处理为干净的 Markdown：

```
{source_dir}/
├── inbox/                    # 待处理文档（推荐入口）
│   ├── report.pdf
│   └── article.docx
├── archive/                  # 已归档文档
│   └── 2026/03/
│       ├── report.pdf
│       └── report.pdf.meta   # 元数据文件
├── converted/                # 转换后的 Markdown
│   └── 2026/03/
│       ├── report.md
│       └── article.md
└── intelligence/             # 情报卡片输出
    ├── threat-intelligence/
    └── ...
```

**清洗规则**：
- 删除图片链接（保留有语义的 alt text）
- 删除社交媒体元数据（头像 URL、@handle、平台 UI 残留）
- 删除独立的社交平台链接
- 折叠连续空行

## 输出结构

### 情报卡片目录

```
{output_dir}/
├── Threat-Landscape/     # 威胁态势：攻击手法、威胁组织、安全事件
├── Industry-Analysis/    # 行业分析：市场规模、增长趋势、竞争格局
├── Vendor-Intelligence/  # 厂商情报：产品发布、战略调整、并购动态
├── Emerging-Tech/        # 新兴技术：AI安全、零信任、云安全
├── Customer-Market/      # 客户与市场：需求变化、采购行为、预算趋势
├── Policy-Regulation/    # 政策法规：新法规、合规要求、监管动态
├── Capital-Investment/   # 资本动态：融资、并购、IPO
└── reports/              # 情报报告
    ├── weekly/           # 周报
    │   ├── 2026-W09-briefing.md
    │   └── 2026-W10-briefing.md
    └── monthly/          # 月报
        ├── 2026-01-briefing.md
        └── 2026-02-briefing.md
```

### 管理目录

```
{output_dir}/.intel/
├── state.json            # 状态管理（队列 + 处理记录 + 统计）
└── history/              # 历史归档（按月）
```

### 状态文件结构（v2.0）

```json
{
  "version": "2.1.0",
  "updated_at": "2026-03-13T15:25:00+08:00",
  "queue": { "processing": {} },
  "review": { "pending": [] },
  "processed": {
    "converted/2026/03/report.md": {
      "content_hash": "abc123...",
      "source_hash": "def456...",
      "intelligence_count": 2,
      "intelligence_ids": ["threat-intelligence-20260313-001"],
      "review_status": null
    }
  },
  "stats": {
    "preprocess": { "scanned": 15, "converted": 14, "failed": 1 },
    "intelligence": { "processed": 14, "cards_generated": 12 },
    "review": { "pending": 0, "approved": 0, "rejected": 0 }
  }
}
```

### 主题分析目录

```
{output_dir}/.themes/
├── config.yaml              # 主题配置文件
├── state.json               # 状态管理
├── analysis/                # 分析材料
│   ├── ai-security/
│   │   └── analysis.json
│   └── ransomware-threats/
│       └── analysis.json
├── reports/                 # 主题报告
│   ├── ai-security.md
│   └── ransomware-threats.md
├── panorama/                # 全景报告
│   └── 202603-panorama.md
└── history/                 # 历史归档
```

## 前置要求

### 必需依赖

- **Claude Code CLI**：已安装并配置
- **Node.js 18+** 和 **pnpm**：用于 JSON Schema 校验

### 可选依赖

- **pandoc**：处理 DOCX 文件时需要
  ```bash
  # macOS
  brew install pandoc

  # Linux
  sudo apt-get install pandoc
  ```

- **poppler**：处理 PDF 文件时需要
  ```bash
  # macOS
  brew install poppler

  # Linux
  sudo apt-get install poppler-utils
  ```

## 项目结构

```
market-radar/
├── .claude-plugin/
│   └── plugin.json           # 插件元数据：名称、版本、作者
├── commands/                 # 命令定义
│   ├── intel-distill.md      # intel-distill 命令
│   ├── thematic-analysis.md  # thematic-analysis 命令
│   └── references/
│       ├── intel-distill-guide.md
│       └── thematic-analysis-guide.md
├── agents/                   # 智能代理
│   ├── intelligence-analyzer.md    # 情报分析 Agent
│   ├── intelligence-cluster.md     # 情报聚类 Agent
│   ├── theme-analyzer.md           # 主题分析 Agent
│   ├── panorama-synthesizer.md     # 报告生成 Agent
│   └── references/
│       └── json-format.md    # Agent 返回格式规范
├── skills/                   # 技能模块
│   ├── cybersecurity-domain-knowledge/     # 七大情报领域
│   ├── intelligence-analysis-methodology/  # 战略价值判断
│   ├── intelligence-output-templates/      # 情报卡片模板
│   ├── clustering-methodology/   # 聚类方法论
│   ├── thematic-methodology/     # 主题分析方法论
│   └── thematic-templates/       # 报告模板
├── schemas/                  # JSON Schema
│   ├── agent-result.schema.json
│   ├── state.schema.json
│   ├── intelligence-output.schema.json
│   ├── themes-config.schema.json
│   └── theme-state.schema.json
├── scripts/                  # 工具脚本
│   ├── preprocess/           # 预处理模块
│   ├── reporting/            # 报告生成模块
│   ├── thematic/             # 主题分析脚本
│   └── validate-json.ts
└── README.md
```

## 配置

添加到项目的 `.gitignore`：

```gitignore
# Market Radar 输出目录
.intel/
.themes/

# 源文件目录
inbox/
archive/
converted/
```

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)。

## 许可证

MIT

## 作者

luoweirong (weirong.luo@qq.com)