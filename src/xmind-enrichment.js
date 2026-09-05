// Display metadata supplements the XMind transcription; sourceText remains untouched.
const rows = [
  ["spinoza", "斯宾诺莎", "Baruch Spinoza", "1632-1677", "philosophy", "哲学家", "荷兰哲学家，以实体一元论和《伦理学》著称。"],
  ["cannon", "沃尔特·坎农", "Walter Bradford Cannon", "1871-1945", "neuroscience", "生理学家", "研究战斗或逃跑反应，并发展了内稳态（homeostasis）概念。"],
  ["mccarthy", "玛丽·麦卡锡", "Mary McCarthy", "1912-1989", "culture", "作家与评论家", "美国作家，以对知识分子、婚姻和女性处境的尖锐观察闻名，代表作有《她们》。"],
  ["aristotle", "亚里士多德", "Aristotle", "前384—前322", "philosophy", "古希腊哲学家", "古希腊哲学家，其研究横跨逻辑、伦理学、政治学和自然科学。", -384],
  ["sontag", "苏珊·桑塔格", "Susan Sontag", "1933-2004", "culture", "作家与文化评论家", "美国作家、艺术评论家与电影导演，关注文学、影像和现代文化。"],
  ["einstein", "阿尔伯特·爱因斯坦", "Albert Einstein", "1879-1955", "systems", "理论物理学家", "提出相对论，并因对光电效应的解释获 1921 年诺贝尔物理学奖。"],
  ["koffka", "库尔特·考夫卡", "Kurt Koffka", "1886-1941", "humanistic", "格式塔心理学家", "格式塔心理学奠基者之一，研究知觉与心理发展，著有《格式塔心理学原理》。"],
  ["marom", "西蒙·马罗姆", "Shimon Marom", "1958-", "neuroscience", "神经科学家", "以色列神经科学家，研究神经系统的动力学，并探讨神经科学与精神分析的对话。"],
  ["ogden", "托马斯·奥格登", "Thomas H. Ogden", "1946-", "psychoanalysis", "精神分析学家", "美国精神分析学家，关注主体间性与分析中的创造性体验，著有《心灵的母体》《创造性阅读》。"],
  ["kahneman", "丹尼尔·卡尼曼", "Daniel Kahneman", "1934-2024", "neuroscience", "认知心理学家", "研究判断与决策中的认知偏差，获诺贝尔经济学奖，著有《思考，快与慢》。"],
  ["treisman", "安妮·特雷斯曼", "Anne Treisman", "1935-2018", "neuroscience", "认知心理学家", "研究视觉注意与知觉，提出特征整合理论。"],
  ["steiner", "鲁道夫·施泰纳", "Rudolf Steiner", "1861-1925", "philosophy", "哲学家与教育家", "人智学创立者与华德福教育的发起人，亦从事建筑和艺术实践。"],
  ["goethe", "约翰·沃尔夫冈·冯·歌德", "Johann Wolfgang von Goethe", "1749-1832", "culture", "作家与自然研究者", "德语文学的重要作家，同时从事哲学、美学与自然科学研究。"],
  ["schwind", "莫里茨·冯·施温德", "Moritz von Schwind", "1804-1871", "culture", "浪漫主义画家", "奥地利画家，创作常与音乐、传说和诗歌相互呼应。"],
  ["feigenbaum", "米切尔·费根鲍姆", "Mitchell Jay Feigenbaum", "1944-2019", "systems", "数学物理学家", "混沌理论先驱，发现倍周期分岔中的普适性与费根鲍姆常数。"],
  ["smith", "亚当·斯密", "Adam Smith", "1723-1790", "philosophy", "经济学家与道德哲学家", "苏格兰思想家，著有《国富论》，研究经济生活与道德判断。"],
  ["darwin", "查尔斯·达尔文", "Charles Darwin", "1809-1882", "systems", "博物学家与生物学家", "英国博物学家，系统阐述以自然选择解释生物演化的理论。"],
  ["malthus", "托马斯·罗伯特·马尔萨斯", "Thomas Robert Malthus", "1766-1834", "philosophy", "人口学家与经济学家", "英国经济学家，以《人口原理》中对人口增长与生存资源关系的讨论著称。"],
  ["mcculloch", "约翰·拉姆齐·麦卡洛克", "John Ramsay McCulloch", "1789-1864", "philosophy", "经济学家与编辑", "苏格兰经济学家与编辑，是李嘉图经济学传统的重要传播者。"],
  ["connes", "阿兰·孔涅", "Alain Connes", "1947-", "systems", "数学家", "法国数学家，非交换几何的主要创立者，1982 年获菲尔兹奖。"],
  ["merton", "托马斯·默顿", "Thomas Merton", "1915-1968", "philosophy", "修士、作家与思想家", "天主教修士与作家，著有《七重山》，长期探索跨宗教对话。"],
  ["beauvoir", "西蒙娜·德·波伏娃", "Simone de Beauvoir", "1908-1986", "existential", "哲学家与作家", "法国存在主义思想家与女性主义者，著有《第二性》《他人的血》。"],
  ["zhuangzi", "庄子", "Zhuangzi", "约前369—前286", "philosophy", "先秦哲学家", "战国时期道家思想家，以寓言探讨自我、知识、变化与逍遥；生卒年份为传统约数。", -369],
  ["mahler", "古斯塔夫·马勒", "Gustav Mahler", "1860-1911", "culture", "作曲家与指挥家", "奥地利作曲家与指挥家，以交响曲和声乐创作著称。"],
  ["leibovitz", "安妮·莱博维茨", "Annie Leibovitz", "1949-", "culture", "肖像摄影师", "美国摄影师，曾任《滚石》杂志摄影师，以人物肖像摄影闻名。"],
  ["lennon", "约翰·列侬", "John Lennon", "1940-1980", "culture", "音乐家与词曲作者", "英国音乐家，披头士乐队成员，也以个人音乐创作和和平倡议闻名。"],
  ["ono", "小野洋子", "Yoko Ono", "1933-", "culture", "艺术家与音乐家", "日本出生的艺术家与音乐家，实践涵盖观念艺术、表演、电影与音乐。"]
];

export const enrichment = Object.fromEntries(rows.map(([id, cn, name, years, group, role, summary, year]) => [id, {
  id, cn, name, years, group, role, summary, birthYear: year ?? Number(years.slice(0, 4)), size: 9, works: []
}]));

enrichment.cybernetics = {
  id: "cybernetics", cn: "二阶控制论", name: "Cybernetics of cybernetics", years: "主题节点",
  group: "systems", role: "当观察者不再隐身，成为环境", size: 14, works: [],
  summary: "这是原图中的主题，不是一位人物。星形节点连接米德、贝特森、马图拉纳和冯·福斯特；四条连线在 XMind 中没有另写关系文字。"
};

enrichment.koffka.group = "systems";
enrichment.fromm = { summary: "精神分析学家与社会思想家，强调社会文化对人的塑造，著有《在幻想锁链的彼岸》《爱的艺术》。" };
enrichment.marom.portraitUnavailableReason = "可靠来源头像的再利用许可尚未确认，暂用字母占位。";
enrichment.ogden.portraitUnavailableReason = "可靠来源头像的再利用许可尚未确认，暂用字母占位。";
enrichment.campbell = { summary: "文学及比较神话学者，著有《千面英雄》；原图标注弗洛伊德启发其理解梦与神话的关系，并另有荣格对他的影响。" };
enrichment.arendt = { summary: "美籍德裔政治哲学家，著有《人的境况》《心智生活》。原图分别记录了她与玛丽·麦卡锡的友谊，以及与海德格尔的师生和恋情关系。" };
enrichment.benedict = { summary: "美国人类学家与民俗学家，著有《菊与刀》；原图记载她指导玛格丽特·米德的硕士论文。" };
Object.assign(enrichment, {
  kuhn: { years: "1922-1996", summary: "美国科学史家与科学哲学家，在《科学革命的结构》中以范式、常规科学和科学革命解释科学的发展。" },
  erikson: { name: "Erik Erikson", summary: "精神分析师与发展心理学家，提出覆盖一生的心理社会发展八阶段理论，并研究身份认同危机。" },
  anna: { summary: "儿童精神分析先驱，通过理论创新和临床实践推动儿童心理治疗、教育与照护的发展。" },
  sabina: { cn: "萨宾娜·施皮尔赖因", summary: "早期女性精神分析师与儿童分析先驱，研究破坏性驱力、儿童心理及语言发展。" },
  koch: { summary: "神经科学家，长期研究意识的神经基础，并与弗朗西斯·克里克共同推进意识神经相关物的研究。" }
});

const biographySources = {
  marom: [["剑桥大学出版社 · 出生年编目", "https://assets.cambridge.org/97811071/01180/frontmatter/9781107101180_frontmatter.pdf"], ["Samuel Neaman Institute", "https://www.neaman.org.il/en/leadership/shimon-marom/"]],
  kuhn: [["斯坦福哲学百科", "https://plato.stanford.edu/entries/thomas-kuhn/"]],
  aristotle: [["斯坦福哲学百科", "https://plato.stanford.edu/entries/aristotle/"]],
  einstein: [["诺贝尔奖官方传记", "https://www.nobelprize.org/prizes/physics/1921/einstein/biographical/"]],
  malthus: [["英国科学博物馆集团", "https://collection.sciencemuseumgroup.org.uk/people/cp38785"]],
  connes: [["法兰西公学院", "https://www.college-de-france.fr/en/person/alain-connes"]],
  zhuangzi: [["中国网 · 年代约数", "https://www.china.org.cn/english/china_key_words/2025-06/12/content_117923490.html"]],
  lennon: [["John Lennon 官方传记", "https://www.johnlennon.com/about/"]],
  ono: [["MoMA 艺术家档案", "https://www.moma.org/artists/4410-yoko-ono"]],
  erikson: [["哈佛大学心理学系", "https://psychology.fas.harvard.edu/people/erik-erikson"]],
  anna: [["伦敦弗洛伊德博物馆", "https://www.freud.org.uk/schools/resources/anna-freud-life-and-work/"]],
  sabina: [["国际 Spielrein 研究协会", "https://www.spielreinassociation.org/her-life-and-work"]],
  koch: [["Allen Institute", "https://alleninstitute.org/person/christof-koch"]]
};
for (const [id, sources] of Object.entries(biographySources)) {
  enrichment[id].biographySources = sources.map(([label, url]) => ({ label, url }));
}
