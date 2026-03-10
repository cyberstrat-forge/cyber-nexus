# /intel-distill 命令使用指南

> 从文档中提取战略情报并生成情报卡片

---

## 参数说明

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `--source <dir>` | 否 | 包含文档的源目录 | 当前目录 |
| `--output <dir>` | 否 | 情报卡片输出目录 | 当前目录 |
| `--help` | 否 | 显示此帮助信息 | - |

---

## 使用场景

### 场景 1：无参数

```bash
/intel-distill
```

**适用情况：** 在包含文档的目录下直接运行

**输出位置：**
| 内容 | 路径 |
|------|------|
| 情报卡片 | `./{domain}/` |
| 状态文件 | `./.intel/` |

---

### 场景 2：仅指定源目录

```bash
/intel-distill --source ./docs
```

**适用情况：** 文档在子目录中，情报卡片输出到源目录

**输出位置：**
| 内容 | 路径 |
|------|------|
| 情报卡片 | `./docs/{domain}/` |
| 状态文件 | `./docs/.intel/` |

---

### 场景 3：仅指定输出目录

```bash
/intel-distill --output ./intelligence
```

**适用情况：** 文档在当前目录，情报卡片输出到独立目录

**输出位置：**
| 内容 | 路径 |
|------|------|
| 情报卡片 | `./intelligence/{domain}/` |
| 状态文件 | `./intelligence/.intel/` |

---

### 场景 4：同时指定源目录和输出目录

```bash
/intel-distill --source ./docs --output ./intelligence
```

**适用情况：** 文档和输出分离，便于管理

**输出位置：**
| 内容 | 路径 |
|------|------|
| 情报卡片 | `./intelligence/{domain}/` |
| 状态文件 | `./intelligence/.intel/` |

---

## 支持的文件格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| Markdown | `.md` | 直接处理 |
| 文本 | `.txt` | 直接处理 |
| PDF | `.pdf` | 大文件采用智能分页 |
| Word | `.docx` | 需要 pandoc 转换 |

---

## 增量处理机制

| 文件状态 | 处理方式 |
|----------|----------|
| 新文件 | 自动处理 |
| 已处理且无变更 | 自动跳过 |
| 已处理但有变更 | 重新处理 |
| 之前处理失败 | 自动重试一次 |

**重新处理所有文件：**
```bash
rm -rf .intel/
```

---

## 输出结构

### 情报卡片（用户可见）

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

### 状态文件（隐藏）

```
{output_dir}/.intel/
├── state.json            # 处理状态和队列
└── history/              # 历史归档
```

---

## 七大情报领域

| 领域 | 说明 |
|------|------|
| **Threat-Landscape** | 新型攻击手法、威胁组织动态、重大安全事件 |
| **Industry-Analysis** | 市场规模、增长趋势、行业格局变化 |
| **Vendor-Intelligence** | 产品发布、战略调整、并购、财务数据 |
| **Emerging-Tech** | 新技术原理、应用场景、安全影响、成熟度评估 |
| **Customer-Market** | 客户需求变化、采购行为、预算趋势 |
| **Policy-Regulation** | 新法规发布、合规要求、监管动态 |
| **Capital-Investment** | 融资、并购、IPO、投资趋势 |

---

## 典型工作流

```bash
# 1. 首次运行
/intel-distill --source ./docs --output ./intelligence

# 2. 查看结果
ls ./intelligence/

# 3. 添加新文档后再次运行（增量处理）
/intel-distill --source ./docs --output ./intelligence
```

---

## 前置要求

### 必需依赖

- **Node.js 18+** 和 **npm**：用于 JSON Schema 校验
  ```bash
  # 首次使用前安装校验依赖
  cd plugins/market-radar/scripts && npm install
  ```

### 可选依赖

处理 `.docx` 文件需要安装 pandoc：

```bash
# macOS
brew install pandoc

# Linux
sudo apt-get install pandoc
```

---

## 常见问题

### Q: 为什么有些文档没有生成情报卡片？

A: 每份文档 0-3 条情报是正常的。只有具有战略价值的信息才会被提取。

### Q: 如何重新处理所有文件？

A: 删除 `{output_dir}/.intel/` 目录后重新运行命令。

### Q: 处理失败怎么办？

A: 查看状态文件 `state.json` 中的 `failed` 字段：

```json
"failed": {
  "docs/report.pdf": {
    "error": "CONVERSION_FAILED: pandoc not available",
    "failed_at": "2026-03-10T10:30:00Z",
    "retries": 1,
    "validation_errors": ["missing required field: title"]
  }
}
```

**错误码说明：**

| 错误码 | 说明 |
|--------|------|
| `READ_FAILED` | 无法读取源文件 |
| `CONVERSION_FAILED` | 文件格式转换失败（如 docx） |
| `WRITE_FAILED` | 写入情报卡片失败 |
| `ANALYSIS_FAILED` | 内容分析失败 |
| `TOOL_UNAVAILABLE` | 必需工具不可用（如 pandoc） |

命令会自动重试一次（`retries` 最大为 1）。

### Q: 校验失败是什么意思？

A: JSON Schema 校验失败表示 Agent 返回的数据结构不符合预期。常见原因：
- 缺少必需字段
- 字段类型错误
- 枚举值无效

校验错误会记录在 `failed` 字段的 `validation_errors` 数组中。命令会自动重试一次，如仍失败则记录详细错误信息。

---

## 相关资源

- 详细执行流程：`commands/intel-distill.md`
- JSON 输出格式：`agents/references/json-format.md`
- 领域模板：`skills/output-templates/references/templates.md`