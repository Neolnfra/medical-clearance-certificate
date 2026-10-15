// 明检 MedClear —— 医学指标知识库与家庭健康数据
// 说明：参考区间与解读依据《中国成人健康体检基本项目专家共识》等公开资料整理，用于大赛 Demo 演示。

export const SYSTEMS = [
  { key: 'cardio', name: '心脑血管', color: '#e5484d' },
  { key: 'liver', name: '肝胆', color: '#e0900b' },
  { key: 'kidney', name: '肾脏', color: '#7c5cff' },
  { key: 'metabolic', name: '代谢', color: '#0e9f8e' },
  { key: 'blood', name: '血液', color: '#2f6bff' },
  { key: 'endocrine', name: '内分泌', color: '#12b8a0' }
]

// 指标知识库：参考区间、所属系统、临床意义、高低值解读与干预建议
export const INDICATORS = {
  BMI: { name: '体质指数', en: 'BMI', unit: 'kg/m²', ref: [18.5, 23.9], cat: '基础', sys: 'metabolic', weight: 1.2,
    meaning: '衡量体重与身高的比例，是超重与肥胖的初筛指标。',
    high: '超重/肥胖，增加三高、脂肪肝与心脑血管风险。', low: '体重过低，可能存在营养不良。',
    adviceHigh: '控制总热量、减少精制碳水与含糖饮料，每周≥150 分钟中等强度有氧运动。',
    adviceLow: '增加优质蛋白与能量摄入，排查消化吸收或内分泌问题。' },
  BP_H: { name: '收缩压', en: 'SBP', unit: 'mmHg', ref: [90, 139], cat: '基础', sys: 'cardio', weight: 1.5,
    meaning: '心脏收缩时动脉内压力，是高血压诊断的关键指标。', high: '血压偏高，损伤心脑肾血管。', low: '血压偏低，警惕头晕与供血不足。',
    adviceHigh: '限盐（<5g/天）、戒烟限酒、监测血压，必要时心内科就诊。', adviceLow: '避免久站、及时补充水分，症状明显时就医。' },
  WBC: { name: '白细胞计数', en: 'WBC', unit: '×10⁹/L', ref: [3.5, 9.5], cat: '血常规', sys: 'blood', weight: 1,
    meaning: '反映免疫与炎症状态。', high: '升高常见于细菌感染、炎症或应激。', low: '降低提示免疫力下降、病毒感染或药物影响。',
    adviceHigh: '结合发热等症状排查感染灶，必要时抗感染治疗。', adviceLow: '注意休息、避免人群聚集，复查血常规。' },
  RBC: { name: '红细胞计数', en: 'RBC', unit: '×10¹²/L', ref: [4.3, 5.8], cat: '血常规', sys: 'blood', weight: 1,
    meaning: '反映血液携氧能力。', high: '升高见于脱水或慢性缺氧。', low: '降低提示贫血。',
    adviceHigh: '适量饮水，排查慢性缺氧因素。', adviceLow: '补充铁、叶酸、维生素B12，排查贫血病因。' },
  HGB: { name: '血红蛋白', en: 'HGB', unit: 'g/L', ref: [130, 175], cat: '血常规', sys: 'blood', weight: 1.4,
    meaning: '判断贫血的核心指标。', high: '升高见于脱水、慢性缺氧。', low: '降低提示贫血，可致乏力、头晕。',
    adviceHigh: '适量饮水并复查，排查血液系统问题。', adviceLow: '加强富铁饮食（红肉、动物肝脏），查铁代谢与贫血三项。' },
  PLT: { name: '血小板计数', en: 'PLT', unit: '×10⁹/L', ref: [125, 350], cat: '血常规', sys: 'blood', weight: 1,
    meaning: '参与凝血与止血。', high: '升高增加血栓风险。', low: '降低有出血倾向。',
    adviceHigh: '多饮水、适度活动，必要时血液科评估。', adviceLow: '避免剧烈碰撞与抗凝药物，及时血液科就诊。' },
  ALT: { name: '谷丙转氨酶', en: 'ALT', unit: 'U/L', ref: [9, 50], cat: '肝功能', sys: 'liver', weight: 1.5,
    meaning: '主要存在于肝细胞，是肝损伤最敏感指标。', high: '升高提示肝细胞受损，常见于脂肪肝、饮酒、药物或肝炎。', low: '临床意义较小。',
    adviceHigh: '戒酒、控制体重与血脂、停用可疑肝损药物，2-4 周复查肝功能。', adviceLow: '一般无需处理。' },
  AST: { name: '谷草转氨酶', en: 'AST', unit: 'U/L', ref: [15, 40], cat: '肝功能', sys: 'liver', weight: 1.3,
    meaning: '存在于肝、心肌、骨骼肌。', high: '升高提示肝或心肌、肌肉损伤。', low: '一般无临床意义。',
    adviceHigh: '结合 ALT、GGT 与心肌酶判断来源，必要时进一步检查。', adviceLow: '一般无需处理。' },
  GGT: { name: 'γ-谷氨酰转肽酶', en: 'GGT', unit: 'U/L', ref: [10, 60], cat: '肝功能', sys: 'liver', weight: 1.4,
    meaning: '反映胆道与酒精性肝损伤。', high: '升高常见于饮酒、脂肪肝、胆道问题。', low: '一般无临床意义。',
    adviceHigh: '严格戒酒、清淡饮食，完善肝胆超声检查。', adviceLow: '一般无需处理。' },
  TBIL: { name: '总胆红素', en: 'TBIL', unit: 'μmol/L', ref: [3.4, 20.5], cat: '肝功能', sys: 'liver', weight: 1.2,
    meaning: '反映胆红素代谢与胆道通畅。', high: '升高可见于肝损伤、溶血或胆道梗阻，可伴黄疸。', low: '一般无临床意义。',
    adviceHigh: '复查肝功能+腹部超声，观察皮肤巩膜是否发黄。', adviceLow: '一般无需处理。' },
  ALB: { name: '白蛋白', en: 'ALB', unit: 'g/L', ref: [40, 55], cat: '肝功能', sys: 'liver', weight: 1.2,
    meaning: '反映肝脏合成功能与营养状态。', high: '多为脱水导致血液浓缩。', low: '降低提示营养不足或肝脏合成功能下降。',
    adviceHigh: '适量饮水后复查。', adviceLow: '加强优质蛋白摄入，评估肝脏合成功能。' },
  Cr: { name: '肌酐', en: 'Cr', unit: 'μmol/L', ref: [57, 97], cat: '肾功能', sys: 'kidney', weight: 1.6,
    meaning: '反映肾小球滤过功能。', high: '升高提示肾功能下降。', low: '降低见于肌肉量少或营养不良。',
    adviceHigh: '控制蛋白质摄入、避免肾损药物，肾内科评估 eGFR。', adviceLow: '增加肌肉量与营养摄入。' },
  BUN: { name: '尿素氮', en: 'BUN', unit: 'mmol/L', ref: [3.1, 8.0], cat: '肾功能', sys: 'kidney', weight: 1.3,
    meaning: '反映蛋白质代谢与肾脏排泄功能。', high: '升高见于肾功能下降、脱水或高蛋白饮食。', low: '降低见于营养不足或肝功能异常。',
    adviceHigh: '适量饮水、适度控制蛋白，复查肾功能。', adviceLow: '均衡营养，复查肝肾功能。' },
  UA: { name: '血尿酸', en: 'UA', unit: 'μmol/L', ref: [208, 428], cat: '肾功能', sys: 'kidney', weight: 1.3,
    meaning: '尿酸代谢产物，与痛风及肾脏健康相关。', high: '升高增加痛风、尿路结石与肾损伤风险。', low: '一般无临床意义。',
    adviceHigh: '限高嘌呤饮食（内脏、海鲜、啤酒），多饮水，控制体重。', adviceLow: '一般无需处理。' },
  TC: { name: '总胆固醇', en: 'TC', unit: 'mmol/L', ref: [2.8, 5.2], cat: '血脂', sys: 'cardio', weight: 1.4,
    meaning: '血脂水平的重要指标。', high: '升高增加动脉粥样硬化与心脑血管风险。', low: '过低可能与营养或肝功能相关。',
    adviceHigh: '低脂低胆固醇饮食，增加膳食纤维与运动，必要时调脂治疗。', adviceLow: '均衡营养，评估肝脏与甲状腺功能。' },
  TG: { name: '甘油三酯', en: 'TG', unit: 'mmol/L', ref: [0.45, 1.7], cat: '血脂', sys: 'cardio', weight: 1.4,
    meaning: '与饮食、饮酒、代谢密切相关。', high: '升高增加胰腺炎与心血管风险。', low: '一般无临床意义。',
    adviceHigh: '限油限酒、控制精制碳水与体重，复查血脂。', adviceLow: '一般无需处理。' },
  LDL: { name: '低密度脂蛋白', en: 'LDL-C', unit: 'mmol/L', ref: [1.5, 3.4], cat: '血脂', sys: 'cardio', weight: 1.7,
    meaning: '"坏胆固醇"，是动脉粥样硬化的核心危险因素。', high: '升高是心脑血管事件的重要危险因素。', low: '一般无需干预。',
    adviceHigh: '严格低脂饮食、规律运动，高危人群需他汀等调脂治疗。', adviceLow: '一般无需处理。' },
  HDL: { name: '高密度脂蛋白', en: 'HDL-C', unit: 'mmol/L', ref: [1.0, 2.0], cat: '血脂', sys: 'cardio', weight: 1.2,
    meaning: '"好胆固醇"，有助于清除血管胆固醇。', high: '偏高通常有益。', low: '降低增加心血管风险。',
    adviceHigh: '一般无需干预。', adviceLow: '增加有氧运动、戒烟、控制体重以提升 HDL。' },
  GLP: { name: '空腹血糖', en: 'GLU', unit: 'mmol/L', ref: [3.9, 6.1], cat: '血糖', sys: 'metabolic', weight: 1.6,
    meaning: '糖尿病筛查的核心指标。', high: '升高提示糖调节受损或糖尿病。', low: '降低提示低血糖。',
    adviceHigh: '控制碳水、增加运动，复查空腹血糖与糖化血红蛋白。', adviceLow: '规律进餐，排查降糖药物或内分泌因素。' },
  HBA1C: { name: '糖化血红蛋白', en: 'HbA1c', unit: '%', ref: [4.0, 6.0], cat: '血糖', sys: 'metabolic', weight: 1.7,
    meaning: '反映近 2-3 个月平均血糖水平。', high: '升高提示长期血糖控制不佳。', low: '降低见于贫血或低血糖。',
    adviceHigh: '规范饮食运动，必要时内分泌科制定控糖方案。', adviceLow: '结合血糖与血红蛋白综合判断。' },
  TSH: { name: '促甲状腺激素', en: 'TSH', unit: 'mIU/L', ref: [0.27, 4.2], cat: '甲状腺', sys: 'endocrine', weight: 1.5,
    meaning: '反映甲状腺功能的核心指标。', high: '升高提示甲状腺功能减退倾向。', low: '降低提示甲状腺功能亢进倾向。',
    adviceHigh: '复查甲功三项+甲状腺超声，评估是否需补充甲状腺素。', adviceLow: '复查甲功，必要时内分泌科就诊。' },
  FT3: { name: '游离三碘甲状腺原氨酸', en: 'FT3', unit: 'pmol/L', ref: [3.1, 6.8], cat: '甲状腺', sys: 'endocrine', weight: 1.2,
    meaning: '活性甲状腺激素。', high: '升高见于甲亢。', low: '降低见于甲减。', adviceHigh: '内分泌科评估甲亢。', adviceLow: '结合 TSH、FT4 综合评估。' },
  FT4: { name: '游离甲状腺素', en: 'FT4', unit: 'pmol/L', ref: [12.0, 22.0], cat: '甲状腺', sys: 'endocrine', weight: 1.2,
    meaning: '活性甲状腺激素。', high: '升高见于甲亢。', low: '降低见于甲减。', adviceHigh: '内分泌科评估甲亢。', adviceLow: '结合 TSH、FT3 综合评估。' }
}

export const MEMBERS = [
  { id: 'me', name: '李明远', role: '本人', sex: '男', age: 28, avatar: '明', color: '#2f6bff',
    profile: ['互联网从业 · 长期久坐', '经常熬夜 · 应酬饮酒', '无慢性病史'] },
  { id: 'father', name: '李建国', role: '父亲', sex: '男', age: 55, avatar: '建', color: '#e5484d',
    profile: ['高血压 8 年 · 服药中', '轻度脂肪肝', '吸烟史 20 年 · 偶饮酒'] },
  { id: 'mother', name: '王秀兰', role: '母亲', sex: '女', age: 52, avatar: '秀', color: '#e0900b',
    profile: ['甲状腺结节随访中', '易疲劳 · 偶有心慌', '不吸烟不饮酒'] },
  { id: 'grandma', name: '张桂英', role: '祖母', sex: '女', age: 78, avatar: '桂', color: '#7c5cff',
    profile: ['骨质疏松', '血压偏高', '长期多种用药'] }
]

// 家庭体检报告（2026 年）。status 由引擎根据 ref 计算，此处仅存原始数值。
export const REPORTS = {
  me: {
    id: 'R-2026-0820-MY', date: '2026-08-20', org: '青岛市市立医院（东院区）', type: '职工年度健康体检',
    items: { BMI: 24.8, BP_H: 128, WBC: 6.2, RBC: 5.1, HGB: 155, PLT: 236, ALT: 62, AST: 38, GGT: 71, TBIL: 15.2, ALB: 46, Cr: 88, BUN: 5.1, UA: 452, TC: 5.6, TG: 2.4, LDL: 3.8, HDL: 1.1, GLP: 5.4, HBA1C: 5.5, TSH: 2.1, FT3: 4.6, FT4: 16.2 }
  },
  father: {
    id: 'R-2026-0715-FA', date: '2026-07-15', org: '青岛大学附属医院', type: '慢病管理复查',
    items: { BMI: 27.6, BP_H: 152, WBC: 7.1, RBC: 5.3, HGB: 158, PLT: 214, ALT: 78, AST: 55, GGT: 122, TBIL: 21.8, ALB: 43, Cr: 96, BUN: 6.4, UA: 486, TC: 6.4, TG: 3.1, LDL: 4.3, HDL: 0.9, GLP: 6.9, HBA1C: 6.4, TSH: 3.2, FT3: 4.9, FT4: 17.0 }
  },
  mother: {
    id: 'R-2026-0805-MO', date: '2026-08-05', org: '青岛市海慈医疗集团', type: '职工年度健康体检',
    items: { BMI: 23.5, BP_H: 126, WBC: 5.4, RBC: 3.6, HGB: 108, PLT: 268, ALT: 22, AST: 19, GGT: 24, TBIL: 12.1, ALB: 44, Cr: 62, BUN: 4.6, UA: 288, TC: 5.6, TG: 1.5, LDL: 3.6, HDL: 1.5, GLP: 5.6, HBA1C: 5.4, TSH: 6.8, FT3: 4.2, FT4: 14.8 }
  },
  grandma: {
    id: 'R-2026-0628-GR', date: '2026-06-28', org: '青岛市市立医院（本部）', type: '老年健康综合评估',
    items: { BMI: 21.2, BP_H: 150, WBC: 6.8, RBC: 3.3, HGB: 102, PLT: 198, ALT: 18, AST: 22, GGT: 26, TBIL: 11.5, ALB: 38, Cr: 108, BUN: 9.2, UA: 402, TC: 5.0, TG: 1.4, LDL: 3.1, HDL: 1.4, GLP: 6.0, HBA1C: 5.9, TSH: 3.6, FT3: 3.9, FT4: 13.6 }
  }
}

// 关键指标的历年趋势（用于趋势洞察）
export const HISTORY = {
  me: {
    ALT: [{ y: 2023, v: 34 }, { y: 2024, v: 41 }, { y: 2025, v: 52 }, { y: 2026, v: 62 }],
    LDL: [{ y: 2023, v: 2.9 }, { y: 2024, v: 3.2 }, { y: 2025, v: 3.5 }, { y: 2026, v: 3.8 }],
    UA: [{ y: 2023, v: 398 }, { y: 2024, v: 410 }, { y: 2025, v: 431 }, { y: 2026, v: 452 }],
    TG: [{ y: 2023, v: 1.5 }, { y: 2024, v: 1.8 }, { y: 2025, v: 2.1 }, { y: 2026, v: 2.4 }]
  },
  father: {
    LDL: [{ y: 2023, v: 3.4 }, { y: 2024, v: 3.9 }, { y: 2025, v: 4.6 }, { y: 2026, v: 4.3 }],
    GLP: [{ y: 2023, v: 6.1 }, { y: 2024, v: 6.3 }, { y: 2025, v: 6.6 }, { y: 2026, v: 6.9 }],
    BP_H: [{ y: 2023, v: 140 }, { y: 2024, v: 145 }, { y: 2025, v: 148 }, { y: 2026, v: 152 }],
    GGT: [{ y: 2023, v: 78 }, { y: 2024, v: 95 }, { y: 2025, v: 110 }, { y: 2026, v: 122 }]
  },
  mother: {
    TSH: [{ y: 2023, v: 4.0 }, { y: 2024, v: 4.8 }, { y: 2025, v: 5.6 }, { y: 2026, v: 6.8 }],
    HGB: [{ y: 2023, v: 126 }, { y: 2024, v: 121 }, { y: 2025, v: 114 }, { y: 2026, v: 108 }],
    LDL: [{ y: 2023, v: 3.0 }, { y: 2024, v: 3.2 }, { y: 2025, v: 3.4 }, { y: 2026, v: 3.6 }]
  },
  grandma: {
    Cr: [{ y: 2023, v: 82 }, { y: 2024, v: 90 }, { y: 2025, v: 99 }, { y: 2026, v: 108 }],
    HGB: [{ y: 2023, v: 118 }, { y: 2024, v: 112 }, { y: 2025, v: 106 }, { y: 2026, v: 102 }],
    BUN: [{ y: 2023, v: 6.8 }, { y: 2024, v: 7.5 }, { y: 2025, v: 8.4 }, { y: 2026, v: 9.2 }]
  }
}

// 危急值阈值（超出即标记为危急，需尽快就医）
export const CRITICAL = {
  GLP: { high: 11.1, low: 2.8 },
  Cr: { high: 133 },
  BP_H: { high: 180, low: 80 },
  HGB: { high: 200, low: 90 },
  PLT: { high: 600, low: 80 },
  ALT: { high: 200 },
  AST: { high: 200 }
}
