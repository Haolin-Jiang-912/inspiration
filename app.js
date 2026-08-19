// app.js
App({
  globalData: {
    // 答题结果由 result 页从本地缓存读取，此处预留全局态
    result: null
  },

  onLaunch() {
    // 初始化时不做额外处理；答题进度自动保存在本地缓存中
  }
});
