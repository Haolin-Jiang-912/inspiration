// pages/index/index.js
Page({
  data: {
    // 量表信息
    info: {
      total: 35,
      minutes: '6-10',
      dimensions: 6
    }
  },

  onLoad() {},

  onStart() {
    wx.navigateTo({
      url: '/pages/quiz/quiz'
    });
  },

  onContinue() {
    // 继续上次答题
    wx.navigateTo({
      url: '/pages/quiz/quiz'
    });
  },

  onShareAppMessage() {
    return {
      title: '社会认知与决策倾向测评 - 测测你的思维画像',
      path: '/pages/index/index'
    };
  }
});
