<template>
  <div class="train-marshalling-container">
    <div class="viewer-container">
      <div class="controls-container">
        <el-button @click="toggleAnimation">{{ isAnimating ? '停止运行' : '开始运行' }}</el-button>
        <el-button @click="resetPosition">重置位置</el-button>

        <div class="chart-buttons">
          <button class="speed-button" :class="{ 'active': showSpeedChart }" @click="toggleSpeedChart">速度</button>
          <button class="speed-button" :class="{ 'active': showAxleBoxAccelerationChart }" @click="toggleAxleBoxAccelerationChart">轴箱加速度</button>
          <button class="speed-button" :class="{ 'active': showFrameAccelerationChart }" @click="toggleFrameAccelerationChart">构架加速度</button>
        </div>

      </div>
      <div ref="canvasContainer" class="canvas-container"></div>
      
      <!-- 固定位置的曲线图窗 -->
      <div class="chart-windows">
        <div v-if="showSpeedChart" class="chart-window">
          <h4>速度</h4>
          <div ref="speedChartRef" class="chart"></div>
        </div>
        <div v-if="showAxleBoxAccelerationChart" class="chart-window">
          <h4>轴箱加速度</h4>
          <div ref="axleBoxAccelerationChartRef" class="chart"></div>
        </div>
        <div v-if="showFrameAccelerationChart" class="chart-window">
          <h4>构架加速度</h4>
          <div ref="frameAccelerationChartRef" class="chart"></div>
        </div>
      </div>
      
      <!-- 固定位置的小地图 -->
      <div class="minimap-fixed">
        <h4>列车轨迹小地图</h4>
        <canvas id="minimapCanvas" width="300" height="300"></canvas>
      </div>
      
      <!-- 固定位置的运行状态 -->
      <div class="status-fixed">
        <h4>运行状态</h4>
        <div class="info-item">
          <span class="label">当前位置：</span>
          <span class="value">{{ currentPositionText }}</span>
        </div>
        <div class="info-item">
          <span class="label">运行速度：</span>
          <input 
            type="range" 
            v-model.number="trainSpeed" 
            min="0.1" 
            max="2" 
            step="0.1"
            class="speed-slider"
          />
          <span class="value">{{ trainSpeed.toFixed(1) }}x</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { trackStore } from '../store/trackStore'
import * as echarts from 'echarts'
import { dataAnalysisAPI, webSocketAPI } from '../utils/api'

// 导入模块化工具函数
import { initThreeScene, addLights, createGround, addGridHelper, onWindowResize, followTrain, renderScene, updateControls, cleanupScene } from '../utils/sceneManager'
import { createTrack, updateRailSegments, getTrackState } from '../utils/trackManager'
import { createTrain, updateTrainPosition, getTrains, setTrackInfo } from '../utils/trainManager'
import { initMinimap, updateMinimap, setTrackPath } from '../utils/minimapManager'

const canvasContainer = ref(null)
const router = useRouter()

// 速度图表相关
const showSpeedChart = ref(true)
const speedChartRef = ref(null)
let speedChart = null
let speedWs = null
let speedData = { mileages: [], values: [] }

// 轴箱加速度图表相关
const showAxleBoxAccelerationChart = ref(true)
const axleBoxAccelerationChartRef = ref(null)
let axleBoxAccelerationChart = null
let axleBoxAccelerationWs = null
let axleBoxAccelerationData = { 
  mileages: [], 
  values1_1: [],
  values1_2: [],
  values1_3: [],
  values2_1: [],
  values2_2: []
}

// 构架加速度图表相关
const showFrameAccelerationChart = ref(true)
const frameAccelerationChartRef = ref(null)
let frameAccelerationChart = null
let frameAccelerationWs = null
let frameAccelerationData = { 
  mileages: [], 
  values1: [],
  values2: []
}

// 状态变量
const isAnimating = ref(false)
const trainSpeed = ref(1.0)
const animationProgress = ref(0)
const animationId = ref(null)

// 轨道相关变量
let trackPath = null
let trackLength = 0

// Three.js场景信息
let sceneInfo = null

// 计算属性
const currentPositionText = computed(() => {
  const percent = Math.round(animationProgress.value * 100)
  return `${percent}%`
})

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
      top: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
      name: '里程标 (km)',
      nameTextStyle: {
        color: '#fff',
        fontSize: 10
      },
      axisLine: {
        lineStyle: {
          color: '#aaa'
        }
      },
      axisLabel: {
        formatter: '{value}km',
        color: '#fff',
        fontSize: 9
      }
    },
    yAxis: {
      type: 'value',
      name: '速度 (km/h)',
      nameTextStyle: {
        color: '#fff',
        fontSize: 10
      },
      axisLine: {
        lineStyle: {
          color: '#aaa'
        }
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'rgba(255,255,255,0.1)'
        }
      },
      axisLabel: {
        color: '#fff',
        fontSize: 9
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
          width: 1.5
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

// 销毁速度图表
const destroySpeedChart = () => {
  if (speedChart) {
    speedChart.dispose();
    speedChart = null;
  }
  
  if (speedWs && speedWs.readyState === WebSocket.OPEN) {
    speedWs.close();
    speedWs = null;
  }
  
  speedData = { mileages: [], values: [] };
};

// 初始化轴箱加速度-里程标曲线
const initAxleBoxAccelerationChart = () => {
  if (!axleBoxAccelerationChartRef.value) return;
  
  axleBoxAccelerationChart = echarts.init(axleBoxAccelerationChartRef.value);
  
  // 初始化图表配置
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${param.data.toFixed(2)} m/s²<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['1-1', '1-2', '1-3', '2-1', '2-2'],
      top: 10,
      textStyle: {
        fontSize: 10,
        color: '#fff'
      },
      selected: {
        '1-1': true,
        '1-2': false,
        '1-3': false,
        '2-1': false,
        '2-2': false
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
      name: '里程标 (km)',
      nameTextStyle: {
        color: '#fff',
        fontSize: 10
      },
      axisLine: {
        lineStyle: {
          color: '#aaa'
        }
      },
      axisLabel: {
        formatter: '{value}km',
        color: '#fff',
        fontSize: 9
      }
    },
    yAxis: {
      type: 'value',
      name: '轴箱加速度 (m/s²)',
      nameTextStyle: {
        color: '#fff',
        fontSize: 10
      },
      axisLine: {
        lineStyle: {
          color: '#aaa'
        }
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'rgba(255,255,255,0.1)'
        }
      },
      axisLabel: {
        color: '#fff',
        fontSize: 9
      }
    },
    series: [
      {
        name: '1-1',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#E6A23C',
          width: 1.5
        },
        itemStyle: {
          color: '#E6A23C'
        }
      },
      {
        name: '1-2',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#409EFF',
          width: 1.5
        },
        itemStyle: {
          color: '#409EFF'
        }
      },
      {
        name: '1-3',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#67C23A',
          width: 1.5
        },
        itemStyle: {
          color: '#67C23A'
        }
      },
      {
        name: '2-1',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#F56C6C',
          width: 1.5
        },
        itemStyle: {
          color: '#F56C6C'
        }
      },
      {
        name: '2-2',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#909399',
          width: 1.5
        },
        itemStyle: {
          color: '#909399'
        }
      }
    ]
  };
  
  axleBoxAccelerationChart.setOption(option);
  
  // 建立WebSocket连接
  axleBoxAccelerationWs = webSocketAPI.connectAxialAcceleration(
    (message) => {
      if (message.type === 'historical_data') {
        // 处理历史数据
        axleBoxAccelerationData.mileages = message.data.map(item => item.mileage);
        axleBoxAccelerationData.values1_1 = message.data.map(item => item.value1_1 || item.value || Math.random() * 6 - 3);
        axleBoxAccelerationData.values1_2 = message.data.map(item => item.value1_2 || item.value || Math.random() * 6 - 3);
        axleBoxAccelerationData.values1_3 = message.data.map(item => item.value1_3 || item.value || Math.random() * 6 - 3);
        axleBoxAccelerationData.values2_1 = message.data.map(item => item.value2_1 || item.value || Math.random() * 6 - 3);
        axleBoxAccelerationData.values2_2 = message.data.map(item => item.value2_2 || item.value || Math.random() * 6 - 3);
        axleBoxAccelerationChart.setOption({
          xAxis: {
            data: axleBoxAccelerationData.mileages
          },
          series: [
            {
              data: axleBoxAccelerationData.values1_1
            },
            {
              data: axleBoxAccelerationData.values1_2
            },
            {
              data: axleBoxAccelerationData.values1_3
            },
            {
              data: axleBoxAccelerationData.values2_1
            },
            {
              data: axleBoxAccelerationData.values2_2
            }
          ]
        });
      } else if (message.type === 'realtime_data') {
        // 处理实时数据
        axleBoxAccelerationData.mileages.push(message.data.mileage);
        axleBoxAccelerationData.values1_1.push(message.data.value1_1 || message.data.value || Math.random() * 6 - 3);
        axleBoxAccelerationData.values1_2.push(message.data.value1_2 || message.data.value || Math.random() * 6 - 3);
        axleBoxAccelerationData.values1_3.push(message.data.value1_3 || message.data.value || Math.random() * 6 - 3);
        axleBoxAccelerationData.values2_1.push(message.data.value2_1 || message.data.value || Math.random() * 6 - 3);
        axleBoxAccelerationData.values2_2.push(message.data.value2_2 || message.data.value || Math.random() * 6 - 3);
        
        // 保持数据点在1000km范围内
        if (axleBoxAccelerationData.mileages.length > 0 && axleBoxAccelerationData.mileages[axleBoxAccelerationData.mileages.length - 1] - axleBoxAccelerationData.mileages[0] > 1000000) {
          axleBoxAccelerationData.mileages.shift();
          axleBoxAccelerationData.values1_1.shift();
          axleBoxAccelerationData.values1_2.shift();
          axleBoxAccelerationData.values1_3.shift();
          axleBoxAccelerationData.values2_1.shift();
          axleBoxAccelerationData.values2_2.shift();
        }
        
        // 更新图表
        axleBoxAccelerationChart.setOption({
          xAxis: {
            data: axleBoxAccelerationData.mileages
          },
          series: [
            {
              data: axleBoxAccelerationData.values1_1
            },
            {
              data: axleBoxAccelerationData.values1_2
            },
            {
              data: axleBoxAccelerationData.values1_3
            },
            {
              data: axleBoxAccelerationData.values2_1
            },
            {
              data: axleBoxAccelerationData.values2_2
            }
          ]
        });
      }
    },
    (error) => {
      console.error('轴箱加速度WebSocket错误:', error);
      // 使用模拟数据
      const mockData = generateMockData(100, 3, -3);
      axleBoxAccelerationData.mileages = mockData.map(item => item.mileage);
      axleBoxAccelerationData.values1_1 = mockData.map(item => item.value);
      axleBoxAccelerationData.values1_2 = mockData.map(item => Math.random() * 6 - 3);
      axleBoxAccelerationData.values1_3 = mockData.map(item => Math.random() * 6 - 3);
      axleBoxAccelerationData.values2_1 = mockData.map(item => Math.random() * 6 - 3);
      axleBoxAccelerationData.values2_2 = mockData.map(item => Math.random() * 6 - 3);
      axleBoxAccelerationChart.setOption({
        xAxis: {
          data: axleBoxAccelerationData.mileages
        },
        series: [
          {
            data: axleBoxAccelerationData.values1_1
          },
          {
            data: axleBoxAccelerationData.values1_2
          },
          {
            data: axleBoxAccelerationData.values1_3
          },
          {
            data: axleBoxAccelerationData.values2_1
          },
          {
            data: axleBoxAccelerationData.values2_2
          }
        ]
      });
    },
    () => {
      console.log('轴箱加速度WebSocket连接关闭');
    }
  );
};

// 销毁轴箱加速度图表
const destroyAxleBoxAccelerationChart = () => {
  if (axleBoxAccelerationChart) {
    axleBoxAccelerationChart.dispose();
    axleBoxAccelerationChart = null;
  }
  
  if (axleBoxAccelerationWs && axleBoxAccelerationWs.readyState === WebSocket.OPEN) {
    axleBoxAccelerationWs.close();
    axleBoxAccelerationWs = null;
  }
  
  axleBoxAccelerationData = { 
    mileages: [], 
    values1_1: [],
    values1_2: [],
    values1_3: [],
    values2_1: [],
    values2_2: []
  };
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
        let result = `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${param.data.toFixed(2)} m/s²<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['1位端', '2位端'],
      top: 10,
      textStyle: {
        fontSize: 10,
        color: '#fff'
      },
      selected: {
        '1位端': true,
        '2位端': false
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
      name: '里程标 (km)',
      nameTextStyle: {
        color: '#fff',
        fontSize: 10
      },
      axisLine: {
        lineStyle: {
          color: '#aaa'
        }
      },
      axisLabel: {
        formatter: '{value}km',
        color: '#fff',
        fontSize: 9
      }
    },
    yAxis: {
      type: 'value',
      name: '构架加速度 (m/s²)',
      nameTextStyle: {
        color: '#fff',
        fontSize: 10
      },
      axisLine: {
        lineStyle: {
          color: '#aaa'
        }
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'rgba(255,255,255,0.1)'
        }
      },
      axisLabel: {
        color: '#fff',
        fontSize: 9
      }
    },
    series: [
      {
        name: '1位端',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#E6A23C',
          width: 1.5
        },
        itemStyle: {
          color: '#E6A23C'
        }
      },
      {
        name: '2位端',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#409EFF',
          width: 1.5
        },
        itemStyle: {
          color: '#409EFF'
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
        frameAccelerationData.values1 = message.data.map(item => item.value1 || item.value || Math.random() * 6 - 3);
        frameAccelerationData.values2 = message.data.map(item => item.value2 || item.value || Math.random() * 6 - 3);
        frameAccelerationChart.setOption({
          xAxis: {
            data: frameAccelerationData.mileages
          },
          series: [
            {
              data: frameAccelerationData.values1
            },
            {
              data: frameAccelerationData.values2
            }
          ]
        });
      } else if (message.type === 'realtime_data') {
        // 处理实时数据
        frameAccelerationData.mileages.push(message.data.mileage);
        frameAccelerationData.values1.push(message.data.value1 || message.data.value || Math.random() * 6 - 3);
        frameAccelerationData.values2.push(message.data.value2 || message.data.value || Math.random() * 6 - 3);
        
        // 保持数据点在1000km范围内
        if (frameAccelerationData.mileages.length > 0 && frameAccelerationData.mileages[frameAccelerationData.mileages.length - 1] - frameAccelerationData.mileages[0] > 1000000) {
          frameAccelerationData.mileages.shift();
          frameAccelerationData.values1.shift();
          frameAccelerationData.values2.shift();
        }
        
        // 更新图表
        frameAccelerationChart.setOption({
          xAxis: {
            data: frameAccelerationData.mileages
          },
          series: [
            {
              data: frameAccelerationData.values1
            },
            {
              data: frameAccelerationData.values2
            }
          ]
        });
      }
    },
    (error) => {
      console.error('构架加速度WebSocket错误:', error);
      // 使用模拟数据
      const mockData = generateMockData(100, 3, -3);
      frameAccelerationData.mileages = mockData.map(item => item.mileage);
      frameAccelerationData.values1 = mockData.map(item => item.value);
      frameAccelerationData.values2 = mockData.map(item => Math.random() * 6 - 3);
      frameAccelerationChart.setOption({
        xAxis: {
          data: frameAccelerationData.mileages
        },
        series: [
          {
            data: frameAccelerationData.values1
          },
          {
            data: frameAccelerationData.values2
          }
        ]
      });
    },
    () => {
      console.log('构架加速度WebSocket连接关闭');
    }
  );
};

// 销毁构架加速度图表
const destroyFrameAccelerationChart = () => {
  if (frameAccelerationChart) {
    frameAccelerationChart.dispose();
    frameAccelerationChart = null;
  }
  
  if (frameAccelerationWs && frameAccelerationWs.readyState === WebSocket.OPEN) {
    frameAccelerationWs.close();
    frameAccelerationWs = null;
  }
  
  frameAccelerationData = { 
    mileages: [], 
    values1: [],
    values2: []
  };
};

// 切换轴箱加速度图表显示/隐藏
const toggleAxleBoxAccelerationChart = () => {
  showAxleBoxAccelerationChart.value = !showAxleBoxAccelerationChart.value;
  
  if (showAxleBoxAccelerationChart.value) {
    // 延迟初始化图表，确保DOM已经渲染
    setTimeout(() => {
      initAxleBoxAccelerationChart();
    }, 100);
  } else {
    // 隐藏轴箱加速度图表
    destroyAxleBoxAccelerationChart();
  }
};

// 切换构架加速度图表显示/隐藏
const toggleFrameAccelerationChart = () => {
  showFrameAccelerationChart.value = !showFrameAccelerationChart.value;
  
  if (showFrameAccelerationChart.value) {
    // 延迟初始化图表，确保DOM已经渲染
    setTimeout(() => {
      initFrameAccelerationChart();
    }, 100);
  } else {
    // 隐藏构架加速度图表
    destroyFrameAccelerationChart();
  }
};

// 切换速度图表显示/隐藏
const toggleSpeedChart = () => {
  showSpeedChart.value = !showSpeedChart.value;
  
  if (showSpeedChart.value) {
    // 延迟初始化图表，确保DOM已经渲染
    setTimeout(() => {
      initSpeedChart();
    }, 100);
  } else {
    // 隐藏速度图表
    destroySpeedChart();
  }
};

// 响应窗口大小变化
const handleResize = () => {
  speedChart?.resize();
  axleBoxAccelerationChart?.resize();
  frameAccelerationChart?.resize();
};

// 跳转到车辆动力学参数界面
function goToParams() {
  stopAnimation()
  router.push('/')
}







// 重置位置
function resetPosition() {
  stopAnimation()
  animationProgress.value = 0
  updateTrainPosition(0)
}

// 组件挂载时初始化
onMounted(() => {
  console.log('开始初始化编组可视化')
  // 初始化Three.js场景
  sceneInfo = initThreeScene(canvasContainer.value)
  
  // 创建轨道
  console.log('创建轨道')
  const { trackPath: newTrackPath, trackLength: newTrackLength } = createTrack(sceneInfo.scene)
  trackPath = newTrackPath
  trackLength = newTrackLength
  
  // 设置轨道信息
  setTrackInfo(trackPath, trackLength)
  setTrackPath(trackPath)
  
  // 创建列车
  console.log('创建列车')
  createTrain(sceneInfo.scene, trackPath, trackLength)
  console.log('列车创建完成')
  
  // 添加光源
  console.log('添加光源')
  addLights()
  
  // 初始化小地图
  const minimapCanvas = document.getElementById('minimapCanvas')
  if (minimapCanvas) {
    initMinimap(minimapCanvas)
  } else {
    console.error('找不到小地图Canvas元素')
  }
  
  // 初始化图表
  setTimeout(() => {
    if (showSpeedChart.value) {
      initSpeedChart()
    }
    if (showAxleBoxAccelerationChart.value) {
      initAxleBoxAccelerationChart()
    }
    if (showFrameAccelerationChart.value) {
      initFrameAccelerationChart()
    }
  }, 100)
  
  // 开始运行循环
  console.log('开始运行循环')
  animate()
  
  // 添加窗口大小变化的事件监听
  window.addEventListener('resize', handleResize)
})

// 动画循环
function animate() {
  animationId.value = requestAnimationFrame(animate)
  
  if (isAnimating.value) {
    // 更新动画进度
    animationProgress.value += 0.001 * trainSpeed.value
    if (animationProgress.value > 1) {
      animationProgress.value = 0
    }
    
    // 更新列车位置
    updateTrainPosition(animationProgress.value)
  }
  
  // 更新轨道段（根据当前列车位置）
  updateRailSegments(animationProgress.value, true) // 更新左侧轨道
  updateRailSegments(animationProgress.value, false) // 更新右侧轨道
  
  // 更新控制器
  updateControls()
  
  // 相机跟随列车
  const trains = getTrains()
  if (trains.length > 0) {
    followTrain(trains)
  }
  
  // 渲染场景
  renderScene()
  
  // 更新小地图
  if (sceneInfo) {
    updateMinimap(sceneInfo.camera, trains)
  }
}

// 切换动画状态（开始/停止）
function toggleAnimation() {
  if (isAnimating.value) {
    stopAnimation()
  } else {
    startAnimation()
  }
}

// 开始运行
function startAnimation() {
  isAnimating.value = true
}

// 停止运行
function stopAnimation() {
  isAnimating.value = false
}

// 组件卸载时清理
onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
  
  cleanupScene()
  
  // 移除窗口大小变化的事件监听
  window.removeEventListener('resize', handleResize)
  
  // 销毁速度图表
  destroySpeedChart()
  
  // 销毁轴箱加速度图表
  destroyAxleBoxAccelerationChart()
  
  // 销毁构架加速度图表
  destroyFrameAccelerationChart()
})
</script>

<style scoped>
.train-marshalling-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.viewer-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  background-color: #000;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

/* 图表窗口样式 */
.chart-windows {
  position: absolute;
  top: 70px;
  left: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  gap: 20px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.chart-window {
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  width: 280px;
  height: 180px;
}

.chart-window h4 {
  color: #fff;
  margin: 0 0 10px 0;
  font-size: 14px;
  text-align: center;
}

.chart {
  width: 100%;
  height: calc(100% - 24px);
}


.controls-container {
  padding: 10px;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.chart-buttons {
  display: flex;
  gap: 10px;
  margin-left: auto;
}



/* 固定位置的小地图 */
.minimap-fixed {
  position: absolute;
  top: 70px;
  right: 20px;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  width: 320px;
  height: 344px;
}

.minimap-fixed h4 {
  color: #fff;
  margin: 0 0 10px 0;
  font-size: 14px;
  text-align: center;
}

.minimap-fixed canvas {
  display: block;
  margin: 0 auto;
  border: 1px solid #ddd;
  background-color: #f0f0f0;
}

/* 固定位置的运行状态 */
.status-fixed {
  position: absolute;
  top: 434px;
  right: 20px;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  width: 320px;
}

.status-fixed h4 {
  color: #fff;
  margin: 0 0 10px 0;
  font-size: 14px;
  text-align: center;
}

.status-fixed .info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.status-fixed .info-item .label {
  color: #ddd;
  font-size: 12px;
}

.status-fixed .info-item .value {
  font-weight: bold;
  color: #fff;
  font-size: 12px;
}

.status-fixed .speed-slider {
  flex: 1;
  margin: 0 10px;
}


/* 速度按钮样式 */
.speed-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #0075ff !important;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
  width: 120px;
}

.speed-button:hover {
  background-color: #0066e6 !important;
}

.speed-button.active {
  background-color: #0050b3 !important;
  box-shadow: 0 2px 4px rgba(0, 80, 179, 0.3);
  font-weight: 600;
}
</style>








