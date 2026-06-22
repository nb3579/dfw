/* =======================================================
   大富翁4：全球股市与神明霸战 华尔街股市核心计算模块 (Chart.js驱动)
   ======================================================= */

class StockManager {
  constructor() {
    this.chart = null;
  }

  // 绘制带有高级渐变和发光特性的折线走势图
  renderChart(stock) {
    const ctx = document.getElementById('stockCanvas').getContext('2d');
    
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
        labels: Array.from({ length: stock.trend.length }, (_, i) => `T-${10 - i}`),
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
            ticks: { color: '#64748b', font: { size: 9 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: {
              color: '#64748b',
              font: { size: 9 },
              callback: (value) => `$${value}`
            }
          }
        }
      }
    });

    // 动态同步更新交易控制台标题
    document.getElementById('chart-title').textContent = `${stock.name} (${stock.symbol}) 历史量化波动图`;
  }
}

window.stockEngine = new StockManager();
