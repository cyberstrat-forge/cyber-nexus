# Cyber Nexus

> 网络安全战略规划的 Claude Code 插件工具集

## 概述

Cyber Nexus 是一个 Claude Code 插件集合，专注于网络安全战略决策场景。每个插件都是独立的，可以单独安装和使用。

## 插件列表

| 插件 | 功能 | 状态 |
|------|------|------|
| [market-radar](./plugins/market-radar) | 从文档提取战略情报，支持七大情报领域 | ✅ 可用 |

## 快速开始

### 添加市场

```bash
/plugin marketplace add cyberstrat-forge/cyber-nexus
```

### 安装插件

```bash
/plugin install market-radar@cyber-nexus
```

### 使用插件

```bash
# 处理当前目录下的所有文档，情报卡片输出到当前目录
/intel-distill

# 处理指定目录下的文档，情报卡片输出到源目录
/intel-distill --source ./docs

# 指定输出位置
/intel-distill --source ./docs --output ./intelligence
```

### 输出说明

**情报卡片**（用户可见）输出到指定目录下的领域子目录：
```
{output_dir}/
├── Threat-Landscape/     # 威胁态势
├── Industry-Analysis/    # 行业分析
├── Vendor-Intelligence/  # 厂商情报
├── Emerging-Tech/        # 新兴技术
├── Customer-Market/      # 客户与市场
├── Policy-Regulation/    # 政策法规
└── Capital-Investment/   # 资本动态
```

**状态文件**（管理用）存放在输出目录下的隐藏目录：
```
{output_dir}/.intel/
├── state.json            # 处理状态和队列
└── history/              # 历史归档
```

## 项目结构

```
cyber-nexus/
├── .claude-plugin/
│   └── marketplace.json       # 市场配置
├── plugins/
│   └── market-radar/          # 市场情报提取插件
│       ├── .claude-plugin/
│       │   └── plugin.json    # 插件配置
│       ├── commands/          # 命令定义
│       │   ├── intel-distill.md
│       │   └── references/
│       │       └── intel-distill-guide.md
│       ├── agents/            # 智能代理
│       │   ├── intelligence-analyzer.md
│       │   └── references/
│       │       └── json-format.md
│       ├── skills/            # 技能模块
│       │   ├── domain-knowledge/
│       │   │   └── SKILL.md
│       │   ├── analysis-methodology/
│       │   │   └── SKILL.md
│       │   └── output-templates/
│       │       ├── SKILL.md
│       │       └── references/
│       │           └── templates.md
│       └── README.md          # 插件文档
└── README.md
```

## 许可证

MIT

## 作者

luoweirong (weirong.luo@qq.com)