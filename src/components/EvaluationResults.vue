<template>
  <div class="evaluation-results-container">
    <h2 class="page-title">评估结果</h2>
    
    <!-- 图表容器 -->
    <div class="chart-container">
      <div class="chart-item">
        <h3 class="chart-title">轮重减载率-里程标曲线</h3>
        <div 
          ref="wheelLoadReductionChartRef" 
          class="chart"
        ></div>
      </div>
      
      <div class="chart-item">
        <h3 class="chart-title">脱轨系数-里程标曲线</h3>
        <div 
          ref="derailmentCoefficientChartRef" 
          class="chart"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { evaluationResultsAPI, webSocketAPI } from '../utils/api';

// 图表引用
const wheelLoadReductionChartRef = ref(null);
const derailmentCoefficientChartRef = ref(null);

// 图表实例
let wheelLoadReductionChart = null;
let derailmentCoefficientChart = null;

// WebSocket连接
let wheelLoadReductionWS = null;
let derailmentCoefficientWS = null;

// 图表数据存储
const wheelLoadReductionData = ref({
  mileages: [],
  leftReductionRates: [],
  rightReductionRates: []
});

const derailmentCoefficientData = ref({
  mileages: [],
  leftCoefficients: [],
  rightCoefficients: []
});

// 生成模拟数据（API请求失败时使用）
const generateMockData = (points = 100, maxValue = 100, minValue = 0, trend = 'random') => {
  const data = [];
  let currentValue = minValue + Math.random() * (maxValue - minValue);
  
  for (let i = 0; i < points; i++) {
    switch (trend) {
      case 'increasing':
        currentValue += Math.random() * (maxValue - minValue) / points;
        break;
      case 'decreasing':
        currentValue -= Math.random() * (maxValue - minValue) / points;
        break;
      default:
        currentValue += (Math.random() - 0.5) * (maxValue - minValue) / 20;
    }
    
    // 确保值在范围内
    currentValue = Math.max(minValue, Math.min(maxValue, currentValue));
    data.push({
      mileage: i,
      value: currentValue
    });
  }
  
  return data;
};

// 初始化轮重减载率曲线
const initWheelLoadReductionChart = () => {
  if (!wheelLoadReductionChartRef.value) return;
  
  wheelLoadReductionChart = echarts.init(wheelLoadReductionChartRef.value);
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        return `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>` +
               `左侧轮重减载率: ${params[0].data.toFixed(3)}<br/>` +
               `右侧轮重减载率: ${params[1].data.toFixed(3)}`;
      }
    },
    legend: {
      data: ['左侧轮重减载率', '右侧轮重减载率'],
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
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
      name: '轮重减载率',
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
      },
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: [
      {
        name: '左侧轮重减载率',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#F56C6C',
          width: 2
        },
        itemStyle: {
          color: '#F56C6C'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 108, 108, 0.5)' },
            { offset: 1, color: 'rgba(245, 108, 108, 0.1)' }
          ])
        }
      },
      {
        name: '右侧轮重减载率',
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
    ],
    markLine: {
      data: [
        {
          name: '安全阈值',
          yAxis: 0.6,
          lineStyle: {
            color: '#E6A23C',
            type: 'dashed'
          },
          label: {
            formatter: '安全阈值: 0.6'
          }
        }
      ]
    }
  };
  
  wheelLoadReductionChart.setOption(option);
};

// 更新轮重减载率图表数据
const updateWheelLoadReductionChart = () => {
  if (!wheelLoadReductionChart) return;
  
  wheelLoadReductionChart.setOption({
    xAxis: {
      data: wheelLoadReductionData.value.mileages
    },
    series: [
      {
        data: wheelLoadReductionData.value.leftReductionRates
      },
      {
        data: wheelLoadReductionData.value.rightReductionRates
      }
    ]
  });
};

// 处理轮重减载率WebSocket消息
const handleWheelLoadReductionMessage = (message) => {
  if (message.type === 'historical_data') {
    // 处理历史数据
    const data = message.data;
    wheelLoadReductionData.value.mileages = data.map(item => item.mileage);
    wheelLoadReductionData.value.leftReductionRates = data.map(item => item.left);
    wheelLoadReductionData.value.rightReductionRates = data.map(item => item.right);
    updateWheelLoadReductionChart();
  } else if (message.type === 'realtime_data') {
    // 处理实时数据
    const dataPoint = message.data;
    
    // 添加新数据点
    wheelLoadReductionData.value.mileages.push(dataPoint.mileage);
    wheelLoadReductionData.value.leftReductionRates.push(dataPoint.left);
    wheelLoadReductionData.value.rightReductionRates.push(dataPoint.right);
    
    // 保持数据点在1000km范围内
    if (wheelLoadReductionData.value.mileages.length > 0 && 
        wheelLoadReductionData.value.mileages[wheelLoadReductionData.value.mileages.length - 1] - 
        wheelLoadReductionData.value.mileages[0] > 1000000) {
      wheelLoadReductionData.value.mileages.shift();
      wheelLoadReductionData.value.leftReductionRates.shift();
      wheelLoadReductionData.value.rightReductionRates.shift();
    }
    
    updateWheelLoadReductionChart();
  }
};

// 初始化脱轨系数曲线
const initDerailmentCoefficientChart = () => {
  if (!derailmentCoefficientChartRef.value) return;
  
  derailmentCoefficientChart = echarts.init(derailmentCoefficientChartRef.value);
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        return `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>` +
               `左侧脱轨系数: ${params[0].data.toFixed(3)}<br/>` +
               `右侧脱轨系数: ${params[1].data.toFixed(3)}`;
      }
    },
    legend: {
      data: ['左侧脱轨系数', '右侧脱轨系数'],
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
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
      name: '脱轨系数',
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
      },
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: [
      {
        name: '左侧脱轨系数',
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
      },
      {
        name: '右侧脱轨系数',
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
    ],
    markLine: {
      data: [
        {
          name: '安全阈值',
          yAxis: 1.2,
          lineStyle: {
            color: '#F56C6C',
            type: 'dashed'
          },
          label: {
            formatter: '安全阈值: 1.2'
          }
        }
      ]
    }
  };
  
  derailmentCoefficientChart.setOption(option);
};

// 更新脱轨系数图表数据
const updateDerailmentCoefficientChart = () => {
  if (!derailmentCoefficientChart) return;
  
  derailmentCoefficientChart.setOption({
    xAxis: {
      data: derailmentCoefficientData.value.mileages
    },
    series: [
      {
        data: derailmentCoefficientData.value.leftCoefficients
      },
      {
        data: derailmentCoefficientData.value.rightCoefficients
      }
    ]
  });
};

// 处理脱轨系数WebSocket消息
const handleDerailmentCoefficientMessage = (message) => {
  if (message.type === 'historical_data') {
    // 处理历史数据
    const data = message.data;
    derailmentCoefficientData.value.mileages = data.map(item => item.mileage);
    derailmentCoefficientData.value.leftCoefficients = data.map(item => item.left);
    derailmentCoefficientData.value.rightCoefficients = data.map(item => item.right);
    updateDerailmentCoefficientChart();
  } else if (message.type === 'realtime_data') {
    // 处理实时数据
    const dataPoint = message.data;
    
    // 添加新数据点
    derailmentCoefficientData.value.mileages.push(dataPoint.mileage);
    derailmentCoefficientData.value.leftCoefficients.push(dataPoint.left);
    derailmentCoefficientData.value.rightCoefficients.push(dataPoint.right);
    
    // 保持数据点在1000km范围内
    if (derailmentCoefficientData.value.mileages.length > 0 && 
        derailmentCoefficientData.value.mileages[derailmentCoefficientData.value.mileages.length - 1] - 
        derailmentCoefficientData.value.mileages[0] > 1000000) {
      derailmentCoefficientData.value.mileages.shift();
      derailmentCoefficientData.value.leftCoefficients.shift();
      derailmentCoefficientData.value.rightCoefficients.shift();
    }
    
    updateDerailmentCoefficientChart();
  }
};

// 响应窗口大小变化
const handleResize = () => {
  wheelLoadReductionChart?.resize();
  derailmentCoefficientChart?.resize();
};

// 组件挂载时初始化图表和WebSocket连接
onMounted(() => {
  // 初始化图表
  initWheelLoadReductionChart();
  initDerailmentCoefficientChart();
  
  // 建立WebSocket连接
  wheelLoadReductionWS = webSocketAPI.connectWheelLoadReduction(
    handleWheelLoadReductionMessage,
    (error) => console.error('轮重减载率WebSocket连接错误:', error),
    () => console.log('轮重减载率WebSocket连接已关闭')
  );
  
  derailmentCoefficientWS = webSocketAPI.connectDerailmentCoefficient(
    handleDerailmentCoefficientMessage,
    (error) => console.error('脱轨系数WebSocket连接错误:', error),
    () => console.log('脱轨系数WebSocket连接已关闭')
  );
  
  window.addEventListener('resize', handleResize);
});

// 组件卸载时销毁图表和关闭WebSocket连接
onUnmounted(() => {
  // 销毁图表
  wheelLoadReductionChart?.dispose();
  derailmentCoefficientChart?.dispose();
  
  // 关闭WebSocket连接
  webSocketAPI.disconnect(wheelLoadReductionWS);
  webSocketAPI.disconnect(derailmentCoefficientWS);
  
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.evaluation-results-container {
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
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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
  height: 400px;
}

@media (max-width: 768px) {
  .chart-container {
    grid-template-columns: 1fr;
  }
  
  .chart {
    height: 300px;
  }
}
</style>