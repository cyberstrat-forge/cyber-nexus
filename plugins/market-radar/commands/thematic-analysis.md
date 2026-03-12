---
name: thematic-analysis
description: Analyze intelligence cards to identify themes, trends, and patterns across documents
argument-hint: "[--source <dir>] [--report <reports|panorama|both>] [--theme <id>] [--add-theme] [--list-themes]"
allowed-tools: ["Read", "Write", "Grep", "Glob", "Bash", "Agent", "AskUserQuestion"]
---

## 命令概述

执行主题分析工作流：扫描情报卡片，聚类分析，生成主题洞察。

## 参数与使用示例

| 参数 | 必填 | 说明 |
|------|------|------|
| `--source <dir>` | 否 | 情报卡片源目录（默认：当前目录） |
| `--output <dir>` | 否 | 分析输出目录（默认：source/.themes/） |
| `--report <type>` | 否 | 输出报告类型：`reports`/`panorama`/`both` |
| `--theme <id>` | 否 | 指定分析的主题 ID |
| `--add-theme` | 否 | 交互式新增主题 |
| `--list-themes` | 否 | 列出所有主题配置 |
| `--from <date>` | 否 | 起始日期筛选 (YYYY-MM-DD) |
| `--to <date>` | 否 | 结束日期筛选 (YYYY-MM-DD) |
| `--domain <domains>` | 否 | 领域筛选（逗号分隔） |
| `--incremental` | 否 | 只处理新增/更新的卡片 |
| `--help` | 否 | 显示帮助信息 |

```bash
# 执行主题分析（默认输出分析和报告）
/thematic-analysis --source ./intel

# 只执行分析，不输出报告
/thematic-analysis --source ./intel

# 执行分析并输出主题报告
/thematic-analysis --source ./intel --report reports

# 执行分析并输出全景报告
/thematic-analysis --source ./intel --report panorama

# 只分析指定主题
/thematic-analysis --source ./intel --theme ai-security

# 新增主题配置
/thematic-analysis --add-theme

# 列出所有主题
/thematic-analysis --list-themes
```

## 帮助信息

如果用户输入 `--help` 参数，读取并显示帮助文档：

```
使用 Read 工具读取：
${CLAUDE_PLUGIN_ROOT}/commands/references/thematic-analysis-guide.md

将内容展示给用户，无需执行后续流程。
```

## 目录结构

### 输出目录

```
{output_dir}/.themes/
├── config.yaml              # 主题配置文件
├── state.json               # 状态管理
├── analysis/                # 分析材料
│   ├── ai-security/
│   │   └── analysis.json    # 主题分析结果
│   └── ransomware-threats/
│       └── analysis.json
├── reports/                 # 主题报告
│   ├── ai-security.md
│   └── ransomware-threats.md
├── panorama/                # 全景报告
│   └── 202603-panorama.md
└── history/                 # 历史归档
```

## 执行流程

### 步骤 1：初始化路径

```
source_dir = --source 参数或当前目录
output_dir = --output 参数或 source_dir/.themes/
config_file = output_dir/config.yaml
state_file = output_dir/state.json
```

### 步骤 2：处理主题配置命令

#### 2.1 列出主题 (`--list-themes`)

```
如果 config.yaml 不存在：
  显示默认内置主题列表
否则：
  读取 config.yaml，展示所有主题配置
返回，不执行后续流程
```

#### 2.2 新增主题 (`--add-theme`)

```
使用 AskUserQuestion 工具交互式收集：
  • 主题名称
  • 主题描述
  • 匹配关键词
  • 涉及领域
  • 跟踪维度

创建或更新 config.yaml
返回，不执行后续流程
```

### 步骤 3：加载或创建配置文件

读取 `config.yaml`，如不存在则使用默认内置主题配置：

```yaml
themes:
  ai-security:
    name: "AI 安全"
    description: "AI 相关的安全威胁、技术和市场动态"
    keywords: ["AI安全", "大模型安全", "LLM安全", "提示注入"]
    domains: [Emerging-Tech, Threat-Landscape, Vendor-Intelligence]
    track_dimensions: [maturity, threat_actor, vendor_name]
    min_cards: 5

  ransomware-threats:
    name: "勒索软件威胁"
    description: "勒索软件攻击趋势、威胁组织和防御策略"
    keywords: ["勒索软件", "ransomware", "勒索", "LockBit"]
    domains: [Threat-Landscape]
    track_dimensions: [threat_actor, attack_method, target_sector]
    min_cards: 3

  cloud-security:
    name: "云安全"
    description: "云安全市场、技术和威胁动态"
    keywords: ["云安全", "Cloud Security", "SASE", "CASB"]
    domains: [Emerging-Tech, Industry-Analysis, Vendor-Intelligence]
    track_dimensions: [market_size, vendor_name, tech_name]
    min_cards: 5
```

### 步骤 4：扫描待处理情报卡片

调用扫描脚本：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npx tsx thematic/scan-cards.ts --source {source_dir} --state {state_file} [--incremental]
```

**脚本输出 JSON**：

```json
{
  "total_cards": 150,
  "new_cards": ["path/to/card1.md", "path/to/card2.md"],
  "updated_cards": ["path/to/card3.md"],
  "unclustered_cards": ["path/to/card1.md", "path/to/card2.md", ...],
  "themes_changes": {
    "ai-security": {"added": 3, "removed": 0},
    "ransomware-threats": {"added": 2, "removed": 0}
  }
}
```

如果没有待处理的卡片，输出提示并结束流程。

### 步骤 5：调用情报聚类 Agent

如果有未聚类的卡片，调用 `intelligence-cluster` Agent：

```
使用 Agent 工具，subagent_type="intelligence-cluster"
参数：
  - cards: 未聚类卡片列表
  - config: 主题配置
  - state_file: 状态文件路径
```

Agent 职责：
- 阅读卡片内容
- 根据主题匹配规则聚类
- 推荐新主题（如有）
- 输出聚类结果

**处理 Agent 返回结果**：

1. 如果有新主题推荐：
   ```
   使用 AskUserQuestion 询问用户是否添加新主题
   如果确认，更新 config.yaml
   ```

2. 更新 state.json 记录聚类结果

### 步骤 6：识别有变化的主题

对比各主题的卡片列表变化，构建待分析主题队列。

```
待分析主题 = 主题卡片数量变化的主题
            + 新增卡片的主题
            + 用户指定分析的主题（--theme 参数）
```

### 步骤 7：循环调用主题分析 Agent

```
for each 主题 in 待分析主题队列:
  使用 Agent 工具，subagent_type="theme-analyzer"
  参数：
    - theme_id: 主题 ID
    - cards: 该主题下所有已聚类卡片
    - config: 主题配置
    - output_dir: 输出目录

  Agent 输出分析材料到 {output_dir}/analysis/{theme_id}/analysis.json
  更新 state.json 记录分析时间
```

### 步骤 8：输出任务概述

```
输出：
• 处理卡片数量：X 张
• 聚类到主题：Y 个主题
• 分析材料位置：{output_dir}/analysis/
• 有变化的主题列表
• 新主题推荐（如有）
```

### 步骤 9：生成报告（如有 --report 参数）

如果用户指定了 `--report` 参数：

```
使用 Agent 工具，subagent_type="panorama-synthesizer"
参数：
  - mode: reports / panorama / both
  - analysis_dir: 分析材料目录
  - themes: 相关主题列表
  - output_dir: 输出目录

Agent 输出报告到：
  - reports/: 主题报告
  - panorama/: 全景报告
```

## 错误处理

| 错误 | 操作 |
|------|------|
| 配置文件格式错误 | 备份后重建默认配置 |
| 扫描脚本失败 | 记录错误，提示用户检查脚本 |
| Agent 返回错误 | 记录错误详情，继续处理其他主题 |
| 状态文件损坏 | 备份为 `.broken`，重建状态 |

## 关联 Skills

相关 Agent 预加载以下 skills：
- **clustering-methodology** - 情报聚类方法论
- **thematic-methodology** - 主题分析方法论
- **thematic-templates** - 报告模板

## Schema 校验

| 时机 | Schema | 说明 |
|------|--------|------|
| 加载配置时 | `themes-config.schema.json` | 校验主题配置 |
| 更新状态时 | `theme-state.schema.json` | 校验状态文件 |

## 注意事项

- 聚类和分析是顺序执行的
- 状态变更后立即写入 state.json
- 建议将 `.themes/` 添加到 `.gitignore`