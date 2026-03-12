/**
 * 主题分析类型定义
 */

/**
 * 情报卡片记录
 */
export interface CardRecord {
  /** 卡片内容 MD5 哈希 */
  content_hash: string;
  /** 聚类时间 */
  clustered_at: string;
  /** 所属主题 ID 列表 */
  themes: string[];
  /** 各主题聚类置信度 */
  confidence?: Record<string, number>;
  /** 源文件修改时间 */
  source_mtime?: string;
}

/**
 * 主题状态
 */
export interface ThemeStateRecord {
  /** 属于该主题的卡片路径列表 */
  cards: string[];
  /** 最后分析时间 */
  last_analysis: string;
  /** 分析材料文件路径 */
  analysis_file?: string;
  /** 报告文件路径 */
  report_file?: string;
  /** 是否有待处理的变更 */
  changes_pending?: boolean;
}

/**
 * 统计信息
 */
export interface Stats {
  /** 扫描到的情报卡片总数 */
  total_cards: number;
  /** 已聚类的情报卡片数 */
  clustered_cards: number;
  /** 未聚类的情报卡片数 */
  unclustered_cards: number;
  /** 主题总数 */
  total_themes: number;
  /** 已分析的主题数 */
  analyzed_themes: number;
  /** 最后运行时间 */
  last_run?: string;
}

/**
 * 主题分析状态文件
 */
export interface ThemeState {
  /** 状态文件版本号 */
  version: string;
  /** 最后更新时间 */
  last_updated: string;
  /** 情报卡片记录 */
  cards: Record<string, CardRecord>;
  /** 主题状态 */
  themes: Record<string, ThemeStateRecord>;
  /** 统计信息 */
  stats: Stats;
}

/**
 * 扫描结果
 */
export interface ScanResult {
  /** 情报卡片总数 */
  total_cards: number;
  /** 新增的卡片 */
  new_cards: string[];
  /** 更新的卡片 */
  updated_cards: string[];
  /** 未聚类的卡片 */
  unclustered_cards: string[];
  /** 主题变化 */
  themes_changes: Record<string, { added: number; removed: number }>;
  /** 当前状态 */
  state: ThemeState;
}

/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 主题显示名称 */
  name: string;
  /** 主题描述 */
  description: string;
  /** 匹配关键词 */
  keywords: string[];
  /** 涉及领域 */
  domains: string[];
  /** 跟踪维度 */
  track_dimensions: string[];
  /** 最小卡片数 */
  min_cards: number;
  /** 创建日期 */
  created?: string;
  /** 高级匹配规则 */
  match_rules?: {
    domains?: string[];
    keywords?: {
      must_have?: string[];
      any_of?: string[];
    };
    entity_patterns?: Array<{
      type: 'vendor' | 'threat_actor' | 'technology' | 'region';
      names: string[];
    }>;
  };
}

/**
 * 主题配置文件
 */
export interface ThemesConfig {
  /** 配置版本 */
  version: string;
  /** 最后更新日期 */
  last_updated?: string;
  /** 主题定义 */
  themes: Record<string, ThemeConfig>;
}

/**
 * 聚类结果
 */
export interface ClusterResult {
  /** 已聚类的卡片 */
  clustered: Array<{
    card_path: string;
    assigned_themes: string[];
    confidence: Record<string, number>;
  }>;
  /** 边缘情况 */
  edge_cases: Array<{
    card_path: string;
    candidate_themes: string[];
    confidence: Record<string, number>;
    reason: string;
  }>;
  /** 未聚类的卡片 */
  unclustered: Array<{
    card_path: string;
    reason: string;
  }>;
  /** 建议的新主题 */
  suggested_new_themes?: Array<{
    suggested_theme_id: string;
    name: string;
    description: string;
    keywords: string[];
    domains: string[];
    supporting_cards: string[];
    confidence: number;
  }>;
}

/**
 * 分析材料
 */
export interface AnalysisMaterial {
  /** 主题 ID */
  theme_id: string;
  /** 主题名称 */
  theme_name: string;
  /** 分析时间 */
  analysis_date: string;
  /** 卡片数量 */
  card_count: number;
  /** 日期范围 */
  date_range: {
    start: string;
    end: string;
  };
  /** 摘要 */
  summary: string;
  /** 趋势分析 */
  trends: {
    time_trend: {
      direction: 'increasing' | 'decreasing' | 'stable';
      description: string;
      monthly_counts?: Record<string, number>;
    };
    emerging_keywords?: string[];
    declining_keywords?: string[];
  };
  /** 实体网络 */
  entities: {
    vendors?: Array<{
      name: string;
      mentions: number;
      key_points?: string[];
    }>;
    threat_actors?: Array<{
      name: string;
      mentions: number;
      activity?: string;
    }>;
    technologies?: Array<{
      name: string;
      mentions: number;
    }>;
  };
  /** 跨领域关联 */
  cross_domain_links?: Array<{
    domains: string[];
    insight: string;
  }>;
  /** 关键发现 */
  key_findings: string[];
  /** 战略建议 */
  strategic_implications: string[];
  /** 数据支撑 */
  data_points?: Array<{
    type: string;
    value: string;
    source?: string;
  }>;
  /** 来源卡片 */
  source_cards: string[];
}