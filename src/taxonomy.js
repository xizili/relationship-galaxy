// Primary categories are browsing entry points. Tags preserve schools of
// thought, specialties, and cross-domain identities without implying that a
// person belongs exclusively to one discipline.
export const groups = {
  psychotherapy: {
    label: "精神分析",
    color: 0xf4b94f,
    css: "#f4b94f",
    anchor: [0.66, 0.2, 0.72]
  },
  psychology: {
    label: "心理学",
    color: 0x6fc88f,
    css: "#6fc88f",
    anchor: [0.88, 0.46, 0.1]
  },
  neuroscience: {
    label: "神经科学",
    color: 0xb58cff,
    css: "#b58cff",
    anchor: [0.42, 0.65, -0.63]
  },
  life_sciences: {
    label: "生物学",
    color: 0xb3c86a,
    css: "#b3c86a",
    anchor: [-0.02, 0.97, -0.22]
  },
  systems: {
    label: "系统与控制论",
    color: 0x65d3c7,
    css: "#65d3c7",
    anchor: [-0.4, 0.66, -0.63]
  },
  mathematics_physics: {
    label: "数学与物理",
    color: 0x67a7e8,
    css: "#67a7e8",
    anchor: [-0.54, -0.02, -0.84]
  },
  philosophy: {
    label: "哲学与宗教",
    color: 0xde759f,
    css: "#de759f",
    anchor: [-0.4, -0.47, 0.79]
  },
  social_sciences: {
    label: "社会科学",
    color: 0xd1a880,
    css: "#d1a880",
    anchor: [-0.67, 0.58, 0.46]
  },
  literature: {
    label: "文学与评论",
    color: 0x9fb9ff,
    css: "#9fb9ff",
    anchor: [-0.89, -0.24, 0.39]
  },
  arts: {
    label: "艺术创作",
    color: 0xf48e75,
    css: "#f48e75",
    anchor: [-0.08, -0.87, 0.49]
  }
};

const members = {
  psychotherapy: [
    ["freud", "精神分析"],
    ["fromm", "精神分析", "人本主义精神分析", "社会思想"],
    ["horney", "精神分析", "文化心理"],
    ["adler", "个体心理学"],
    ["jung", "分析心理学"],
    ["emma", "分析心理学"],
    ["maslow", "人本主义心理学", "动机与人格"],
    ["rogers", "人本主义心理学", "来访者中心治疗"],
    ["rollo", "存在主义心理治疗"],
    ["yalom", "存在主义心理治疗"],
    ["sabina", "精神分析", "儿童心理"],
    ["lacan", "精神分析", "结构主义"],
    ["klein", "精神分析", "客体关系", "儿童分析"],
    ["ogden", "精神分析", "主体间性"],
    ["anna", "精神分析", "儿童分析"]
  ],
  psychology: [
    ["wertheimer", "格式塔心理学", "知觉"],
    ["lewin", "社会心理学", "群体动力学", "场论"],
    ["piaget", "发展心理学", "认知发展", "发生认识论"],
    ["koffka", "格式塔心理学", "知觉", "心理发展"],
    ["kahneman", "认知心理学", "判断与决策"],
    ["treisman", "认知心理学", "注意与知觉"],
    ["erikson", "发展心理学", "精神分析", "身份认同"]
  ],
  neuroscience: [
    ["kandel", "神经科学", "学习与记忆"],
    ["goldstein", "神经学", "整体机体理论"],
    ["marom", "神经科学", "神经动力学"],
    ["changeux", "神经科学", "突触与意识"],
    ["dehaene", "认知神经科学", "意识", "阅读与数学"],
    ["edelman", "神经科学", "免疫学", "神经达尔文主义"],
    ["sporns", "网络神经科学", "连接组"],
    ["friston", "计算神经科学", "自由能原理"],
    ["solms", "神经心理学", "精神分析", "神经精神分析"],
    ["tononi", "意识研究", "整合信息论"],
    ["koch", "神经科学", "意识研究"]
  ],
  life_sciences: [
    ["cannon", "生理学", "内稳态"],
    ["darwin", "演化生物学", "博物学"]
  ],
  systems: [
    ["bertalanffy", "一般系统论", "生物学"],
    ["bateson", "控制论", "人类学", "心灵生态"],
    ["maturana", "二阶控制论", "生物学"],
    ["foerster", "二阶控制论", "物理学"],
    ["cybernetics", "主题", "二阶控制论"]
  ],
  mathematics_physics: [
    ["einstein", "理论物理", "相对论"],
    ["feigenbaum", "数学物理", "混沌理论"],
    ["connes", "数学", "非交换几何"]
  ],
  philosophy: [
    ["suzuki", "禅学", "宗教思想"],
    ["kierkegaard", "存在思想", "宗教哲学"],
    ["marx", "哲学", "政治经济学", "社会理论"],
    ["spinoza", "哲学", "伦理学", "实体一元论"],
    ["arendt", "政治思想"],
    ["heidegger", "现象学", "存在论"],
    ["kuhn", "科学哲学", "科学史"],
    ["aristotle", "哲学", "逻辑学", "伦理学"],
    ["sartre", "存在主义", "文学"],
    ["steiner", "人智学", "教育", "艺术实践"],
    ["merton", "宗教思想", "文学", "跨宗教对话"],
    ["beauvoir", "存在主义", "女性主义", "文学"],
    ["zhuangzi", "道家", "哲学"]
  ],
  social_sciences: [
    ["drucker", "管理学", "社会生态"],
    ["benedict", "文化人类学", "民俗学"],
    ["levi", "结构人类学", "结构主义"],
    ["mead", "文化人类学", "控制论"],
    ["smith", "经济学", "道德哲学"],
    ["malthus", "人口学", "经济学"],
    ["mcculloch", "经济学"]
  ],
  literature: [
    ["campbell", "比较神话", "文学研究"],
    ["kafka", "文学", "小说"],
    ["mccarthy", "文学", "评论"],
    ["sontag", "文学", "艺术评论", "电影"],
    ["goethe", "文学", "自然研究"]
  ],
  arts: [
    ["schwind", "绘画"],
    ["mahler", "音乐", "作曲", "指挥"],
    ["leibovitz", "摄影", "肖像摄影"],
    ["lennon", "音乐", "词曲创作"],
    ["ono", "观念艺术", "音乐", "表演"]
  ]
};

const classificationById = new Map();
for (const [group, rows] of Object.entries(members)) {
  if (!groups[group]) throw new Error(`Unknown browsing category: ${group}`);
  for (const [id, ...tags] of rows) {
    if (classificationById.has(id)) throw new Error(`Duplicate classification: ${id}`);
    classificationById.set(id, { group, tags });
  }
}

export function classificationFor(id) {
  const classification = classificationById.get(id);
  if (!classification) throw new Error(`Missing classification for node: ${id}`);
  return { group: classification.group, tags: [...classification.tags] };
}
