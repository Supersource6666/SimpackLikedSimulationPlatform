<template>
  <div class="train-marshalling-container">
    <div class="marshalling-header">
      <h1>列车编组展示</h1>
      <div class="marshalling-controls">
        <button @click="startAnimation" :disabled="isAnimating">开始运行</button>
        <button @click="stopAnimation" :disabled="!isAnimating">停止运行</button>
        <button @click="resetPosition">重置位置</button>
        <button @click="goToParams">参数设置</button>
      </div>
    </div>
    <div class="marshalling-main">
      <div ref="canvasContainer" class="canvas-container"></div>
      <div class="marshalling-info">
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { trackStore } from '../store/trackStore'

// 导入模块化工具函数
import { initThreeScene, addLights, createGround, addGridHelper, onWindowResize, followTrain, renderScene, updateControls, cleanupScene } from '../utils/sceneManager'
import { createTrack, updateRailSegments, getTrackState } from '../utils/trackManager'
import { createTrain, updateTrainPosition, getTrains, setTrackInfo } from '../utils/trainManager'
import { initMinimap, updateMinimap, setTrackPath } from '../utils/minimapManager'

const canvasContainer = ref(null)
const router = useRouter()

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

// 跳转到参数设置界面
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
  // 初始化Three.js场景
  sceneInfo = initThreeScene(canvasContainer.value)
  
  // 创建轨道
  const { trackPath: newTrackPath, trackLength: newTrackLength } = createTrack(sceneInfo.scene)
  trackPath = newTrackPath
  trackLength = newTrackLength
  
  // 设置轨道信息
  setTrackInfo(trackPath, trackLength)
  setTrackPath(trackPath)
  
  // 创建列车
  createTrain(sceneInfo.scene, trackPath, trackLength)
  
  // 添加光源
  addLights()
  
  // 创建地面
  createGround()
  
  // 添加网格辅助线
  addGridHelper()
  
  // 初始化小地图
  const minimapCanvas = document.getElementById('minimapCanvas')
  if (minimapCanvas) {
    initMinimap(minimapCanvas)
  } else {
    console.error('找不到小地图Canvas元素')
  }
  
  // 开始动画循环
  animate()
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

// 开始动画
function startAnimation() {
  isAnimating.value = true
}

// 停止动画
function stopAnimation() {
  isAnimating.value = false
}

// 组件卸载时清理
onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
  
  cleanupScene()
})
</script>

<style scoped>
.train-marshalling-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.marshalling-header {
  background-color: #333;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.marshalling-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.marshalling-controls {
  display: flex;
  gap: 1rem;
}

.marshalling-controls button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.marshalling-controls button:hover:not(:disabled) {
  background-color: #45a049;
}

.marshalling-controls button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.marshalling-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  background-color: #000;
  position: relative;
}

.marshalling-info {
  width: 280px;
  background-color: white;
  padding: 0.5rem;
  box-shadow: -2px 0 4px rgba(0,0,0,0.1);
  overflow-y: auto;
  margin-right: 5px;
  margin-left: 5px;
}

.info-panel {
  margin-bottom: 2rem;
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
  width: 280px;
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







