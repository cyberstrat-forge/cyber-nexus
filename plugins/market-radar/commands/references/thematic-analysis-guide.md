# Thematic Analysis 命令指南

## 命令概述

`/thematic-analysis` 是 Market Radar 插件的第二条命令，用于对 `intel-distill` 生成的情报卡片进行主题分析，识别趋势、模式和战略洞察。

## 使用方法

### 基本用法

```bash
# 执行主题分析（默认）
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

### 参数说明

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--source <dir>` | 否 | 当前目录 | 情报卡片源目录 |
| `--output <dir>` | 否 | source/.themes/ | 分析输出目录 |
| `--report <type>` | 否 | - | 报告类型：`reports`/`panorama`/`both` |
| `--theme <id>` | 否 | 全部主题 | 指定分析的主题 ID |
| `--add-theme` | 否 | - | 交互式新增主题 |
| `--list-themes` | 否 | - | 列出所有主题配置 |
| `--from <date>` | 否 | - | 起始日期筛选 (YYYY-MM-DD) |
| `--to <date>` | 否 | - | 结束日期筛选 (YYYY-MM-DD) |
| `--domain <domains>` | 否 | 全部领域 | 领域筛选（逗号分隔） |
| `--incremental` | 否 | false | 只处理新增/更新的卡片 |

## 工作流程

```
1. 扫描情报卡片 → 识别未处理的卡片
2. 情报聚类 → 将卡片分配到主题
3. 主题分析 → 深度分析、提取洞察
4. 输出报告 → 生成主题报告/全景报告
```

## 内置主题

### AI 安全 (ai-security)

- **描述**：AI 相关的安全威胁、技术和市场动态
- **关键词**：AI安全、大模型安全、LLM安全、提示注入
- **涉及领域**：Emerging-Tech, Threat-Landscape, Vendor-Intelligence
- **跟踪维度**：maturity, threat_actor, vendor_name

### 勒索软件威胁 (ransomware-threats)

- **描述**：勒索软件攻击趋势、威胁组织和防御策略
- **关键词**：勒索软件、ransomware、勒索、LockBit
- **涉及领域**：Threat-Landscape
- **跟踪维度**：threat_actor, attack_method, target_sector

### 云安全 (cloud-security)

- **描述**：云安全市场、技术和威胁动态
- **关键词**：云安全、Cloud Security、SASE、CASB
- **涉及领域**：Emerging-Tech, Industry-Analysis, Vendor-Intelligence
- **跟踪维度**：market_size, vendor_name, tech_name

## 输出结构

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

## 自定义主题

### 通过命令新增

```bash
/thematic-analysis --add-theme
```

系统会交互式询问：
- 主题名称
- 主题描述
- 匹配关键词
- 涉及领域
- 跟踪维度
- 最小卡片数

### 直接编辑配置文件

编辑 `.themes/config.yaml`：

```yaml
themes:
  my-custom-theme:
    name: "自定义主题"
    description: "主题描述"
    keywords: ["关键词1", "关键词2"]
    domains: [Emerging-Tech, Threat-Landscape]
    track_dimensions: [vendor_name, tech_name]
    min_cards: 5
```

## 分析维度

每个主题可以跟踪以下维度：

| 维度 | 适用领域 | 说明 |
|------|----------|------|
| `threat_actor` | Threat-Landscape | 威胁行为者 |
| `attack_method` | Threat-Landscape | 攻击手法 |
| `target_sector` | Threat-Landscape | 目标行业 |
| `target_region` | Threat-Landscape | 目标地区 |
| `market_size` | Industry-Analysis | 市场规模 |
| `growth_rate` | Industry-Analysis | 增长率 |
| `vendor_name` | Vendor-Intelligence | 厂商名称 |
| `product_launch` | Vendor-Intelligence | 产品发布 |
| `tech_name` | Emerging-Tech | 技术名称 |
| `maturity` | Emerging-Tech | 技术成熟度 |

## 常见问题

### Q: 情报卡片没有被聚类到任何主题？

A: 可能原因：
1. 卡片内容与现有主题关键词不匹配
2. 卡片领域不在主题定义的领域范围内
3. 系统会自动建议是否新增主题

### Q: 如何更新主题配置？

A: 直接编辑 `.themes/config.yaml` 文件，或使用 `--add-theme` 命令新增主题。

### Q: 报告如何刷新？

A: 再次运行命令时，系统会自动检测变更的卡片并更新相关主题的分析。

## 与 intel-distill 的关系

```
intel-distill                thematic-analysis
     │                             │
     ▼                             ▼
源文档 ──→ 情报卡片 ──────────→ 主题分析 ──→ 报告
(PDF/MD)   (MD files)         (JSON)       (MD)
```

- `intel-distill`：从源文档提取情报，生成情报卡片
- `thematic-analysis`：对情报卡片进行主题聚类和深度分析

## 最佳实践

1. **定期运行**：建议每周运行一次，保持分析材料的时效性
2. **增量更新**：使用 `--incremental` 参数只处理新卡片
3. **主题精简**：保持 3-7 个核心主题，避免过度细分
4. **定期回顾**：定期回顾主题配置，删除不再相关的主题