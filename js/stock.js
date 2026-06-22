/* =======================================================
   大富翁4：全球股市与神明霸战 华尔街股市核心计算模块 (Chart.js驱动 + 降级备份手绘引擎)
   ======================================================= */

class StockManager {
  constructor() {
    this.chart = null;
  }

  // 绘制带有高级渐变和发光特性的折线走势图
  renderChart(stock) {
    const canvas = document.getElementById('stockCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // 如果 Chart.js 因网络拦截加载失败，则立刻进入“无依赖纯原生 Canvas 行情渲染引擎”，确保游戏 100% 顺畅，不崩溃、不卡死！
    if (typeof Chart === 'undefined') {
      this.drawFallbackChart(ctx, canvas, stock);
      return;
    }

    // 如果已有图表实例，直接销毁，准备重绘
    if (this.chart) {
      this.chart.destroy();
    }

    // 设置走势图背景霓虹渐变色
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, stock.color + '40'); // 25%透明度
    gradient.addColorStop(1, stock.color + '00'); // 完全透明

    // 使用 Chart.js 生成高拟真行情曲线
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: stock.trend.length }, (_, i) => `第 ${i + 1} 期`),
        datasets: [{
          label: `${stock.name} (${stock.symbol})`,
          data: stock.trend,
          borderColor: stock.color,
          borderWidth: 3,
          pointBackgroundColor: stock.color,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          backgroundColor: gradient,
          tension: 0.35 // 曲线弯曲度
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => ` 市价: $${context.raw.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#64748b', font: { size: 9, family: 'sans-serif' } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: {
              color: '#64748b',
              font: { size: 9, family: 'sans-serif' },
              callback: (value) => `$${value}`
            }
          }
        }
      }
    });

    // 动态同步更新交易控制台标题
    document.getElementById('chart-title').textContent = `${stock.name} (${stock.symbol}) 历史量化波动图`;
  }

  // 防御性退避机制：在无 Chart.js 依赖下，在 Canvas 上手绘出等价的极美折线图
  drawFallbackChart(ctx, canvas, stock) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const prices = stock.trend;
    if (prices.length === 0) return;

    const maxPrice = Math.max(...prices) * 1.05;
    const minPrice = Math.min(...prices) * 0.95;
    const range = maxPrice - minPrice;

    // 绘制背景线条
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    const gridRows = 4;
    for (let i = 0; i <= gridRows; i++) {
      const y = 20 + ((height - 40) / gridRows) * i;
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "9px sans-serif";
      const priceLabel = (maxPrice - (range / gridRows) * i).toFixed(1);
      ctx.fillText(`$${priceLabel}`, 2, y + 3);
    }

    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 20;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // 绘制趋势线
    ctx.beginPath();
    ctx.strokeStyle = stock.color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";

    prices.forEach((price, idx) => {
      const x = paddingLeft + (chartWidth / (prices.length - 1)) * idx;
      const y = paddingTop + chartHeight - ((price - minPrice) / range) * chartHeight;
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // 填充底色渐变
    ctx.lineTo(paddingLeft + chartWidth, paddingTop + chartHeight);
    ctx.lineTo(paddingLeft, paddingTop + chartHeight);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
    gradient.addColorStop(0, stock.color + "22");
    gradient.addColorStop(1, stock.color + "00");
    ctx.fillStyle = gradient;
    ctx.fill();

    // 画小圆点
    prices.forEach((price, idx) => {
      const x = paddingLeft + (chartWidth / (prices.length - 1)) * idx;
      const y = paddingTop + chartHeight - ((price - minPrice) / range) * chartHeight;
      
      ctx.beginPath();
      ctx.fillStyle = stock.color;
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (idx === prices.length - 1) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText(`$${price}`, x - 25, y - 8);
      }
    });

    document.getElementById('chart-title').textContent = `${stock.name} (${stock.symbol}) 历史量化波动图 (备用手绘引擎)`;
  }
}

window.stockEngine = new StockManager();
