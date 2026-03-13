# 测试目录

此目录用于测试 `intel-distill` 命令的工作流程。

## 目录结构

```
test/
├── inbox/              # 放置待处理的测试文档
├── archive/            # 归档文件（自动生成）
├── converted/          # 转换后的 Markdown（自动生成）
├── intelligence/       # 情报卡片输出（自动生成）
└── .intel/             # 状态管理（自动生成）
```

## 使用方法

1. 将测试文档放入 `inbox/` 目录
2. 运行命令：`/intel-distill --source plugins/market-radar/test --output plugins/market-radar/test/intelligence`
3. 查看生成的情报卡片

## 测试场景

### 场景 1：基本情报提取
- 放入有战略价值的文档
- 验证情报卡片生成

### 场景 2：无价值文档
- 放入无战略价值的文档
- 验证不生成卡片，且不再重复处理

### 场景 3：需要审核
- 放入边界情况的文档
- 验证审核队列和审核命令

### 场景 4：重复检测
- 放入相同文档的不同版本
- 验证去重机制

### 场景 5：删除源文件后恢复
- 生成卡片后删除 converted/ 文件
- 执行审核命令验证恢复机制