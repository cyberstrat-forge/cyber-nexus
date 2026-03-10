# Market Radar

> 为网络安全战略规划提供战略性市场洞察

## 概述

Market Radar 是一个 Claude Code 插件，用于从文档中提取战略情报，支持网络安全战略规划。它分析源文件，识别具有战略价值的信息，并生成结构化的情报卡片。

## 功能特性

- **情报提取**：使用严格标准分析文档的战略价值
- **七大情报领域**：覆盖威胁态势、行业分析、厂商情报、新兴技术、客户与市场、政策法规、资本动态
- **多格式支持**：支持 Markdown、文本、PDF 和 DOCX 文件
- **增量处理**：跟踪已处理文件，检测变更，避免重复处理
- **JSON Schema 校验**：自动校验输出结构，确保数据质量

## 安装

### 方式一：本地插件目录

```bash
# 克隆或复制到你的插件目录
cp -r market-radar ~/.claude/plugins/

# 或使用 --plugin-dir 参数
cc --plugin-dir /path/to/market-radar
```

### 方式二：项目级安装

```bash
# 复制到你的项目
cp -r market-radar /path/to/your/project/.claude-plugin/
```

## 使用方法

### 基本用法

```bash
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
├── Threat-Landscape/       # 威胁态势
├── Industry-Analysis/      # 行业分析
├── Vendor-Intelligence/    # 厂商情报
├── Emerging-Tech/          # 新兴技术
├── Customer-Market/        # 客户与市场
├── Policy-Regulation/      # 政策法规
└── Capital-Investment/     # 资本动态
```

### 管理目录

```
{output_dir}/.intel/
├── state.json              # 状态管理（队列 + 处理记录）
└── history/                # 历史归档（按月）
```

## 前置要求

### 必需依赖

- **Node.js 18+** 和 **npm**：用于 JSON Schema 校验
  ```bash
  cd plugins/market-radar/scripts && npm install
  ```

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
├── commands/
│   ├── intel-distill.md              # 情报提取命令
│   └── references/
│       └── intel-distill-guide.md    # 命令帮助
├── agents/
│   ├── intelligence-analyzer.md      # 情报分析 Agent
│   └── references/
│       └── json-format.md            # 输出格式规范
├── skills/
│   ├── domain-knowledge/             # 七大领域定义
│   ├── analysis-methodology/         # 战略价值判断标准
│   └── output-templates/             # 情报卡片模板
├── schemas/
│   ├── agent-result.schema.json      # Agent 返回格式
│   ├── intelligence-output.schema.json
│   └── state.schema.json
└── scripts/
    └── validate-json.ts              # 校验脚本
```

## 配置

添加到项目的 `.gitignore`：

```gitignore
# Market Radar 情报输出
.intel/
```

## 许可证

MIT

## 作者

luoweirong (weirong.luo@qq.com)