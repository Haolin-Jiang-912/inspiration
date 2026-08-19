// pages/result/result.js
const { computeResult } = require('../../utils/scoring.js');

Page({
  data: {
    result: null,
    profile: null,
    dims: [],
    totalPercent: 0,
    totalScore: 0,
    totalMax: 0,
    profileColor: '#0A84FF',
    cardImgPath: ''
  },

  onLoad() {
    const answers = wx.getStorageSync('quiz_answers') || {};

    // 无答题记录时引导回首页
    if (!answers || Object.keys(answers).length === 0) {
      wx.showToast({ title: '请先完成答题', icon: 'none' });
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' });
      }, 900);
      return;
    }

    const result = computeResult(answers);
    const profile = result.profile || {};
    this.setData({
      result,
      profile,
      dims: result.dims,
      totalPercent: result.totalPercent,
      totalScore: result.totalScore,
      totalMax: result.totalMax,
      profileColor: profile.color || '#0A84FF'
    });
  },

  onReady() {
    // 页面渲染完成后绘制雷达图
    this.drawRadar();
  },

  // 绘制六维度雷达图
  drawRadar() {
    const dims = this.data.dims;
    if (!dims || dims.length !== 6) return;

    const ctx = wx.createCanvasContext('radarCanvas', this);
    const cx = 150;
    const cy = 150;
    const r = 100;
    const n = 6;
    const startAngle = -Math.PI / 2;
    const step = (Math.PI * 2) / n;

    // 背景网格（4 圈）
    for (let g = 1; g <= 4; g++) {
      const gr = (r * g) / 4;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = startAngle + i * step;
        const x = cx + gr * Math.cos(a);
        const y = cy + gr * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.setStrokeStyle(g === 4 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)');
      ctx.setLineWidth(g === 4 ? 1.5 : 1);
      ctx.stroke();
    }

    // 轴线
    for (let i = 0; i < n; i++) {
      const a = startAngle + i * step;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      ctx.setStrokeStyle('rgba(255,255,255,0.06)');
      ctx.setLineWidth(1);
      ctx.stroke();
    }

    // 中心到 75% 的参考圈（高分层级）
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = startAngle + i * step;
      const x = cx + r * 0.75 * Math.cos(a);
      const y = cy + r * 0.75 * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.setStrokeStyle('rgba(255,255,255,0.1)');
    ctx.setLineWidth(1);
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    // 数据多边形
    ctx.beginPath();
    dims.forEach((d, i) => {
      const a = startAngle + i * step;
      const rr = r * Math.max(0, Math.min(1, d.rate));
      const x = cx + rr * Math.cos(a);
      const y = cy + rr * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.setFillStyle('rgba(255,255,255,0.06)');
    ctx.setStrokeStyle('#0A84FF');
    ctx.setLineWidth(2);
    ctx.fill();
    ctx.stroke();

    // 顶点圆点
    dims.forEach((d, i) => {
      const a = startAngle + i * step;
      const rr = r * Math.max(0, Math.min(1, d.rate));
      const x = cx + rr * Math.cos(a);
      const y = cy + rr * Math.sin(a);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.setFillStyle('#0A84FF');
      ctx.fill();
    });

    // 维度标签
    ctx.setFontSize(12);
    ctx.setFillStyle('#8E8E93');
    ctx.setTextAlign('center');
    ctx.setTextBaseline('middle');
    dims.forEach((d, i) => {
      const a = startAngle + i * step;
      const lx = cx + (r + 22) * Math.cos(a);
      const ly = cy + (r + 22) * Math.sin(a);
      // 顶部/底部标签微调
      let tx = lx;
      let ty = ly;
      if (i === 0) { tx = cx; ty = cy - r - 16; }
      if (i === 3) { tx = cx; ty = cy + r + 26; }
      ctx.fillText(d.shortName, tx, ty);
    });

    // 中心百分比
    ctx.setFontSize(30);
    ctx.setFillStyle('#FFFFFF');
    ctx.setTextAlign('center');
    ctx.setTextBaseline('middle');
    ctx.fillText(this.data.totalPercent + '%', cx, cy - 8);
    ctx.setFontSize(12);
    ctx.setFillStyle('#6C6C70');
    ctx.fillText('综合得分率', cx, cy + 22);

    ctx.draw();
  },

  // 重新测试
  onRestart() {
    wx.showModal({
      title: '重新测试',
      content: '将清空当前答题记录，确定重新开始吗？',
      confirmColor: '#0A84FF',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('quiz_answers');
          wx.reLaunch({ url: '/pages/index/index' });
        }
      }
    });
  },

  // 返回首页
  onHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  // 生成分享卡片
  onGenerateCard() {
    wx.showLoading({ title: '生成卡片中...', mask: true });

    const ctx = wx.createCanvasContext('cardCanvas', this);
    const W = 600;
    const H = 1240;
    const profile = this.data.profile;
    const dims = this.data.dims;
    const color = this.data.profileColor || '#0A84FF';
    const totalPercent = this.data.totalPercent;

    // --- 深色背景 ---
    ctx.setFillStyle('#0A0A0C');
    ctx.fillRect(0, 0, W, H);

    // --- 顶部色块 ---
    ctx.setFillStyle(color);
    ctx.fillRect(0, 0, W, 340);

    // --- 金句 ---
    ctx.setFillStyle('rgba(255,255,255,0.7)');
    ctx.setFontSize(15);
    ctx.setTextAlign('center');
    ctx.fillText('「你的语言，就是你世界的边界」', W / 2, 50);

    // --- 画像名称 ---
    ctx.setFillStyle('#FFFFFF');
    ctx.setFontSize(30);
    ctx.fillText(profile.name, W / 2, 100);

    // --- 标签 ---
    ctx.setFillStyle('rgba(255,255,255,0.65)');
    ctx.setFontSize(15);
    ctx.fillText(profile.tag, W / 2, 130);

    // --- 总分百分比 ---
    ctx.setFillStyle('#FFFFFF');
    ctx.setFontSize(68);
    ctx.fillText(totalPercent + '%', W / 2, 205);
    ctx.setFontSize(13);
    ctx.setFillStyle('rgba(255,255,255,0.55)');
    ctx.fillText('综合得分率', W / 2, 232);

    // --- 代表人物 ---
    if (profile.figure) {
      ctx.setFillStyle('rgba(255,255,255,0.9)');
      ctx.setFontSize(17);
      ctx.fillText(profile.figure.name + ' · ' + profile.figure.title, W / 2, 278);
    }

    // --- 分割线 ---
    ctx.setStrokeStyle('rgba(255,255,255,0.15)');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(40, 310);
    ctx.lineTo(W - 40, 310);
    ctx.stroke();

    // --- 六维度得分 ---
    ctx.setFillStyle('#FFFFFF');
    ctx.setFontSize(18);
    ctx.setTextAlign('left');
    ctx.fillText('六维度得分', 40, 375);

    const barX = 40;
    const barW = W - 80;
    const barH = 16;
    const stepY = 46;

    dims.forEach((d, i) => {
      const y = 400 + i * stepY;

      // 维度名
      ctx.setFillStyle('#D1D1D6');
      ctx.setFontSize(13);
      ctx.setTextAlign('left');
      ctx.fillText(d.icon + ' ' + d.shortName, barX, y);

      // 百分比
      ctx.setTextAlign('right');
      ctx.setFillStyle('#8E8E93');
      ctx.setFontSize(13);
      ctx.fillText(d.percent + '%', W - 40, y);

      // 条背景
      ctx.setFillStyle('rgba(255,255,255,0.08)');
      ctx.beginPath();
      ctx.arc(barX + 6, y + 14 + 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(barX + 6, y + 14, barW - 12, barH);
      ctx.beginPath();
      ctx.arc(barX + barW - 6, y + 14 + 3, 3, 0, Math.PI * 2);
      ctx.fill();

      // 条填充
      const fillW = Math.max(barW - 12, 1) * (d.percent / 100);
      const levelColor = d.level === 'high' ? '#0A84FF' : d.level === 'mid' ? '#FF9F0A' : '#FF453A';
      ctx.setFillStyle(levelColor);
      ctx.beginPath();
      ctx.arc(barX + 6, y + 14 + 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(barX + 6, y + 14, fillW, barH);
      if (fillW > 6) {
        ctx.beginPath();
        ctx.arc(barX + 6 + fillW, y + 14 + 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // --- 代表人物匹配分析 ---
    let contentY = 400 + dims.length * stepY + 40;
    if (profile.figure && profile.figure.match) {
      ctx.setFillStyle('#FFFFFF');
      ctx.setFontSize(16);
      ctx.setTextAlign('left');
      ctx.fillText('人物匹配', 40, contentY);

      const lines = this._wrapText(profile.figure.match, 18);

      // 左侧竖线装饰 - 用画像色
      ctx.setStrokeStyle(color);
      ctx.setGlobalAlpha(0.3);
      ctx.setLineWidth(3);
      ctx.beginPath();
      ctx.moveTo(40, contentY + 20);
      ctx.lineTo(40, contentY + 20 + lines.length * 24);
      ctx.stroke();
      ctx.setGlobalAlpha(1);

      ctx.setFontSize(13);
      ctx.setFillStyle('#AEAEB2');
      lines.forEach((line, i) => {
        ctx.fillText(line, 56, contentY + 32 + i * 24);
      });
      contentY += 32 + lines.length * 24 + 16;
    }

    // --- 推荐歌曲 · 大封面居中 ---
    if (profile.song) {
      const song = profile.song;
      const songColor = song.color || color;
      const songY = contentY + 48;

      // 分隔线
      ctx.setStrokeStyle('rgba(255,255,255,0.08)');
      ctx.setLineWidth(1);
      ctx.beginPath();
      ctx.moveTo(40, songY - 20);
      ctx.lineTo(W - 40, songY - 20);
      ctx.stroke();

      // 区域标签 - 居中
      ctx.setFillStyle('#8E8E93');
      ctx.setFontSize(14);
      ctx.setTextAlign('center');
      ctx.fillText('🎵 为你推荐', W / 2, songY);

      // 大圆形封面 - 居中
      const coverR = 60;
      const coverCx = W / 2;
      const coverCy = songY + 30 + coverR;

      ctx.setFillStyle(songColor);
      ctx.beginPath();
      ctx.arc(coverCx, coverCy, coverR, 0, Math.PI * 2);
      ctx.fill();

      // 封面内歌名首字
      ctx.setFillStyle('rgba(255,255,255,0.95)');
      ctx.setFontSize(36);
      ctx.setTextAlign('center');
      ctx.setTextBaseline('middle');
      ctx.fillText(song.name.slice(0, 1), coverCx, coverCy);
      ctx.setTextBaseline('alphabetic');

      // 歌名 - 居中大字
      const nameY = coverCy + coverR + 36;
      ctx.setFillStyle('#FFFFFF');
      ctx.setFontSize(28);
      ctx.setFontSize(28);
      ctx.setTextAlign('center');
      ctx.fillText(song.name, W / 2, nameY);

      // 歌手 - 居中小字
      ctx.setFillStyle('#8E8E93');
      ctx.setFontSize(15);
      ctx.fillText(song.artist, W / 2, nameY + 26);

      // 歌词 - 居中铺展
      ctx.setFillStyle('#AEAEB2');
      ctx.setFontSize(16);
      ctx.setTextAlign('center');
      ctx.setTextBaseline('top');
      const lyricLines = this._wrapText(song.lyric, 28);
      const lyricY = nameY + 56;
      lyricLines.forEach((line, i) => {
        ctx.fillText(line, W / 2, lyricY + i * 24);
      });
      ctx.setTextBaseline('alphabetic');

      contentY = lyricY + lyricLines.length * 24 + 20;
    }

    // --- 底部 ---
    const bottomY = contentY + 48;
    ctx.setTextAlign('center');
    ctx.setStrokeStyle('rgba(255,255,255,0.08)');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, bottomY);
    ctx.lineTo(W / 2 + 80, bottomY);
    ctx.stroke();

    ctx.setFillStyle('#8E8E93');
    ctx.setFontSize(15);
    ctx.fillText('Designed by Harry Jiang', W / 2, bottomY + 28);

    ctx.setFontSize(11);
    ctx.setFillStyle('#6C6C70');
    ctx.fillText('社会情境判断与决策倾向量表', W / 2, bottomY + 50);

    ctx.draw(false, () => {
      setTimeout(() => {
        wx.canvasToTempFilePath({
          canvasId: 'cardCanvas',
          fileType: 'png',
          quality: 1,
          success: (res) => {
            wx.hideLoading();
            this.setData({ cardImgPath: res.tempFilePath });
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '生成失败，请重试', icon: 'none' });
          }
        }, this);
      }, 300);
    });
  },

  // 文本换行辅助
  _wrapText(text, maxChars) {
    const lines = [];
    let current = '';
    for (let i = 0; i < text.length; i++) {
      current += text[i];
      if (current.length >= maxChars) {
        lines.push(current);
        current = '';
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [text];
  },

  // 保存卡片到相册
  onSaveCard() {
    if (!this.data.cardImgPath) return;
    wx.saveImageToPhotosAlbum({
      filePath: this.data.cardImgPath,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
          wx.showModal({
            title: '需要授权',
            content: '保存图片需要相册权限，请在设置中开启',
            confirmText: '去设置',
            confirmColor: '#0A84FF',
            success: (res) => {
              if (res.confirm) wx.openSetting();
            }
          });
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      }
    });
  },

  // 关闭卡片预览
  onCloseCard() {
    this.setData({ cardImgPath: '' });
  },

  onShareAppMessage() {
    const profile = this.data.profile || {};
    const opts = {
      title: '我的思维画像：' + (profile.name || ''),
      path: '/pages/index/index'
    };
    // 如果已生成卡片，用卡片图作为分享封面
    if (this.data.cardImgPath) {
      opts.imageUrl = this.data.cardImgPath;
    }
    return opts;
  }
});
