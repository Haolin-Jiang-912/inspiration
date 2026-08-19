// pages/quiz/quiz.js
const { questions } = require('../../data/questions.js');

const LETTERS = ['A', 'B', 'C', 'D'];

Page({
  data: {
    total: questions.length,
    currentIndex: 0,
    current: null,
    selectedIndex: -1,
    answers: {},      // { 题目id: 选项下标 }
    progress: 0,      // 已完成百分比（用于进度条）
    letterList: LETTERS
  },

  onLoad() {
    const saved = wx.getStorageSync('quiz_answers');
    let answers = {};
    if (saved && typeof saved === 'object') {
      answers = saved;
    }

    // 定位到第一个未作答的题目，方便继续上次答题
    let startIndex = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[questions[i].id] === undefined) {
        startIndex = i;
        break;
      }
    }

    this.setData({
      current: questions[startIndex],
      currentIndex: startIndex,
      answers,
      selectedIndex: answers[questions[startIndex].id] !== undefined ? answers[questions[startIndex].id] : -1,
      progress: Math.round((startIndex / questions.length) * 100)
    });
  },

  // 选择选项
  onSelect(e) {
    const index = e.currentTarget.dataset.index;
    const qid = this.data.current.id;
    const answers = Object.assign({}, this.data.answers);
    answers[qid] = index;
    this.setData({
      answers,
      selectedIndex: index
    });
  },

  // 上一题
  onPrev() {
    if (this.data.currentIndex === 0) return;
    const prevIndex = this.data.currentIndex - 1;
    const prev = questions[prevIndex];
    this.setData({
      currentIndex: prevIndex,
      current: prev,
      selectedIndex: this.data.answers[prev.id] !== undefined ? this.data.answers[prev.id] : -1,
      progress: Math.round((prevIndex / this.data.total) * 100)
    });
  },

  // 下一题 / 提交
  onNext() {
    const { currentIndex, total, current, answers } = this.data;

    // 当前题未作答则拦截
    if (answers[current.id] === undefined) {
      wx.showToast({ title: '请先选择一个选项', icon: 'none' });
      return;
    }

    // 最后一题：提交
    if (currentIndex === total - 1) {
      const answeredCount = Object.keys(answers).length;
      if (answeredCount < total) {
        // 有跳过的题（正常情况下不会发生），提示后直接提交已答部分
        wx.showToast({ title: '还有题目未作答，已按规则计入', icon: 'none' });
      }
      wx.setStorageSync('quiz_answers', answers);
      wx.redirectTo({
        url: '/pages/result/result'
      });
      return;
    }

    const nextIndex = currentIndex + 1;
    const next = questions[nextIndex];
    this.setData({
      currentIndex: nextIndex,
      current: next,
      selectedIndex: answers[next.id] !== undefined ? answers[next.id] : -1,
      progress: Math.round((nextIndex / total) * 100)
    });
  },

  onShareAppMessage() {
    return {
      title: '我在做社会认知测评，来测测你的思维画像',
      path: '/pages/index/index'
    };
  }
});
