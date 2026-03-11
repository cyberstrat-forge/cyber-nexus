# Market Radar

[![Version](https://img.shields.io/badge/version-1.0.4-blue.svg)](https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.0.4)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> 为网络安全战略规划提供战略性市场洞察

## 概述

Market Radar 是一个 Claude Code 插件，用于从文档中提取战略情报，支持网络安全战略规划。它分析源文件，识别具有战略价值的信息，并生成结构化的情报卡片。

## 命令列表

| 命令 | 状态 | 功能 |
|------|------|------|
| `intel-distill` | ✅ 可用 | 情报蒸馏：从文档提取战略情报，生成情报卡片 |
| `thematic-analysis` | 📋 规划中 | 主题分析：跨文档识别趋势和模式 |
| `insight-cards` | 📋 规划中 | 洞察卡片：生成结构化洞察报告 |
| `strategic-judgment` | 📋 规划中 | 战略判断：基于情报生成决策建议 |

## 功能特性

- **情报提取**：使用严格标准分析文档的战略价值
- **七大情报领域**：覆盖威胁态势、行业分析、厂商情报、新兴技术、客户与市场、政策法规、资本动态
- **多格式支持**：支持 Markdown、文本、PDF 和 DOCX 文件
- **预处理管道**：自动转换格式、清洗噪声，输出统一的干净 Markdown
- **增量处理**：跟踪已处理文件，检测变更，避免重复处理
- **JSON Schema 校验**：自动校验输出结构，确保数据质量

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
cd plugins/market-radar/scripts && npm install
```

### 基本用法

```bash
# 显示帮助
/intel-distill --help

# 处理当前目录下的所有文档
/intel-distill

# 处理指定目录下的文档
/intel-distill --source ./docs

# 指定输出位置
/intel-distill --source ./docs --output ./intelligence
```

### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--source <dir>` | 包含文档的源目录 | 当前目录 |
| `--output <dir>` | 情报卡片输出目录 | 当前目录 |
| `--help` | 显示帮助信息 | - |

### 支持的文件格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| Markdown | `.md` | 清洗噪声后输出 |
| 文本 | `.txt` | 清洗噪声后输出 |
| PDF | `.pdf` | 转换为 Markdown |
| Word | `.docx` | 需要 pandoc，转换为 Markdown |

### 预处理输出

源文件会自动预处理为干净的 Markdown，输出到 `{source_dir}/converted/` 目录：

```
{source_dir}/
├── report.pdf
├── article.docx
├── note.md
└── converted/               # 预处理输出（用户可见）
    ├── .meta/               # 元数据（隐藏）
    ├── report.md
    ├── article.md
    └── note.md
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
└── Capital-Investment/   # 资本动态：融资、并购、IPO
```

### 管理目录

```
{output_dir}/.intel/
├── state.json            # 状态管理（队列 + 处理记录）
└── history/              # 历史归档（按月）
```

## 前置要求

### 必需依赖

- **Claude Code CLI**：已安装并配置
- **Node.js 18+** 和 **npm**：用于 JSON Schema 校验

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
│   ├── intel-distill.md      # intel-distill 命令主逻辑
│   └── references/
│       └── intel-distill-guide.md  # 用户帮助文档
├── agents/                   # 智能代理
│   ├── intelligence-analyzer.md    # 情报分析 Agent
│   └── references/
│       └── json-format.md    # Agent 返回格式规范
├── skills/                   # 技能模块（预加载知识）
│   ├── domain-knowledge/
│   │   └── SKILL.md          # 七大情报领域定义
│   ├── analysis-methodology/
│   │   └── SKILL.md          # 战略价值判断标准
│   └── output-templates/
│       ├── SKILL.md          # 输出模板入口
│       └── references/
│           └── templates.md  # 七大领域卡片模板
├── schemas/                  # JSON Schema 定义
│   ├── agent-result.schema.json    # Agent 返回结果校验
│   ├── state.schema.json           # 状态文件校验
│   └── intelligence-output.schema.json  # 情报卡片校验
├── scripts/                  # 工具脚本
│   ├── preprocess/           # 预处理模块
│   │   ├── index.ts          # 预处理入口
│   │   ├── convert.ts        # 格式转换
│   │   ├── clean.ts          # 噪声清洗
│   │   └── types.ts          # 类型定义
│   └── validate-json.ts      # JSON Schema 校验脚本
└── README.md                 # 插件文档
```

## 配置

添加到项目的 `.gitignore`：

```gitignore
# Market Radar 情报输出
.intel/

# 预处理元数据（可选）
converted/.meta/
```

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)。

## 许可证

MIT

## 作者

luoweirong (weirong.luo@qq.com)