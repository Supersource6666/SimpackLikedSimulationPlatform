<template>
  <div class="data-analysis-container">
    <h2 class="page-title">数据分析</h2>
    
    <!-- 图表容器 -->
    <div class="chart-container">
      <div class="chart-item">
        <h3 class="chart-title">速度-里程标曲线</h3>
        <div 
          ref="speedChartRef" 
          class="chart"
        ></div>
      </div>
      
      <div class="chart-item">
        <h3 class="chart-title">构架加速度-里程标曲线</h3>
        <div 
          ref="frameAccelerationChartRef" 
          class="chart"
        ></div>
      </div>
      
      <div class="chart-item">
        <h3 class="chart-title">轴箱加速度-里程标曲线</h3>
        <div 
          ref="axialAccelerationChartRef" 
          class="chart"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { dataAnalysisAPI, webSocketAPI } from '../utils/api';

// 图表引用
const speedChartRef = ref(null);
const frameAccelerationChartRef = ref(null);
const axialAccelerationChartRef = ref(null);

// 图表实例
let speedChart = null;
let frameAccelerationChart = null;
let axialAccelerationChart = null;

// WebSocket连接
let speedWs = null;
let frameAccelerationWs = null;
let axialAccelerationWs = null;

// 图表数据存储
let speedData = { mileages: [], values: [] };
let frameAccelerationData = { mileages: [], values: [] };
let axialAccelerationData = { mileages: [], values: [] };

// 生成模拟数据（API请求失败时使用）
const generateMockData = (points = 100, maxValue = 100, minValue = 0) => {
  const data = [];
  for (let i = 0; i < points; i++) {
    data.push({
      mileage: i, // 使用里程标而不是时间
      value: minValue + Math.random() * (maxValue - minValue)
    });
  }
  return data;
};

// 初始化速度-里程标曲线
const initSpeedChart = () => {
  if (!speedChartRef.value) return;
  
  speedChart = echarts.init(speedChartRef.value);
  
  // 初始化图表配置
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        return `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>速度: ${params[0].data} km/h`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
      name: '里程标 (km)',
      axisLine: {
        lineStyle: {
          color: '#333'
        }
      },
      axisLabel: {
        formatter: '{value}km'
      }
    },
    yAxis: {
      type: 'value',
      name: '速度 (km/h)',
      axisLine: {
        lineStyle: {
          color: '#333'
        }
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#eee'
        }
      }
    },
    series: [
      {
        name: '速度',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#409EFF',
          width: 2
        },
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.5)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
          ])
        }
      }
    ]
  };
  
  speedChart.setOption(option);
  
  // 建立WebSocket连接
  speedWs = webSocketAPI.connectSpeed(
    (message) => {
      if (message.type === 'historical_data') {
        // 处理历史数据
        speedData.mileages = message.data.map(item => item.mileage);
        speedData.values = message.data.map(item => item.value);
        speedChart.setOption({
          xAxis: {
            data: speedData.mileages
          },
          series: [
            {
              data: speedData.values
            }
          ]
        });
      } else if (message.type === 'realtime_data') {
        // 处理实时数据
        speedData.mileages.push(message.data.mileage);
        speedData.values.push(message.data.value);
        
        // 保持数据点在1000km范围内
        if (speedData.mileages.length > 0 && speedData.mileages[speedData.mileages.length - 1] - speedData.mileages[0] > 1000000) {
          speedData.mileages.shift();
          speedData.values.shift();
        }
        
        // 更新图表
        speedChart.setOption({
          xAxis: {
            data: speedData.mileages
          },
          series: [
            {
              data: speedData.values
            }
          ]
        });
      }
    },
    (error) => {
      console.error('速度WebSocket错误:', error);
      // 使用模拟数据
      const mockData = generateMockData(100, 300, 0);
      speedData.mileages = mockData.map(item => item.mileage);
      speedData.values = mockData.map(item => item.value);
      speedChart.setOption({
        xAxis: {
          data: speedData.mileages
        },
        series: [
          {
            data: speedData.values
          }
        ]
      });
    },
    () => {
      console.log('速度WebSocket连接关闭');
    }
  );
};

// 初始化构架加速度-里程标曲线
const initFrameAccelerationChart = () => {
  if (!frameAccelerationChartRef.value) return;
  
  frameAccelerationChart = echarts.init(frameAccelerationChartRef.value);
  
  // 初始化图表配置
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        return `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>构架加速度: ${params[0].data.toFixed(2)} m/s²`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
      name: '里程标 (km)',
      axisLine: {
        lineStyle: {
          color: '#333'
        }
      },
      axisLabel: {
        formatter: '{value}km'
      }
    },
    yAxis: {
      type: 'value',
      name: '构架加速度 (m/s²)',
      axisLine: {
        lineStyle: {
          color: '#333'
        }
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#eee'
        }
      }
    },
    series: [
      {
        name: '构架加速度',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#67C23A',
          width: 2
        },
        itemStyle: {
          color: '#67C23A'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.5)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0.1)' }
          ])
        }
      }
    ]
  };
  
  frameAccelerationChart.setOption(option);
  
  // 建立WebSocket连接
  frameAccelerationWs = webSocketAPI.connectFrameAcceleration(
    (message) => {
      if (message.type === 'historical_data') {
        // 处理历史数据
        frameAccelerationData.mileages = message.data.map(item => item.mileage);
        frameAccelerationData.values = message.data.map(item => item.value);
        frameAccelerationChart.setOption({
          xAxis: {
            data: frameAccelerationData.mileages
          },
          series: [
            {
              data: frameAccelerationData.values
            }
          ]
        });
      } else if (message.type === 'realtime_data') {
        // 处理实时数据
        frameAccelerationData.mileages.push(message.data.mileage);
        frameAccelerationData.values.push(message.data.value);
        
        // 保持数据点在1000km范围内
        if (frameAccelerationData.mileages.length > 0 && frameAccelerationData.mileages[frameAccelerationData.mileages.length - 1] - frameAccelerationData.mileages[0] > 1000000) {
          frameAccelerationData.mileages.shift();
          frameAccelerationData.values.shift();
        }
        
        // 更新图表
        frameAccelerationChart.setOption({
          xAxis: {
            data: frameAccelerationData.mileages
          },
          series: [
            {
              data: frameAccelerationData.values
            }
          ]
        });
      }
    },
    (error) => {
      console.error('构架加速度WebSocket错误:', error);
      // 使用模拟数据
      const mockData = generateMockData(100, 5, -5);
      frameAccelerationData.mileages = mockData.map(item => item.mileage);
      frameAccelerationData.values = mockData.map(item => item.value);
      frameAccelerationChart.setOption({
        xAxis: {
          data: frameAccelerationData.mileages
        },
        series: [
          {
            data: frameAccelerationData.values
          }
        ]
      });
    },
    () => {
      console.log('构架加速度WebSocket连接关闭');
    }
  );
};

// 初始化轴箱加速度-里程标曲线
const initAxialAccelerationChart = () => {
  if (!axialAccelerationChartRef.value) return;
  
  axialAccelerationChart = echarts.init(axialAccelerationChartRef.value);
  
  // 初始化图表配置
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        return `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>轴箱加速度: ${params[0].data.toFixed(2)} m/s²`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
      name: '里程标 (km)',
      axisLine: {
        lineStyle: {
          color: '#333'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '轴箱加速度 (m/s²)',
      axisLine: {
        lineStyle: {
          color: '#333'
        }
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#eee'
        }
      }
    },
    series: [
      {
        name: '轴箱加速度',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#E6A23C',
          width: 2
        },
        itemStyle: {
          color: '#E6A23C'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(230, 162, 60, 0.5)' },
            { offset: 1, color: 'rgba(230, 162, 60, 0.1)' }
          ])
        }
      }
    ]
  };
  
  axialAccelerationChart.setOption(option);
  
  // 建立WebSocket连接
  axialAccelerationWs = webSocketAPI.connectAxialAcceleration(
    (message) => {
      if (message.type === 'historical_data') {
        // 处理历史数据
        axialAccelerationData.mileages = message.data.map(item => item.mileage);
        axialAccelerationData.values = message.data.map(item => item.value);
        axialAccelerationChart.setOption({
          xAxis: {
            data: axialAccelerationData.mileages
          },
          series: [
            {
              data: axialAccelerationData.values
            }
          ]
        });
      } else if (message.type === 'realtime_data') {
        // 处理实时数据
        axialAccelerationData.mileages.push(message.data.mileage);
        axialAccelerationData.values.push(message.data.value);
        
        // 保持数据点在1000km范围内
        if (axialAccelerationData.mileages.length > 0 && axialAccelerationData.mileages[axialAccelerationData.mileages.length - 1] - axialAccelerationData.mileages[0] > 1000000) {
          axialAccelerationData.mileages.shift();
          axialAccelerationData.values.shift();
        }
        
        // 更新图表
        axialAccelerationChart.setOption({
          xAxis: {
            data: axialAccelerationData.mileages
          },
          series: [
            {
              data: axialAccelerationData.values
            }
          ]
        });
      }
    },
    (error) => {
      console.error('轴箱加速度WebSocket错误:', error);
      // 使用模拟数据
      const mockData = generateMockData(100, 3, -3);
      axialAccelerationData.mileages = mockData.map(item => item.mileage);
      axialAccelerationData.values = mockData.map(item => item.value);
      axialAccelerationChart.setOption({
        xAxis: {
          data: axialAccelerationData.mileages
        },
        series: [
          {
            data: axialAccelerationData.values
          }
        ]
      });
    },
    () => {
      console.log('轴箱加速度WebSocket连接关闭');
    }
  );
};

// 响应窗口大小变化
const handleResize = () => {
  speedChart?.resize();
  frameAccelerationChart?.resize();
  axialAccelerationChart?.resize();
};

// 组件挂载时初始化图表
onMounted(() => {
  initSpeedChart();
  initFrameAccelerationChart();
  initAxialAccelerationChart();
  
  window.addEventListener('resize', handleResize);
});

// 组件卸载时销毁图表
onUnmounted(() => {
  // 关闭WebSocket连接
  if (speedWs && speedWs.readyState === WebSocket.OPEN) {
    speedWs.close();
  }
  if (frameAccelerationWs && frameAccelerationWs.readyState === WebSocket.OPEN) {
    frameAccelerationWs.close();
  }
  if (axialAccelerationWs && axialAccelerationWs.readyState === WebSocket.OPEN) {
    axialAccelerationWs.close();
  }
  
  speedChart?.dispose();
  frameAccelerationChart?.dispose();
  axialAccelerationChart?.dispose();
  
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.data-analysis-container {
  width: 100%;
  height: 100%;
  padding: 1.5rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #409EFF;
}

.chart-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.chart-item {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 1rem;
}

.chart-title {
  font-size: 1.2rem;
  font-weight: 500;
  color: #606266;
  margin-bottom: 0.8rem;
  text-align: center;
}

.chart {
  width: 100%;
  height: 300px;
}

@media (max-width: 768px) {
  .chart-container {
    grid-template-columns: 1fr;
  }
}
</style>