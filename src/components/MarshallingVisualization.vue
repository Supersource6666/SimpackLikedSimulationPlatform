<template>
  <div class="train-marshalling-container">
    <div class="viewer-container">
      <div ref="canvasContainer" class="canvas-container"></div>
      <div class="controls-container">
        <el-button @click="toggleAnimation">{{ isAnimating ? '停止运行' : '开始运行' }}</el-button>
        <el-button @click="resetPosition">重置位置</el-button>
      </div>
    </div>
    <div class="side-panel">
      <div class="marshalling-controls">
        <div class="acceleration-dropdowns">
          <button class="speed-button" @click="toggleSpeedChart">速度</button>
          <select class="acceleration-select" @change="handleAccelerationChange">
            <option value="">请选择加速度类型</option>
            <option value="axle-box">轴箱加速度</option>
            <option value="frame">构架加速度</option>
          </select>
        </div>
      </div>
      <div class="info-panel">
        <h3>运行状态</h3>
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
      <!-- 添加二维小地图 -->
      <div class="minimap-container">
        <h3>列车轨迹小地图</h3>
        <canvas id="minimapCanvas" width="300" height="300"></canvas>
      </div>
      
      <!-- 速度-里程标曲线图表容器 -->
      <div v-if="showSpeedChart" class="speed-chart-container">
        <h3 class="chart-title">速度-里程标曲线</h3>
        <div 
          ref="speedChartRef" 
          class="chart"
        ></div>
      </div>
      
      <!-- 加速度-里程标曲线图表容器 -->
      <div v-if="showAccelerationChart" class="acceleration-chart-container">
        <h3 class="chart-title">{{ selectedAcceleration === 'axle-box' ? '轴箱加速度' : '构架加速度' }}-里程标曲线</h3>
        <div 
          ref="accelerationChartRef" 
          class="chart"
        ></div>
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
const showSpeedChart = ref(false)
const speedChartRef = ref(null)
let speedChart = null
let speedWs = null
let speedData = { mileages: [], values: [] }

// 加速度图表相关
const showAccelerationChart = ref(false)
const accelerationChartRef = ref(null)
const selectedAcceleration = ref('')
let accelerationChart = null
let accelerationWs = null
let accelerationData = { mileages: [], values: [] }

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

// 初始化加速度-里程标曲线
const initAccelerationChart = () => {
  if (!accelerationChartRef.value || !selectedAcceleration.value) return;
  
  accelerationChart = echarts.init(accelerationChartRef.value);
  
  // 初始化图表配置
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const accelerationType = selectedAcceleration.value === 'axle-box' ? '轴箱加速度' : '构架加速度';
        return `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>${accelerationType}: ${params[0].data.toFixed(2)} m/s²`;
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
      name: selectedAcceleration.value === 'axle-box' ? '轴箱加速度 (m/s²)' : '构架加速度 (m/s²)',
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
        name: selectedAcceleration.value === 'axle-box' ? '轴箱加速度' : '构架加速度',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: selectedAcceleration.value === 'axle-box' ? '#E6A23C' : '#67C23A',
          width: 2
        },
        itemStyle: {
          color: selectedAcceleration.value === 'axle-box' ? '#E6A23C' : '#67C23A'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: selectedAcceleration.value === 'axle-box' ? 'rgba(230, 162, 60, 0.5)' : 'rgba(103, 194, 58, 0.5)' },
            { offset: 1, color: selectedAcceleration.value === 'axle-box' ? 'rgba(230, 162, 60, 0.1)' : 'rgba(103, 194, 58, 0.1)' }
          ])
        }
      }
    ]
  };
  
  accelerationChart.setOption(option);
  
  // 建立WebSocket连接
  const connectFunction = selectedAcceleration.value === 'axle-box' ? webSocketAPI.connectAxialAcceleration : webSocketAPI.connectFrameAcceleration;
  
  accelerationWs = connectFunction(
    (message) => {
      if (message.type === 'historical_data') {
        // 处理历史数据
        accelerationData.mileages = message.data.map(item => item.mileage);
        accelerationData.values = message.data.map(item => item.value);
        accelerationChart.setOption({
          xAxis: {
            data: accelerationData.mileages
          },
          series: [
            {
              data: accelerationData.values
            }
          ]
        });
      } else if (message.type === 'realtime_data') {
        // 处理实时数据
        accelerationData.mileages.push(message.data.mileage);
        accelerationData.values.push(message.data.value);
        
        // 保持数据点在1000km范围内
        if (accelerationData.mileages.length > 0 && accelerationData.mileages[accelerationData.mileages.length - 1] - accelerationData.mileages[0] > 1000000) {
          accelerationData.mileages.shift();
          accelerationData.values.shift();
        }
        
        // 更新图表
        accelerationChart.setOption({
          xAxis: {
            data: accelerationData.mileages
          },
          series: [
            {
              data: accelerationData.values
            }
          ]
        });
      }
    },
    (error) => {
      console.error('加速度WebSocket错误:', error);
      // 使用模拟数据
      const mockData = generateMockData(100, selectedAcceleration.value === 'axle-box' ? 3 : 5, selectedAcceleration.value === 'axle-box' ? -3 : -5);
      accelerationData.mileages = mockData.map(item => item.mileage);
      accelerationData.values = mockData.map(item => item.value);
      accelerationChart.setOption({
        xAxis: {
          data: accelerationData.mileages
        },
        series: [
          {
            data: accelerationData.values
          }
        ]
      });
    },
    () => {
      console.log('加速度WebSocket连接关闭');
    }
  );
};

// 销毁加速度图表
const destroyAccelerationChart = () => {
  if (accelerationChart) {
    accelerationChart.dispose();
    accelerationChart = null;
  }
  
  if (accelerationWs && accelerationWs.readyState === WebSocket.OPEN) {
    accelerationWs.close();
    accelerationWs = null;
  }
  
  accelerationData = { mileages: [], values: [] };
  selectedAcceleration.value = '';
};

// 处理加速度类型选择
const handleAccelerationChange = (event) => {
  const value = event.target.value;
  
  if (value) {
    // 选择了加速度类型，隐藏速度图表，显示加速度图表
    showSpeedChart.value = false;
    destroySpeedChart();
    
    selectedAcceleration.value = value;
    showAccelerationChart.value = true;
    
    // 延迟初始化图表，确保DOM已经渲染
    setTimeout(() => {
      initAccelerationChart();
    }, 100);
  } else {
    // 取消选择，隐藏加速度图表
    showAccelerationChart.value = false;
    destroyAccelerationChart();
  }
};

// 切换速度图表显示/隐藏
const toggleSpeedChart = () => {
  showSpeedChart.value = !showSpeedChart.value;
  
  if (showSpeedChart.value) {
    // 显示速度图表，隐藏加速度图表
    showAccelerationChart.value = false;
    destroyAccelerationChart();
    
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
  accelerationChart?.resize();
};

// 跳转到动力学参数界面
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
  
  // 销毁加速度图表
  destroyAccelerationChart()
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


.controls-container {
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #ddd;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}


.side-panel {
  width: 300px;
  background-color: #fff;
  border-left: 1px solid #ddd;
  padding: 20px;
  overflow-y: auto;
}

/* 加速度下拉框样式 */
.acceleration-dropdowns {
  display: flex;
  gap: 1rem;
  margin-bottom: 20px;
  align-items: center;
}

.acceleration-select {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #0075ff;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
  width: 120px; /* 设置固定宽度 */
}

.acceleration-select:hover {
  background-color: #0066e6;
}

.acceleration-select option {
  background-color: white;
  color: #333;
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
  width: 120px; /* 设置与下拉框相同的宽度 */
}

.speed-button:hover {
  background-color: #0066e6 !important;
}

/* 速度-里程标曲线图表容器样式 */
.speed-chart-container {
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 加速度-里程标曲线图表容器样式 */
.acceleration-chart-container {
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
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

.info-panel {
  margin-bottom: 20px;
}

.info-panel h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.2rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.info-item .label {
  color: #666;
  font-size: 0.9rem;
}

.info-item .value {
  font-weight: bold;
  color: #333;
}

.speed-slider {
  flex: 1;
  margin: 0 0.5rem;
}

.minimap-container {
  margin-bottom: 20px;
  width: 100%;
  height: 330px;
  background-color: white;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-radius: 4px;
}

.minimap-container h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.1rem;
  text-align: center;
}

#minimapCanvas {
  display: block;
  margin: 0 auto;
  border: 1px solid #ddd;
  background-color: #f0f0f0;
}
</style>







