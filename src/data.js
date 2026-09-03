export const groups = {
  psychoanalysis: {
    label: "精神分析",
    color: 0xf4b94f,
    css: "#f4b94f"
  },
  analytical: {
    label: "分析心理",
    color: 0xe17b59,
    css: "#e17b59"
  },
  humanistic: {
    label: "人本主义",
    color: 0x6fc88f,
    css: "#6fc88f"
  },
  existential: {
    label: "存在主义",
    color: 0x67a7e8,
    css: "#67a7e8"
  },
  systems: {
    label: "系统论",
    color: 0x65d3c7,
    css: "#65d3c7"
  },
  neuroscience: {
    label: "神经科学",
    color: 0xb58cff,
    css: "#b58cff"
  },
  philosophy: {
    label: "哲学思想",
    color: 0xde759f,
    css: "#de759f"
  },
  culture: {
    label: "文化写作",
    color: 0x9fb9ff,
    css: "#9fb9ff"
  }
};

export const relationTypes = {
  influence: { label: "影响", color: 0xaec8ff },
  mentor: { label: "师徒", color: 0xf5d37c },
  conflict: { label: "分歧", color: 0xff8a70 },
  family: { label: "亲属", color: 0xffb6d5 },
  collaboration: { label: "合作", color: 0x7ce6cf },
  peer: { label: "同流派", color: 0xb9f189 },
  spouse: { label: "伴侣", color: 0xffa6a6 },
  dialogue: { label: "对话", color: 0xd2b6ff },
  school: { label: "学派", color: 0xcfd8dc }
};

export const nodes = [
  {
    id: "freud",
    name: "Sigmund Freud",
    cn: "弗洛伊德",
    years: "1856-1939",
    role: "精神分析创始人",
    group: "psychoanalysis",
    x: 0,
    y: 0,
    z: 0,
    size: 18,
    summary: "犹太人，精神分析创始人。原始图谱以他为中心，向早期精神分析、存在主义心理治疗与后续心理学人物展开。",
    works: ["《梦的解析》", "精神分析理论"]
  },
  {
    id: "jung",
    name: "Carl Gustav Jung",
    cn: "卡尔·荣格",
    years: "1875-1961",
    role: "分析心理学鼻祖",
    group: "analytical",
    x: -95,
    y: 54,
    z: 86,
    size: 13,
    summary: "早期与弗洛伊德关系紧密，后因理论方向分歧而决裂。图谱中连接艾玛·荣格、萨宾娜·斯宾尔埃、约瑟夫·坎贝尔等节点。",
    works: ["集体无意识", "原型理论"]
  },
  {
    id: "adler",
    name: "Alfred Adler",
    cn: "阿德勒",
    years: "1870-1937",
    role: "个体心理学创始人",
    group: "psychoanalysis",
    x: -74,
    y: -44,
    z: -86,
    size: 11,
    summary: "早期精神分析圈的重要人物，后发展出个体心理学。图谱标注《自卑与超越》。",
    works: ["《自卑与超越》"]
  },
  {
    id: "anna",
    name: "Anna Freud",
    cn: "安娜·弗洛伊德",
    years: "1895-1982",
    role: "儿童精神分析代表人物",
    group: "psychoanalysis",
    x: -18,
    y: -122,
    z: 36,
    size: 10,
    summary: "弗洛伊德之女，儿童精神分析的重要奠基者。图谱中与父亲和后来的精神分析传统相连。",
    works: ["儿童精神分析"]
  },
  {
    id: "klein",
    name: "Melanie Klein",
    cn: "梅兰妮·克莱因",
    years: "1882-1960",
    role: "克莱因学派创始人",
    group: "psychoanalysis",
    x: -138,
    y: -108,
    z: 82,
    size: 11,
    summary: "犹太人，儿童精神分析先驱。图谱标注她研究自家小孩，并与精神分析谱系相连。",
    works: ["客体关系理论"]
  },
  {
    id: "fromm",
    name: "Erich Fromm",
    cn: "埃里希·弗洛姆",
    years: "1900-1980",
    role: "人本主义精神分析代表",
    group: "psychoanalysis",
    x: 44,
    y: 88,
    z: -68,
    size: 12,
    summary: "犹太人。受弗洛伊德启发，也尖锐反对其部分观点，强调社会文化如何塑造人的心理。",
    works: ["《爱的艺术》", "《在幻想锁链的彼岸》"]
  },
  {
    id: "horney",
    name: "Karen Horney",
    cn: "卡伦·霍妮",
    years: "1885-1952",
    role: "新弗洛伊德主义精神分析师",
    group: "psychoanalysis",
    x: -72,
    y: 128,
    z: 62,
    size: 10,
    summary: "图谱标注《我们时代的神经症人格》。她在精神分析传统内提出女性主义和文化视角。",
    works: ["《我们时代的神经症人格》"]
  },
  {
    id: "erikson",
    name: "Erik Erikson",
    cn: "埃里克森",
    years: "1902-1994",
    role: "发展心理学与精神分析师",
    group: "psychoanalysis",
    x: 92,
    y: 112,
    z: -92,
    size: 10,
    summary: "精神分析师与发展心理学家。原图将他连接至弗洛伊德、安娜·弗洛伊德、露丝·本尼迪克特与格雷戈里·贝特森。",
    works: ["心理社会发展阶段"]
  },
  {
    id: "lacan",
    name: "Jacques Lacan",
    cn: "雅克·拉康",
    years: "1901-1981",
    role: "法国精神分析代表",
    group: "psychoanalysis",
    x: -214,
    y: -186,
    z: -54,
    size: 12,
    summary: "20 世纪法国极具影响力的精神分析学家，被图谱称为“法国弗洛伊德”，以语言、结构主义和哲学重读弗洛伊德。",
    works: ["结构主义精神分析"]
  },
  {
    id: "sabina",
    name: "Sabina Spielrein",
    cn: "萨宾娜·斯宾尔埃",
    years: "1885-1942",
    role: "早期女性精神分析师",
    group: "psychoanalysis",
    x: -124,
    y: -18,
    z: 124,
    size: 10,
    summary: "犹太人，儿童心理学家与教育学专家，最早的女性精神分析师之一。图谱标注她与荣格有复杂的师生、同僚和咨询关系。",
    works: ["早期精神分析论文"]
  },
  {
    id: "emma",
    name: "Emma Jung",
    cn: "艾玛·荣格",
    years: "1882-1955",
    role: "分析心理学家",
    group: "analytical",
    x: -188,
    y: 32,
    z: 146,
    size: 9,
    summary: "分析心理学家，荣格的配偶。图谱标注传记《Love and Sacrifice: The Life of Emma Jung》。",
    works: ["《Love and Sacrifice》"]
  },
  {
    id: "campbell",
    name: "Joseph Campbell",
    cn: "约瑟夫·坎贝尔",
    years: "1904-1987",
    role: "比较神话学者",
    group: "culture",
    x: -236,
    y: -72,
    z: -110,
    size: 10,
    summary: "文学及比较神话学者，图谱标注荣格启发他领悟“神话是公开的梦，梦是私人的神话”。",
    works: ["《千面英雄》"]
  },
  {
    id: "kafka",
    name: "Franz Kafka",
    cn: "弗朗茨·卡夫卡",
    years: "1883-1924",
    role: "作家",
    group: "culture",
    x: -288,
    y: 86,
    z: -78,
    size: 10,
    summary: "图谱标注他摘抄过克尔凯郭尔句子，连接文学、存在主义和精神分析语境。",
    works: ["《变形记》"]
  },
  {
    id: "drucker",
    name: "Peter F. Drucker",
    cn: "彼得·德鲁克",
    years: "1909-2005",
    role: "管理学创始人",
    group: "culture",
    x: -258,
    y: 8,
    z: 92,
    size: 9,
    summary: "犹太人，社会生态学家。原图记载他小时候见过弗洛伊德；母亲评价弗洛伊德是对欧洲影响极大的人物之一。",
    works: ["《旁观者》", "《生态愿景》"]
  },
  {
    id: "rollo",
    name: "Rollo May",
    cn: "罗洛·梅",
    years: "1909-1994",
    role: "存在主义心理治疗代表",
    group: "existential",
    x: 118,
    y: 38,
    z: 118,
    size: 10,
    summary: "图谱标注《存在》，并把他与阿德勒和欧文·亚隆连接起来。",
    works: ["《存在》"]
  },
  {
    id: "yalom",
    name: "Irvin D. Yalom",
    cn: "欧文·亚隆",
    years: "1931-",
    role: "存在主义心理治疗师",
    group: "existential",
    x: 168,
    y: 82,
    z: 54,
    size: 10,
    summary: "图谱标注《成为我自己》，并提到 Yalom 上过包含克尔凯郭尔内容的存在主义课程。",
    works: ["《成为我自己》"]
  },
  {
    id: "maslow",
    name: "Abraham Maslow",
    cn: "亚伯拉罕·马斯洛",
    years: "1908-1970",
    role: "人本主义心理学代表",
    group: "humanistic",
    x: 156,
    y: -34,
    z: -102,
    size: 10,
    summary: "犹太人，马斯洛需求金字塔提出者。图谱把他与人本主义心理学运动相连。",
    works: ["需求层次理论"]
  },
  {
    id: "rogers",
    name: "Carl Rogers",
    cn: "卡尔·罗杰斯",
    years: "1902-1987",
    role: "人本主义心理学创始者之一",
    group: "humanistic",
    x: 188,
    y: -112,
    z: 16,
    size: 10,
    summary: "首创非指导性治疗，又称案主中心治疗。图谱标注《成为一个人》。",
    works: ["《成为一个人》"]
  },
  {
    id: "goldstein",
    name: "Kurt Goldstein",
    cn: "库尔特·戈德斯坦",
    years: "1878-1965",
    role: "神经学家与精神病学家",
    group: "humanistic",
    x: 52,
    y: 164,
    z: 40,
    size: 9,
    summary: "神经学家与精神科医师，以机体整体理论著称；原图将他连接到马斯洛。",
    works: ["整体机体理论"]
  },
  {
    id: "suzuki",
    name: "D. T. Suzuki",
    cn: "铃木大拙",
    years: "1870-1966",
    role: "禅宗思想传播者",
    group: "culture",
    x: 10,
    y: 196,
    z: -58,
    size: 9,
    summary: "禅风西渐的先锋人物。图谱标注他与弗洛姆合著或对谈《禅与心理分析》。",
    works: ["《禅与心理分析》"]
  },
  {
    id: "kierkegaard",
    name: "Soren Kierkegaard",
    cn: "克尔凯郭尔",
    years: "1813-1855",
    role: "丹麦哲学家",
    group: "philosophy",
    x: -302,
    y: 196,
    z: 24,
    size: 11,
    summary: "图谱标注《恐惧与战栗》，并连接卡夫卡、彼得·德鲁克与欧文·亚隆。",
    works: ["《恐惧与战栗》"]
  },
  {
    id: "marx",
    name: "Karl Marx",
    cn: "卡尔·马克思",
    years: "1818-1883",
    role: "哲学家与政治经济学家",
    group: "philosophy",
    x: -408,
    y: 152,
    z: -12,
    size: 12,
    summary: "图谱中作为宏观思想源流节点出现，连接社会理论与后续心理/文化思想背景。",
    works: ["《资本论》"]
  },
  {
    id: "arendt",
    name: "Hannah Arendt",
    cn: "汉娜·阿伦特",
    years: "1906-1975",
    role: "政治哲学家",
    group: "philosophy",
    x: -382,
    y: -168,
    z: 22,
    size: 10,
    summary: "美籍德裔犹太人，图谱标注她与海德格尔的多年通信和复杂关系。",
    works: ["《人的境况》", "《心智生活》"]
  },
  {
    id: "heidegger",
    name: "Martin Heidegger",
    cn: "海德格尔",
    years: "1889-1976",
    role: "存在主义相关哲学家",
    group: "philosophy",
    x: -254,
    y: -238,
    z: -82,
    size: 10,
    summary: "图谱标注《存在与时间》，并明确连接汉娜·阿伦特。",
    works: ["《存在与时间》"]
  },
  {
    id: "sartre",
    name: "Jean-Paul Sartre",
    cn: "让-保罗·萨特",
    years: "1905-1980",
    role: "存在主义哲学家",
    group: "existential",
    x: -302,
    y: -302,
    z: 78,
    size: 10,
    summary: "图谱标注《存在与虚无》，位于存在主义哲学到心理治疗的延长线上。",
    works: ["《存在与虚无》"]
  },
  {
    id: "levi",
    name: "Claude Levi-Strauss",
    cn: "列维-斯特劳斯",
    years: "1908-2009",
    role: "结构人类学家",
    group: "culture",
    x: 34,
    y: -274,
    z: 96,
    size: 10,
    summary: "法国人类学家、社会学家、哲学家、语言学家。原图将他与皮亚杰的结构主义脉络相连。",
    works: ["《忧郁的热带》", "《结构人类学》"]
  },
  {
    id: "kuhn",
    name: "Thomas Kuhn",
    cn: "托马斯·库恩",
    years: "1922-1996",
    role: "科学哲学家",
    group: "philosophy",
    x: 158,
    y: -252,
    z: -46,
    size: 9,
    summary: "图谱标注《必要的张力》，连接科学哲学、结构主义与认知科学的路径。",
    works: ["《必要的张力》"]
  },
  {
    id: "lewin",
    name: "Kurt Lewin",
    cn: "库尔特·勒温",
    years: "1890-1947",
    role: "社会心理学家",
    group: "systems",
    x: 270,
    y: 10,
    z: 22,
    size: 11,
    summary: "犹太人，群体动力学和场论的重要人物。图谱标注《拓扑心理学》。",
    works: ["群体动力学", "场论"]
  },
  {
    id: "bertalanffy",
    name: "Ludwig von Bertalanffy",
    cn: "路德维希·冯·贝塔朗菲",
    years: "1901-1972",
    role: "一般系统理论创始人",
    group: "systems",
    x: 264,
    y: -88,
    z: -104,
    size: 10,
    summary: "生物学家，一般系统理论创始人。图谱把他与勒温、格式塔、系统论线索相邻放置。",
    works: ["一般系统理论"]
  },
  {
    id: "piaget",
    name: "Jean Piaget",
    cn: "皮亚杰",
    years: "1896-1980",
    role: "心理学家与认知发展理论家",
    group: "systems",
    x: 348,
    y: -134,
    z: 56,
    size: 11,
    summary: "瑞士心理学家，兼通数学、逻辑、物理学、生物学等。图谱标注《结构主义》。",
    works: ["《结构主义》", "认知发展理论"]
  },
  {
    id: "wertheimer",
    name: "Max Wertheimer",
    cn: "马克斯·韦特墨",
    years: "1880-1943",
    role: "格式塔心理学创始人之一",
    group: "systems",
    x: 232,
    y: -168,
    z: 22,
    size: 10,
    summary: "格式塔心理学三创始人之一。图谱标注“整体大于部分之和”。",
    works: ["格式塔心理学"]
  },
  {
    id: "bateson",
    name: "Gregory Bateson",
    cn: "格雷戈里·贝特森",
    years: "1904-1980",
    role: "人类学家与控制论思想家",
    group: "systems",
    x: 356,
    y: 72,
    z: -62,
    size: 12,
    summary: "横跨人类学、社会学、心理学、哲学、语言学、控制论、传播学。图谱标注《心灵生态学导论》。",
    works: ["《心灵生态学导论》"]
  },
  {
    id: "mead",
    name: "Margaret Mead",
    cn: "玛格丽特·米德",
    years: "1901-1978",
    role: "人类学家",
    group: "systems",
    x: 408,
    y: 116,
    z: 78,
    size: 10,
    summary: "美国人类学家，总统自由勋章获得者。图谱标注她发表 cybernetics of cybernetics 相关首创文章。",
    works: ["文化人类学研究"]
  },
  {
    id: "benedict",
    name: "Ruth Benedict",
    cn: "露丝·本尼迪克特",
    years: "1887-1948",
    role: "人类学家与民俗学家",
    group: "systems",
    x: 326,
    y: 142,
    z: -18,
    size: 9,
    summary: "图谱标注《菊与刀》，并记录她与玛格丽特·米德的朋友及论文指导关系。",
    works: ["《菊与刀》"]
  },
  {
    id: "maturana",
    name: "Humberto Maturana",
    cn: "马图拉纳",
    years: "1928-2021",
    role: "生物学家与二阶控制论思想家",
    group: "systems",
    x: 468,
    y: 144,
    z: 8,
    size: 10,
    summary: "智利生物学家、哲学家，二阶控制论理论家。图谱标注《from being to doing》。",
    works: ["《from being to doing》"]
  },
  {
    id: "foerster",
    name: "Heinz von Foerster",
    cn: "海因茨·冯·福斯特",
    years: "1911-2002",
    role: "二阶控制论代表人物",
    group: "systems",
    x: 536,
    y: 164,
    z: -86,
    size: 10,
    summary: "美澳双籍科学家、物理学家、哲学家。图谱标注他发展二阶控制论，并以 doomsday equation 闻名。",
    works: ["二阶控制论"]
  },
  {
    id: "kandel",
    name: "Eric R. Kandel",
    cn: "埃里克·坎德尔",
    years: "1929-",
    role: "神经科学家",
    group: "neuroscience",
    x: 292,
    y: -42,
    z: 126,
    size: 10,
    summary: "犹太人，诺贝尔生理学奖得主，图谱标注《追寻记忆的痕迹》。",
    works: ["《追寻记忆的痕迹》"]
  },
  {
    id: "edelman",
    name: "Gerald Edelman",
    cn: "杰拉尔德·埃德尔曼",
    years: "1929-2014",
    role: "神经达尔文主义倡导者",
    group: "neuroscience",
    x: 484,
    y: -42,
    z: 86,
    size: 11,
    summary: "美国生物学家、免疫学专家、神经科学家，诺贝尔生理学奖得主。图谱标注“神经达尔文主义”。",
    works: ["神经达尔文主义"]
  },
  {
    id: "tononi",
    name: "Giulio Tononi",
    cn: "朱利奥·托诺尼",
    years: "1960-",
    role: "整合信息论提出者",
    group: "neuroscience",
    x: 768,
    y: 82,
    z: 106,
    size: 10,
    summary: "意大利裔神经科学与神经病学家，整合信息论提出者。",
    works: ["整合信息论"]
  },
  {
    id: "koch",
    name: "Christof Koch",
    cn: "克里斯托夫·科赫",
    years: "1956-",
    role: "意识研究领军人物",
    group: "neuroscience",
    x: 742,
    y: 18,
    z: -24,
    size: 10,
    summary: "意识研究领军人物。图谱将他放在当代意识科学谱系中。",
    works: ["意识神经科学"]
  },
  {
    id: "sporns",
    name: "Olaf Sporns",
    cn: "奥拉夫·斯波恩斯",
    years: "1963-",
    role: "网络神经科学先驱",
    group: "neuroscience",
    x: 832,
    y: 132,
    z: 44,
    size: 10,
    summary: "德国神经科学家，connectome 研究先锋，提出将大脑视为复杂网络系统。",
    works: ["网络神经科学"]
  },
  {
    id: "friston",
    name: "Karl Friston",
    cn: "卡尔·弗里斯顿",
    years: "1959-",
    role: "自由能原理提出者",
    group: "neuroscience",
    x: 618,
    y: -142,
    z: -10,
    size: 12,
    summary: "英国神经科学家与理论建模大师，提出自由能原理。图谱把他与 Mark Solms 的神经精神分析整合方向相连。",
    works: ["自由能原理"]
  },
  {
    id: "solms",
    name: "Mark Solms",
    cn: "马克·索姆斯",
    years: "1961-",
    role: "神经精神分析代表人物",
    group: "neuroscience",
    x: 526,
    y: -176,
    z: 84,
    size: 11,
    summary: "南非精神分析师、神经心理学家、神经精神分析代表人物。图谱标注他用 Friston 的自由能原理整合弗洛伊德理论。",
    works: ["《The Hidden Spring》"]
  },
  {
    id: "changeux",
    name: "Jean-Pierre Changeux",
    cn: "让-皮埃尔·尚热",
    years: "1936-",
    role: "法国神经科学家",
    group: "neuroscience",
    x: 628,
    y: -42,
    z: -88,
    size: 10,
    summary: "表观遗传、突触稳定性和蛋白质研究相关。图谱连接他与全局工作空间理论。",
    works: ["全局工作空间理论相关"]
  },
  {
    id: "dehaene",
    name: "Stanislas Dehaene",
    cn: "斯坦尼斯拉斯·迪昂",
    years: "1965-",
    role: "认知神经科学家",
    group: "neuroscience",
    x: 678,
    y: 28,
    z: 72,
    size: 10,
    summary: "法国认知神经科学家，研究意识、语言与数学能力在大脑中的机制。",
    works: ["《脑与阅读》", "《精准学习》"]
  }
];

function makeLink(source, target, type, label, fullText, options = {}) {
  return {
    source,
    target,
    type,
    label,
    fullText,
    ...options
  };
}

export const links = [
  makeLink("freud", "jung", "conflict", "偶像；后来决裂", "偶像，后来决裂", {
    directed: true,
    weight: 2.2
  }),
  makeLink("freud", "adler", "mentor", "师徒", "师徒", {
    directed: true,
    weight: 1.7
  }),
  makeLink("freud", "klein", "school", "同流派", "同流派", {
    weight: 1.2
  }),
  makeLink(
    "freud",
    "fromm",
    "influence",
    "精神导师；启发人本主义精神分析",
    "Fromm的两位精神导师之一，关注社会性对人的塑造，启发其开创“人本主义精神分析”",
    { directed: true, weight: 1.6 }
  ),
  makeLink(
    "freud",
    "horney",
    "conflict",
    "受启发，也尖锐反对",
    "受启发于，但也尖锐反对弗洛伊德的一些观点，称应当考虑社会文化对人的心理塑造，亦提出女性主义精神分析视角",
    { directed: true, weight: 1.5 }
  ),
  makeLink("freud", "emma", "collaboration", "共事", "共事", {
    weight: 1.1
  }),
  makeLink(
    "freud",
    "drucker",
    "dialogue",
    "童年见过并握手",
    "小时候见过，握过手，其母亲尽管不赞成弗洛伊德观点，但评价其为“对欧洲影响最大的人之一”",
    { directed: true, weight: 1.4 }
  ),
  makeLink("freud", "yalom", "influence", "启发", "启发", {
    directed: true,
    weight: 1.1
  }),
  makeLink("freud", "erikson", "mentor", "师徒", "师徒", {
    directed: true,
    weight: 1.4
  }),
  makeLink("freud", "kandel", "influence", "启发", "启发", {
    directed: true,
    weight: 1.1
  }),
  makeLink("freud", "sabina", "peer", "朋友", "朋友", {
    weight: 1.1
  }),
  makeLink("freud", "sartre", "influence", "影响", "影响", {
    directed: true,
    weight: 1.2
  }),
  makeLink(
    "freud",
    "campbell",
    "influence",
    "启发其理解梦与神话",
    "启发Campbell领悟“神话是公开的梦，梦是私人的神话”",
    { directed: true, weight: 1.4 }
  ),
  makeLink("jung", "emma", "spouse", "配偶", "配偶", {
    weight: 1.2
  }),
  makeLink(
    "jung",
    "sabina",
    "mentor",
    "导师、同僚、咨询师；亲密关系",
    "卡尔是萨宾娜的博士导师、同僚、咨询师，有过亲密关系",
    { directed: true, weight: 1.5 }
  ),
  makeLink("jung", "campbell", "influence", "启发", "启发", {
    directed: true,
    weight: 1.1
  }),
  makeLink("anna", "erikson", "collaboration", "训练伙伴", "训练伙伴", {
    weight: 1.1
  }),
  makeLink(
    "kierkegaard",
    "kafka",
    "influence",
    "摘抄其句子",
    "Kafka摘抄了克尔凯郭尔的句子：“没有人既能有真正的精神生活，又能同时保持身心绝对健康”",
    { directed: true, weight: 1.2 }
  ),
  makeLink(
    "kierkegaard",
    "yalom",
    "influence",
    "课程包含其思想",
    "Yalom上过存在主义的课，包含克尔凯郭尔内容。",
    { directed: true, weight: 1.2 }
  ),
  makeLink(
    "kierkegaard",
    "drucker",
    "influence",
    "启发其写作",
    "启发peter写下《“不合时宜”的克尔凯郭尔》",
    { directed: true, weight: 1.2 }
  ),
  makeLink("marx", "fromm", "influence", "精神导师之一", "Fromm的两位精神导师之一", {
    directed: true,
    weight: 1.2
  }),
  makeLink(
    "fromm",
    "suzuki",
    "collaboration",
    "合著／对谈",
    "合著作品《禅宗与精神分析》（亦有对谈版作品《禅与心理分析》）",
    { weight: 1.4 }
  ),
  makeLink("suzuki", "horney", "influence", "结识并启发", "结识并启发", {
    directed: true,
    weight: 1.1
  }),
  makeLink("fromm", "horney", "spouse", "情侣", "情侣", {
    weight: 1.2
  }),
  makeLink(
    "adler",
    "rollo",
    "influence",
    "见面讨论；启发进入心理学",
    "见过+讨论过，启发May进入心理学领域",
    { directed: true, weight: 1.2 }
  ),
  makeLink("yalom", "rollo", "dialogue", "同行；互相启发", "同行，互相启发", {
    weight: 1.1
  }),
  makeLink("horney", "maslow", "mentor", "导师", "mentor", {
    directed: true,
    weight: 1.2
  }),
  makeLink("adler", "maslow", "mentor", "良师益友", "良师益友", {
    directed: true,
    weight: 1.2
  }),
  makeLink("goldstein", "maslow", "influence", "影响", "influence", {
    directed: true,
    weight: 1.3
  }),
  makeLink("benedict", "maslow", "mentor", "督导", "supervise", {
    directed: true,
    weight: 1.3
  }),
  makeLink("wertheimer", "maslow", "mentor", "督导", "supervise", {
    directed: true,
    weight: 1.3
  }),
  makeLink(
    "bertalanffy",
    "maslow",
    "school",
    "直接关联（未标文字）",
    "原图在两人之间画有直接连线，但未标注关系文字。",
    { sourceAnnotated: false, weight: 1 }
  ),
  makeLink(
    "maslow",
    "rogers",
    "collaboration",
    "共创人本主义运动",
    "开创人本主义心理学的运动",
    { directed: true, weight: 1.3 }
  ),
  makeLink("sabina", "piaget", "dialogue", "为其做咨询", "为皮亚杰做咨询", {
    directed: true,
    weight: 1.1
  }),
  makeLink("heidegger", "arendt", "mentor", "导师；恋人", "导师+恋人", {
    directed: true,
    weight: 1.3
  }),
  makeLink("sartre", "lacan", "influence", "影响", "影响", {
    directed: true,
    weight: 1.2
  }),
  makeLink("bertalanffy", "lewin", "school", "场论处有重叠", "场论处有重叠", {
    weight: 1.1
  }),
  makeLink(
    "wertheimer",
    "lewin",
    "collaboration",
    "合作并影响",
    "co-work and influence",
    { directed: true, weight: 1.3 }
  ),
  makeLink("wertheimer", "piaget", "influence", "启发", "启发", {
    directed: true,
    weight: 1.1
  }),
  makeLink("lewin", "piaget", "influence", "启发", "启发", {
    directed: true,
    weight: 1.1
  }),
  makeLink("piaget", "levi", "influence", "启发", "启发", {
    directed: true,
    weight: 1.2
  }),
  makeLink("erikson", "benedict", "peer", "朋友", "朋友", {
    weight: 1.1
  }),
  makeLink("erikson", "bateson", "peer", "朋友", "朋友", {
    weight: 1.1
  }),
  makeLink(
    "benedict",
    "mead",
    "mentor",
    "朋友；硕士论文指导",
    "朋友；指导后者硕士论文",
    { directed: true, weight: 1.3 }
  ),
  makeLink(
    "mead",
    "bateson",
    "spouse",
    "夫妻",
    "夫妻。玛格丽特的第三任丈夫",
    { weight: 1.3 }
  ),
  makeLink(
    "mead",
    "foerster",
    "influence",
    "发展二阶控制论",
    "后者发展了前者的二阶控制论",
    { directed: true, weight: 1.3 }
  ),
  makeLink(
    "bateson",
    "maturana",
    "dialogue",
    "经二阶控制论主题关联",
    "二者在原图中共同连接主题节点：“Topic: cybernetics of cybernetics —— 当观察者不再隐身，成为环境。”原图没有画成直接人物关系。",
    { projected: true, weight: 1 }
  ),
  makeLink(
    "maturana",
    "foerster",
    "dialogue",
    "经二阶控制论主题关联",
    "二者在原图中共同连接主题节点：“Topic: cybernetics of cybernetics —— 当观察者不再隐身，成为环境。”原图没有画成直接人物关系。",
    { projected: true, weight: 1 }
  ),
  makeLink("edelman", "sporns", "mentor", "师生", "师生", {
    directed: true,
    weight: 1.3
  }),
  makeLink("edelman", "tononi", "collaboration", "合著《意识的宇宙》", "合著《意识的宇宙》", {
    weight: 1.3
  }),
  makeLink("koch", "tononi", "collaboration", "合作者", "合作者", {
    weight: 1.2
  }),
  makeLink(
    "changeux",
    "dehaene",
    "collaboration",
    "全局工作空间理论",
    "合作提出全局工作空间理论（Global Workspace Theory, GWT）",
    { weight: 1.4 }
  ),
  makeLink(
    "edelman",
    "changeux",
    "influence",
    "神经达尔文主义：提出与发展",
    "前者是“神经达尔文主义”提出者，后者是进一步发展该理论的人。",
    { directed: true, weight: 1.4 }
  ),
  makeLink(
    "friston",
    "changeux",
    "dialogue",
    "精神同道；同台发言",
    "精神同道，曾在多个重要会议上同台发言；一些综述文章把他们放在一起讨论",
    { weight: 1.2 }
  ),
  makeLink(
    "solms",
    "friston",
    "dialogue",
    "自由能原理与神经精神分析",
    "Mark在其新书《The Hidden Spring》中明确强调，“Friston的自由能原理提供了我们整合弗洛伊德理论与当代表征神经科学的方式。”Karl在一次访谈中说：“我对精神分析的重新崛起很感兴趣，尤其是在试图理解我们为什么要有欲望和自我调节机制方面。”",
    { weight: 1.5 }
  )
];
