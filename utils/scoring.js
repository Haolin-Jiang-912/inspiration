// utils/scoring.js
// 评分与画像判定逻辑
// 输入: answers = { 题目id: 选项下标 }
// 输出: 六维度得分、总得分、综合人物画像

const { questions } = require('../data/questions.js');
const { dimensions, profiles } = require('../data/profiles.js');

// 维度得分率阈值
const HIGH_RATE = 0.75; // >= 75% 为高
const LOW_RATE = 0.5;   // < 50% 为低

function computeResult(answers) {
  // ---- 1. 每题得分 ----
  const perQuestion = {};
  let totalScore = 0;
  let totalMax = 0;

  questions.forEach((q) => {
    const maxScore = Math.max.apply(null, q.options.map((o) => o.score));
    totalMax += maxScore;

    const selectedIndex = answers[q.id];
    if (selectedIndex === undefined || selectedIndex === null || q.options[selectedIndex] === undefined) {
      perQuestion[q.id] = 0; // 未作答按 0 分（正常情况下不会发生）
      return;
    }
    const score = q.options[selectedIndex].score;
    perQuestion[q.id] = score;
    totalScore += score;
  });

  // ---- 2. 按维度累加 ----
  const dims = dimensions.map((dim) => {
    let score = 0;
    let max = 0;
    dim.questions.forEach((qid) => {
      const q = questions.find((x) => x.id === qid);
      if (!q) return;
      const qMax = Math.max.apply(null, q.options.map((o) => o.score));
      max += qMax;
      score += perQuestion[qid] || 0;
    });
    const rate = max > 0 ? score / max : 0;
    let level = 'mid';
    if (rate >= HIGH_RATE) level = 'high';
    else if (rate < LOW_RATE) level = 'low';

    const levelDesc = level === 'high' ? dim.highDesc : level === 'mid' ? dim.midDesc : dim.lowDesc;
    const levelText = level === 'high' ? '高' : level === 'mid' ? '中' : '低';

    return {
      id: dim.id,
      name: dim.name,
      shortName: dim.shortName,
      icon: dim.icon,
      desc: dim.desc,
      score: Math.round(score * 10) / 10,
      max,
      rate,
      level,
      levelText,
      levelDesc,
      percent: Math.round(rate * 100)
    };
  });

  const totalRate = totalMax > 0 ? totalScore / totalMax : 0;

  // ---- 3. 综合人物画像判定 ----
  const profile = judgeProfile(dims, totalRate);

  return {
    dims,
    perQuestion,
    totalScore,
    totalMax,
    totalRate,
    totalPercent: Math.round(totalRate * 100),
    profile
  };
}

// ---- 画像判定（按优先级从特殊到一般） ----
function judgeProfile(dims, totalRate) {
  const rate = dims.map((d) => d.rate); // [d1..d6]
  const d1 = rate[0], d2 = rate[1], d3 = rate[2], d4 = rate[3], d5 = rate[4], d6 = rate[5];
  const avg = totalRate;

  const keyDims = [d1, d3, d4, d6]; // 维度 1/3/4/6 为关键维度
  const countHigh = keyDims.filter((r) => r >= HIGH_RATE).length;
  const countLow = keyDims.filter((r) => r < 0.55).length;
  const othersAvg = (d1 + d2 + d3 + d5 + d6) / 5;
  const maxRate = Math.max.apply(null, rate);

  // ① 高结构-高元认知型：整体高分且关键维度大多 >=75%
  if (avg >= HIGH_RATE && countHigh >= 3) {
    return profiles[0];
  }

  // ② 道德-个体归因型：整体偏低，且不存在鲜明强维度（有强项时按对应画像判定）
  if (maxRate < 0.7 && (avg < 0.5 || (countLow >= 3 && avg < 0.62))) {
    return profiles[4];
  }

  // ③ 平衡折中型：各维度均处于中等区间，无极端值
  const allMid = rate.every((r) => r >= 0.4 && r <= 0.8);
  if (allMid) {
    return profiles[6];
  }

  // ④ 舆论敏感-身份观察型：维度4极高，其余维度中等
  if (d4 >= 0.8 && othersAvg >= 0.4 && othersAvg < 0.7) {
    return profiles[5];
  }

  // ⑤ 技术-执行型：维度5(科技监管)突出，维度3尚可，维度4/6偏弱
  if (d5 >= 0.7 && d3 >= 0.55 && d4 < 0.65 && d6 < 0.65) {
    return profiles[2];
  }

  // ⑥ 结构批判-公平敏感型：维度1/2/3偏高，维度4/6中等
  if (d1 >= 0.7 && d2 >= 0.6 && d3 >= 0.6 && d4 < 0.75 && d6 < 0.75) {
    return profiles[3];
  }

  // ⑦ 务实改良-物质优先型：维度2(劳动家庭)突出，维度3尚可，维度4/6偏低
  if (d2 >= 0.7 && d3 >= 0.55 && d4 < 0.65 && d6 < 0.65 && d1 < 0.75) {
    return profiles[1];
  }

  // 兜底：依据平均分与高分维度分布就近匹配
  if (avg >= 0.7) {
    const highDims = [1, 2, 3, 4, 5, 6].filter((i) => rate[i - 1] >= 0.7);
    if (highDims.includes(5) && highDims.includes(3)) return profiles[2];
    if (highDims.includes(2) && highDims.includes(3)) return profiles[1];
    if (highDims.includes(1)) return profiles[3];
    return profiles[0];
  }
  if (avg < 0.6) return profiles[4];
  return profiles[6];
}

module.exports = { computeResult };
