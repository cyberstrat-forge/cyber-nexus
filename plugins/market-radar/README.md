# Market Radar

[![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/cyberstrat-forge/cyber-nexus/releases/tag/v1.0.2)
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
| Markdown | `.md` | 直接处理 |
| 文本 | `.txt` | 直接处理 |
| PDF | `.pdf` | 大文件采用智能分页 |
| Word | `.docx` | 需要 pandoc 转换 |

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
│   └── validate-json.ts      # JSON Schema 校验脚本
└── README.md                 # 插件文档
```

## 配置

添加到项目的 `.gitignore`：

```gitignore
# Market Radar 情报输出
.intel/
```

## 更新日志

### v1.0.2 (2026-03-10)

- **变更检测优化**：使用 content hash (MD5) 替代 mtime，解决 git 操作导致的误判问题 (#3)
- **去重规则明确**：定义三要素匹配规则（日期 + 领域 + 标题相似度 > 80%）(#7)
- **归档规则明确**：processed 条目超过 30 天自动归档到 history/ 目录 (#9)
- **Schema 更新**：添加 content_hash 字段，保留 source_mtime 作为备用

### v1.0.1 (2026-03-10)

- 优化 intel-distill 上下文架构，Agent 直接写入情报卡片
- 添加 JSON Schema 校验支持
- 精简文档内容，消除冗余
- 补充临时文件清理逻辑

### v1.0.0 (2026-03-10)

- 首个正式版本发布
- 实现 intel-distill 命令核心功能
- 支持七大情报领域的自动分类
- 支持 Markdown、PDF、Word 文档处理
- 实现增量处理机制

## 许可证

MIT

## 作者

luoweirong (weirong.luo@qq.com)