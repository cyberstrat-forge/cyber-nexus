/**
 * 变化类型定义
 * 用于周报主题标注和月报聚合
 */
export type ChangeType =
  | '新威胁出现'
  | '市场格局变化'
  | '技术突破与应用'
  | '客户需求演变'
  | '合规压力变化'
  | '资本动向';

/**
 * 变化类型与情报领域的映射
 */
export const CHANGE_TYPE_DOMAINS: Record<ChangeType, string[]> = {
  '新威胁出现': ['Threat-Landscape'],
  '市场格局变化': ['Industry-Analysis', 'Vendor-Intelligence'],
  '技术突破与应用': ['Emerging-Tech'],
  '客户需求演变': ['Customer-Market'],
  '合规压力变化': ['Policy-Regulation'],
  '资本动向': ['Capital-Investment']
};

/**
 * 变化类型中文描述
 */
export const CHANGE_TYPE_DESCRIPTIONS: Record<ChangeType, string> = {
  '新威胁出现': '新型攻击、威胁组织、漏洞趋势',
  '市场格局变化': '竞争格局、厂商战略、市场份额',
  '技术突破与应用': '技术成熟、应用扩展、安全影响',
  '客户需求演变': '预算调整、优先级转变、采购行为',
  '合规压力变化': '新法规、合规要求、执法动态',
  '资本动向': '投资热度、投资方向、估值变化'
};

/**
 * 所有变化类型列表
 */
export const ALL_CHANGE_TYPES: ChangeType[] = [
  '新威胁出现',
  '市场格局变化',
  '技术突破与应用',
  '客户需求演变',
  '合规压力变化',
  '资本动向'
];