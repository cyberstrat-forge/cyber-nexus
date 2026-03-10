# Market Radar

> 为网络安全战略规划提供战略性市场洞察

## 概述

Market Radar 是一个 Claude Code 插件，用于从文档中提取战略情报，支持网络安全战略规划。它分析源文件，识别具有战略价值的信息，并生成结构化的情报卡片。

## 功能特性

- **情报提取**：使用严格标准分析文档的战略价值
- **七大情报领域**：威胁态势、行业分析、厂商情报、新兴技术、客户与市场、政策法规、资本动态
- **多格式支持**：支持 Markdown、文本、PDF 和 DOCX 文件
- **增量处理**：跟踪已处理文件，检测变更，避免重复处理
- **质量优先**：每份文档 0-3 条情报是正常的

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
|-----------|-------------|---------|
| `--source <dir>` | 包含文档的源目录 | 当前目录 |
| `--output <dir>` | 情报卡片输出目录 | 当前目录 |

### 支持的文件格式

| 格式 | 扩展名 | 说明 |
|--------|-----------|---------|
| Markdown | `.md` | 直接处理 |
| 文本 | `.txt` | 直接处理 |
| PDF | `.pdf` | 大文件采用智能分页 |
| Word | `.docx` | 需要 pandoc 转换 |

## 输出结构

### 情报卡片（用户可见）

```
{output_dir}/
├── Threat-Landscape/       # 威胁态势情报卡片
├── Industry-Analysis/      # 行业分析情报卡片
├── Vendor-Intelligence/    # 厂商情报卡片
├── Emerging-Tech/          # 新兴技术情报卡片
├── Customer-Market/        # 客户与市场情报卡片
├── Policy-Regulation/      # 政策法规情报卡片
└── Capital-Investment/     # 资本动态情报卡片
```

### 管理目录（隐藏）

```
.intel/
├── state.json              # 统一状态管理（队列 + 元数据）
└── history/                # 历史元数据（按月归档）
    ├── 2026-03.json
    └── ...
```

### 输出规则

| 参数情况 | 情报卡片输出位置 |
|---------|-----------------|
| 无参数 | `./` |
| `--source ./docs` | `./docs/` |
| `--output ./intel` | `./intel/` |
| `--source ./docs --output ./intel` | `./intel/` |

### 状态文件（state.json）

```json
{
  "version": "1.0",
  "queue": {
    "pending": [{"path": "docs/report.md", "mtime": 1709987400}],
    "processing": {},
    "failed": {}
  },
  "processed": {
    "report.md": {
      "source_mtime": 1709987400,
      "processed_at": "2026-03-09T10:30:00Z",
      "intelligence_count": 3,
      "output_files": ["Emerging-Tech/20260309-ai-security.md"]
    }
  },
  "stats": {
    "total_files": 15,
    "total_intelligence": 28,
    "last_run": "2026-03-09T10:30:00Z"
  }
}
```

## 情报领域

| 领域 | 说明 |
|--------|-------------|
| **Threat-Landscape** | 新型攻击手法、威胁组织动态、重大安全事件 |
| **Industry-Analysis** | 市场规模、增长趋势、行业格局变化 |
| **Vendor-Intelligence** | 产品发布、战略调整、并购、财务数据 |
| **Emerging-Tech** | 新技术原理、应用场景、安全影响、成熟度评估 |
| **Customer-Market** | 客户需求变化、采购行为、预算趋势 |
| **Policy-Regulation** | 新法规发布、合规要求、监管动态 |
| **Capital-Investment** | 融资、并购、IPO、投资趋势 |

## 战略情报判断标准

只有满足以下至少一个条件才提取信息：

1. **影响决策** - 可能改变战略方向或资源分配
2. **揭示趋势** - 反映行业、技术或威胁的重大变化
3. **发现机会** - 揭示新的市场机会或技术突破
4. **预警风险** - 提示潜在威胁或竞争风险
5. **关键数据** - 包含重要的量化数据

## 前置要求

- **pandoc**（可选）：处理 DOCX 文件时需要
  ```bash
  # macOS
  brew install pandoc

  # Linux
  sudo apt-get install pandoc
  ```

## 配置

添加到项目的 `.gitignore`：

```gitignore
# Market Radar 情报输出
.intel/
```

## 组件说明

### Commands

- **`intel-distill`**：从文档中提取情报

### Agents

- **`intelligence-analyzer`**：自主分析文档并提取战略情报

### Skills

- **`domain-knowledge`**：网络安全领域定义和关键词
- **`analysis-methodology`**：战略情报提取方法论
- **`output-templates`**：情报卡片格式化模板

## 项目结构

```
market-radar/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── intel-distill.md
├── agents/
│   ├── intelligence-analyzer.md
│   └── references/
│       └── json-format.md
├── skills/
│   ├── domain-knowledge/
│   │   └── SKILL.md
│   ├── analysis-methodology/
│   │   └── SKILL.md
│   └── output-templates/
│       ├── SKILL.md
│       └── references/
│           └── templates.md
└── README.md
```

## 许可证

MIT

## 作者

luoweirong (weirong.luo@qq.com)