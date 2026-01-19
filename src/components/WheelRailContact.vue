<template>
  <div class="wheel-rail-contact-container">
    <div class="viewer-container">
      <div class="controls-container">
        <h3 class="section-title">轮轨力反演与分析</h3>
        <div class="buttons-and-selector">
          <el-button @click="toggleAnimation">{{ isAnimating ? '停止运行' : '开始运行' }}</el-button>
          <el-button @click="resetAnimation">重置位置</el-button>
          <div class="view-selector">
            <select v-model="currentView" class="view-select-dropdown">
              <option value="main">主视角</option>
              <option value="axle1-position1">一轴左轮</option>
              <option value="axle1-position2">一轴右轮</option>
              <option value="axle2-position1">二轴左轮</option>
              <option value="axle2-position2">二轴右轮</option>
              <option value="axle3-position1">三轴左轮</option>
              <option value="axle3-position2">三轴右轮</option>
              <option value="axle4-position1">四轴左轮</option>
              <option value="axle4-position2">四轴右轮</option>
            </select>
          </div>
          <el-button :class="{ 'active': showMarshalling }" @click="toggleMarshalling">车辆信息</el-button>
        </div>
      </div>
      <div ref="canvasContainer" class="canvas-container"></div>
      
      <!-- 固定位置的曲线图窗 -->
      <div class="chart-windows">
        <!-- 图表控制按钮 -->
        <div class="chart-controls">
          <button class="speed-button" :class="{ 'active': showWheelRailForceChart }" @click="toggleWheelRailForceChart">轮轨力</button>
          <button class="speed-button" :class="{ 'active': showWheelLoadReductionChart }" @click="toggleWheelLoadReductionChart">轮重减载率</button>
          <button class="speed-button" :class="{ 'active': showDerailmentCoefficientChart }" @click="toggleDerailmentCoefficientChart">脱轨系数</button>
          <button class="speed-button" :class="{ 'active': showSpeedChart }" @click="toggleSpeedChart">速度</button>
        </div>
        
        <!-- 图表窗口容器 -->
        <div class="chart-window-container">
          <div v-if="showWheelRailForceChart" class="chart-window draggable" 
               :style="{ left: wheelRailForcePosition.x + 'px', top: wheelRailForcePosition.y + 'px' }">
            <div class="chart-window-header draggable-header" 
                 @mousedown="startDrag($event, 'wheelRailForce')"
                 @touchstart="startDrag($event, 'wheelRailForce')">
              <h4>轮轨力</h4>
              <button class="close-button" @click="toggleWheelRailForceChart">×</button>
            </div>
            <div ref="wheelRailForceChartRef" class="chart"></div>
          </div>
          <div v-if="showWheelLoadReductionChart" class="chart-window draggable" 
               :style="{ left: wheelLoadReductionPosition.x + 'px', top: wheelLoadReductionPosition.y + 'px' }">
            <div class="chart-window-header draggable-header" 
                 @mousedown="startDrag($event, 'wheelLoadReduction')"
                 @touchstart="startDrag($event, 'wheelLoadReduction')">
              <h4>轮重减载率</h4>
              <button class="close-button" @click="toggleWheelLoadReductionChart">×</button>
            </div>
            <div ref="wheelLoadReductionChartRef" class="chart"></div>
          </div>
          <div v-if="showDerailmentCoefficientChart" class="chart-window draggable" 
               :style="{ left: derailmentCoefficientPosition.x + 'px', top: derailmentCoefficientPosition.y + 'px' }">
            <div class="chart-window-header draggable-header" 
                 @mousedown="startDrag($event, 'derailmentCoefficient')"
                 @touchstart="startDrag($event, 'derailmentCoefficient')">
              <h4>脱轨系数</h4>
              <button class="close-button" @click="toggleDerailmentCoefficientChart">×</button>
            </div>
            <div ref="derailmentCoefficientChartRef" class="chart"></div>
          </div>
          <div v-if="showSpeedChart" class="chart-window draggable" 
               :style="{ left: speedPosition.x + 'px', top: speedPosition.y + 'px' }">
            <div class="chart-window-header draggable-header" 
                 @mousedown="startDrag($event, 'speed')"
                 @touchstart="startDrag($event, 'speed')">
              <h4>速度曲线</h4>
              <button class="close-button" @click="toggleSpeedChart">×</button>
            </div>
            <div ref="speedChartRef" class="chart"></div>
          </div>
        </div>
      </div>
      
      <!-- 固定位置的小地图 -->
      <div v-if="showMinimap" class="minimap-fixed draggable" 
           :style="{ left: minimapPosition.x + 'px', top: minimapPosition.y + 'px' }">
        <div class="window-header draggable-header" 
             @mousedown="startDrag($event, 'minimap')"
             @touchstart="startDrag($event, 'minimap')">
          <h4>运行轨迹</h4>
          <button class="close-button" @click="toggleMinimap">×</button>
        </div>
        <canvas id="minimapCanvas" width="200" height="200"></canvas>
      </div>
      
      <!-- 固定位置的编组视窗 -->
      <div v-if="showMarshalling" class="marshalling-fixed">
        <div class="window-header">
          <h4>车辆信息</h4>
          <button class="close-button" @click="toggleMarshalling">×</button>
        </div>
        <div class="marshalling-status">
          <div class="status-item">时间：{{ currentTime }}</div>
          <div class="buttons-row">
            <div class="status-item">
              <button class="status-button" @click="toggleMinimap">
                运行轨迹：{{ currentMileage.toFixed(2) }}km
              </button>
            </div>
            <div class="status-item">
              <button class="status-button" @click="toggleSpeedChart">
                速度：{{ currentSpeed.toFixed(1) }}km/h
              </button>
            </div>
          </div>
        </div>      
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { trackStore } from '../store/trackStore'
import { createTrackPathFromSegments, estimatePathLength } from '../utils/trackManager'
import { initMinimap, updateMinimap, setTrackPath } from '../utils/minimapManager'
import { createTrack as createManagerTrack, updateRailSegments, getTrackState } from '../utils/trackManager'
import { createTrain, updateTrainPosition, getTrains, setTrackInfo } from '../utils/trainManager'
import * as echarts from 'echarts'
import { dataSimulator } from '../utils/dataSimulator'

const canvasContainer = ref(null)
const marshallingContainer = ref(null)
let scene, camera, renderer, controls
let trackPath, trackLength
let baseTrackPath, leftTrackPath, rightTrackPath
let leftRail, rightRail
let wheelSet, wheels, axle
let secondWheelSet, secondWheels
let thirdWheelSet, thirdWheels
let fourthWheelSet, fourthWheels
let sleepers = []
let bogie = null
let secondBogie = null
let contactArrows = [] // 存储轮轨接触点箭头



// 图表引用
const wheelLoadReductionChartRef = ref(null)
const derailmentCoefficientChartRef = ref(null)
const wheelRailForceChartRef = ref(null)
const speedChartRef = ref(null)

// 图表显示状态
const showWheelRailForceChart = ref(true)
const showWheelLoadReductionChart = ref(true)
const showDerailmentCoefficientChart = ref(true)

// Chart window positions
const wheelRailForcePosition = ref({ x: 50, y: 0 })
const wheelLoadReductionPosition = ref({ x: 350, y: 0 })
const derailmentCoefficientPosition = ref({ x: 350, y: 210 })
const speedPosition = ref({ x: 50, y: 210 })
const minimapPosition = ref({ x: 20, y: 350 })

// Drag functionality
let isDragging = false
let activeWindow = null
let dragStartX = 0
let dragStartY = 0
let windowStartX = 0
let windowStartY = 0
let containerWidth = 0
let containerHeight = 0
const windowWidth = 280 // Fixed width of chart windows
const windowHeight = 190 // Fixed height of chart windows

function startDrag(event, windowType) {
  // Check if the event target is a close button
  if (event.target.classList.contains('close-button')) {
    return // Don't start drag if clicking the close button
  }
  
  // Handle both mouse and touch events
  // For touch events, check if any touch target is a close button
  if (event.type.includes('touch') && event.touches) {
    for (let i = 0; i < event.touches.length; i++) {
      if (event.touches[i].target.classList.contains('close-button')) {
        return // Don't start drag if touching the close button
      }
    }
  }
  
  isDragging = true
  activeWindow = windowType
  
  // Handle both mouse and touch events
  const clientX = event.type.includes('touch') ? event.touches[0].clientX : event.clientX
  const clientY = event.type.includes('touch') ? event.touches[0].clientY : event.clientY
  
  dragStartX = clientX
  dragStartY = clientY
  
  // Get current position of the active window
  switch (windowType) {
    case 'wheelRailForce':
      windowStartX = wheelRailForcePosition.value.x
      windowStartY = wheelRailForcePosition.value.y
      break
    case 'wheelLoadReduction':
      windowStartX = wheelLoadReductionPosition.value.x
      windowStartY = wheelLoadReductionPosition.value.y
      break
    case 'derailmentCoefficient':
      windowStartX = derailmentCoefficientPosition.value.x
      windowStartY = derailmentCoefficientPosition.value.y
      break
    case 'speed':
      windowStartX = speedPosition.value.x
      windowStartY = speedPosition.value.y
      break
    case 'minimap':
      windowStartX = minimapPosition.value.x
      windowStartY = minimapPosition.value.y
      break
  }
  
  // Get container dimensions for boundary checking
  const container = document.querySelector('.chart-window-container')
  if (container) {
    containerWidth = container.clientWidth
    containerHeight = container.clientHeight
  } else {
    // Fallback dimensions if container not found
    containerWidth = window.innerWidth // Use full window width
    containerHeight = window.innerHeight - 100 // Account for header
  }
  
  // Add event listeners for mouse and touch
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', stopDrag)
  
  // Prevent default to avoid text selection and scrolling
  event.preventDefault()
}

function onDrag(event) {
  if (!isDragging || !activeWindow) return
  
  // Handle both mouse and touch events
  const clientX = event.type.includes('touch') ? event.touches[0].clientX : event.clientX
  const clientY = event.type.includes('touch') ? event.touches[0].clientY : event.clientY
  
  const deltaX = clientX - dragStartX
  const deltaY = clientY - dragStartY
  
  // Calculate new position with boundary restrictions
  let newX = windowStartX + deltaX
  let newY = windowStartY + deltaY
  
  // Clamp position to keep window within reasonable boundaries
  // Allow windows to move within 10px of the right edge
  newX = Math.max(0, Math.min(newX, containerWidth - 10))
  newY = Math.max(0, Math.min(newY, containerHeight - 10))
  
  // Adjust minimap boundaries to prevent it from being dragged too low
  if (activeWindow === 'minimap') {
    newY = Math.max(100, Math.min(newY, window.innerHeight - 400))
  }
  
  // Update position based on window type
  switch (activeWindow) {
    case 'wheelRailForce':
      wheelRailForcePosition.value.x = newX
      wheelRailForcePosition.value.y = newY
      break
    case 'wheelLoadReduction':
      wheelLoadReductionPosition.value.x = newX
      wheelLoadReductionPosition.value.y = newY
      break
    case 'derailmentCoefficient':
      derailmentCoefficientPosition.value.x = newX
      derailmentCoefficientPosition.value.y = newY
      break
    case 'speed':
      speedPosition.value.x = newX
      speedPosition.value.y = newY
      break
    case 'minimap':
      minimapPosition.value.x = newX
      minimapPosition.value.y = newY
      break
  }
  
  // Prevent default for touch events to avoid scrolling
  if (event.type.includes('touch')) {
    event.preventDefault()
  }
}

function stopDrag() {
  isDragging = false
  activeWindow = null
  
  // Remove event listeners for mouse and touch
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

// 视窗显示状态
const showMinimap = ref(false)
const showMarshalling = ref(true)
const showSpeedChart = ref(true)

// 状态信息
const currentTime = ref('')
const currentMileage = ref(0)
const currentSpeed = ref(0)

// 更新当前时间
function updateCurrentTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 更新里程和速度
function updateTrainStatus() {
  if (!baseTrackPath) return
  
  // 根据当前进度计算里程
  const trackLength = baseTrackPath.getLength()
  const mileage = (progress.value * trackLength) / 1000 // 转换为公里
  currentMileage.value = mileage
  
  // 模拟速度（根据动画状态）
  if (isAnimating.value) {
    currentSpeed.value = 300 // 假设运行速度为300km/h
  } else {
    currentSpeed.value = 0 // 静止时速度为0
  }
}

// 视角选择
const currentView = ref('axle2-position1')

// 监听视角变化
watch(currentView, (newView) => {
  switchView(newView)
})

// 切换视角
function switchView(viewType) {
  if (!camera || !controls) return
  
  // 计算目标轮对位置
  let targetPosition = new THREE.Vector3(0, 2, 0)
  let targetQuaternion = new THREE.Quaternion(0, 0, 0, 1)
  
  switch (viewType) {
    case 'main':
      // 主视角
      camera.position.set(-3, 5, -10) // 降低主视角相机高度
      controls.target.set(0, 2, 0)
      
      // 更新相机目标变量
      cameraTargetPosition.set(-3, 5, -10) // 降低主视角相机高度
      cameraTargetLookAt.set(0, 2, 0)
      controlsTarget.set(0, 2, 0)
      break
    case 'axle1-position1':
      // 转向架1的前轴的左轮（一轴左轮）
      if (wheelSet) {
        targetPosition.copy(wheelSet.position)
        targetQuaternion.copy(wheelSet.quaternion)
      } else {
        // 轮对未初始化时使用默认位置
        targetPosition.set(0, 1, 0)
        targetQuaternion.set(0, 0, 0, 1)
      }
      camera.position.set(targetPosition.x - 1.5, 3, targetPosition.z - 2) // 调整相机位置，远离车轮，更好地展示轮轨接触
      controls.target.set(targetPosition.x, 0.5, targetPosition.z)
      
      // 更新相机目标变量
      cameraTargetPosition.set(targetPosition.x - 1.5, 3, targetPosition.z - 2) // 调整相机位置，远离车轮，更好地展示轮轨接触
      cameraTargetLookAt.set(targetPosition.x, 0.5, targetPosition.z)
      controlsTarget.set(targetPosition.x, 0.5, targetPosition.z)
      break
    case 'axle1-position2':
      // 转向架1的前轴的右轮（一轴右轮）
      if (wheelSet) {
        targetPosition.copy(wheelSet.position)
        targetQuaternion.copy(wheelSet.quaternion)
      } else {
        // 轮对未初始化时使用默认位置
        targetPosition.set(0, 1, 0)
        targetQuaternion.set(0, 0, 0, 1)
      }
      camera.position.set(targetPosition.x + 1.5, 3, targetPosition.z - 2) // 调整相机位置，远离车轮，更好地展示轮轨接触
      controls.target.set(targetPosition.x, 0.5, targetPosition.z)
      
      // 更新相机目标变量
      cameraTargetPosition.set(targetPosition.x + 1.5, 3, targetPosition.z - 2) // 调整相机位置，远离车轮，更好地展示轮轨接触
      cameraTargetLookAt.set(targetPosition.x, 0.5, targetPosition.z)
      controlsTarget.set(targetPosition.x, 0.5, targetPosition.z)
      break
    case 'axle2-position1':
      // 转向架1的后轴的左轮（二轴左轮）
      if (secondWheelSet) {
        targetPosition.copy(secondWheelSet.position)
        targetQuaternion.copy(secondWheelSet.quaternion)
      }
      camera.position.set(targetPosition.x - 1, 3, targetPosition.z - 1) // 提高相机高度
      controls.target.set(targetPosition.x, 0.5, targetPosition.z)
      
      // 更新相机目标变量
      cameraTargetPosition.set(targetPosition.x - 1, 3, targetPosition.z - 1) // 提高相机高度
      cameraTargetLookAt.set(targetPosition.x, 0.5, targetPosition.z)
      controlsTarget.set(targetPosition.x, 0.5, targetPosition.z)
      break
    case 'axle2-position2':
      // 转向架1的后轴的右轮（二轴右轮）
      if (secondWheelSet) {
        targetPosition.copy(secondWheelSet.position)
        targetQuaternion.copy(secondWheelSet.quaternion)
      }
      camera.position.set(targetPosition.x + 1, 3, targetPosition.z - 1) // 提高相机高度
      controls.target.set(targetPosition.x, 0.5, targetPosition.z)
      
      // 更新相机目标变量
      cameraTargetPosition.set(targetPosition.x + 1, 3, targetPosition.z - 1) // 提高相机高度
      cameraTargetLookAt.set(targetPosition.x, 0.5, targetPosition.z)
      controlsTarget.set(targetPosition.x, 0.5, targetPosition.z)
      break
    case 'axle3-position1':
      // 转向架2的前轴的左轮（三轴左轮）
      if (thirdWheelSet) {
        targetPosition.copy(thirdWheelSet.position)
        targetQuaternion.copy(thirdWheelSet.quaternion)
      }
      camera.position.set(targetPosition.x - 1, 3, targetPosition.z - 1) // 提高相机高度
      controls.target.set(targetPosition.x, 0.5, targetPosition.z)
      
      // 更新相机目标变量
      cameraTargetPosition.set(targetPosition.x - 1, 3, targetPosition.z - 1) // 提高相机高度
      cameraTargetLookAt.set(targetPosition.x, 0.5, targetPosition.z)
      controlsTarget.set(targetPosition.x, 0.5, targetPosition.z)
      break
    case 'axle3-position2':
      // 转向架2的前轴的右轮（三轴右轮）
      if (thirdWheelSet) {
        targetPosition.copy(thirdWheelSet.position)
        targetQuaternion.copy(thirdWheelSet.quaternion)
      }
      camera.position.set(targetPosition.x + 1, 3, targetPosition.z - 1) // 提高相机高度
      controls.target.set(targetPosition.x, 0.5, targetPosition.z)
      
      // 更新相机目标变量
      cameraTargetPosition.set(targetPosition.x + 1, 3, targetPosition.z - 1) // 提高相机高度
      cameraTargetLookAt.set(targetPosition.x, 0.5, targetPosition.z)
      controlsTarget.set(targetPosition.x, 0.5, targetPosition.z)
      break
    case 'axle4-position1':
      // 转向架2的后轴的左轮（四轴左轮）
      if (fourthWheelSet) {
        targetPosition.copy(fourthWheelSet.position)
        targetQuaternion.copy(fourthWheelSet.quaternion)
      }
      camera.position.set(targetPosition.x - 1, 3, targetPosition.z - 1) // 提高相机高度
      controls.target.set(targetPosition.x, 0.5, targetPosition.z)
      
      // 更新相机目标变量
      cameraTargetPosition.set(targetPosition.x - 1, 3, targetPosition.z - 1) // 提高相机高度
      cameraTargetLookAt.set(targetPosition.x, 0.5, targetPosition.z)
      controlsTarget.set(targetPosition.x, 0.5, targetPosition.z)
      break
    case 'axle4-position2':
      // 转向架2的后轴的右轮（四轴右轮）
      if (fourthWheelSet) {
        targetPosition.copy(fourthWheelSet.position)
        targetQuaternion.copy(fourthWheelSet.quaternion)
      }
      camera.position.set(targetPosition.x + 1, 3, targetPosition.z - 1) // 提高相机高度
      controls.target.set(targetPosition.x, 0.5, targetPosition.z)
      
      // 更新相机目标变量
      cameraTargetPosition.set(targetPosition.x + 1, 3, targetPosition.z - 1) // 提高相机高度
      cameraTargetLookAt.set(targetPosition.x, 0.5, targetPosition.z)
      controlsTarget.set(targetPosition.x, 0.5, targetPosition.z)
      break
  }
  
  // 更新控制器
  controls.update()
  
  // 更新相机朝向
  camera.lookAt(controls.target)
}

// 图表实例
let wheelLoadReductionChart = null
let derailmentCoefficientChart = null
let wheelRailForceChart = null
let speedChart = null

// 数据模拟相关
let simulationInterval = null

// 图表数据存储
const wheelLoadReductionData = reactive({
  mileages: [],
  leftReductionRates: [],
  rightReductionRates: []
})

const derailmentCoefficientData = reactive({
  mileages: [],
  leftCoefficients: [],
  rightCoefficients: []
})

const wheelRailForceData = reactive({
  mileages: [],
  verticalForces: [],
  lateralForces: [],
  longitudinalForces: []
})

// 速度数据
const speedData = reactive({
  mileages: [],
  speeds: []
})

// 轨道元素管理
let trackElements = {
  bases: [],
  sleepers: [],
  rails: [],
  ground: [],
  grids: []
}

// 轨道元素池，用于重用元素，减少内存开销
let trackElementPool = {
  bases: [],
  sleepers: [],
  rails: []
}

// 共享几何体和材质
let sharedGeometries = {
  base: null,
  block: null,
  bar: null
}

let sharedMaterials = {
  base: null,
  sleeper: null,
  bar: null
}
let animationId
let isAnimating = ref(false)
let progress = ref(0)
let cameraFollow = ref(true)
let cameraTarget = ref('BOG2-AX1') // 默认跟踪第二个转向架的第一个轴
let cameraTargetPosition = new THREE.Vector3(-3, 8, -10) // 初始化为与相机位置一致
let cameraTargetLookAt = new THREE.Vector3(0, 2, 0) // 初始化为默认目标点
let controlsTarget = new THREE.Vector3(0, 2, 0) // 初始化为默认目标点

// 性能优化变量
let lastTimeUpdate = 0
let lastStatusUpdate = 0
let frameCount = 0

const wheelSetParams = reactive({
  axleLength: 1.435, // 标准轨距
  wheelRadius: 0.45, // 标准车轮半径
  axleRadius: 0.05  // 轮轴半径
})

// 初始化3D场景
function initScene() {
  // 创建场景
  scene = new THREE.Scene()
  // 不设置场景背景，使用CSS背景
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    canvasContainer.value.clientWidth / canvasContainer.value.clientHeight,
    0.1,
    10000
  )
  // 计算目标轮对位置（默认使用二轴左轮位置）
  let targetPosition = new THREE.Vector3(0, 1, 0)
  let targetQuaternion = new THREE.Quaternion(0, 0, 0, 1)
  
  // 如果轮对已初始化，使用实际位置
  if (wheelSet) {
    targetPosition.copy(wheelSet.position)
    targetQuaternion.copy(wheelSet.quaternion)
  }
  
  // 设置相机初始位置为二轴左轮视角
  camera.position.set(targetPosition.x - 1.5, 3, targetPosition.z - 2)
  
  // 初始化相机目标位置
  cameraTargetPosition.set(targetPosition.x - 1.5, 3, targetPosition.z - 2)
  cameraTargetLookAt.set(targetPosition.x, 0.5, targetPosition.z)
  controlsTarget.set(targetPosition.x, 0.5, targetPosition.z)
  camera.lookAt(targetPosition.x, 0.5, targetPosition.z)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
  renderer.shadowMap.enabled = true
  canvasContainer.value.appendChild(renderer.domElement)
  
  // 创建轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 1, 0)
  
  // 添加光源
  addLights()
  
  // 创建环境贴图
  createEnvironmentMap()
  
  // 创建地面
  createWheelRailGround()
  
  // 创建轨道
  createWheelRailTrack()
  
  // 创建轮对
  createWheelSet()
  
  // 渲染场景
  animate()
  
  // 初始化小地图
  const minimapCanvas = document.getElementById('minimapCanvas')
  if (minimapCanvas) {
    initMinimap(minimapCanvas)
    // 设置轨道路径
    if (baseTrackPath) {
      setTrackPath(baseTrackPath)
    }
  }
}



// 初始化编组场景
function initMarshallingScene(canvas) {
  console.log('初始化编组场景...')
  
  // 创建场景
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xb3d3ff) // 设置为b3d3ff背景色
  
  // 创建相机
  const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000)
  camera.position.set(0, 1.5, 4) // 调整相机位置，使其更接近模型
  camera.lookAt(0, 0, 0)
  
  // 创建渲染器
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true })
  renderer.setSize(canvas.width, canvas.height)
  
  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
  directionalLight.position.set(1, 1, 2)
  scene.add(directionalLight)
  
  const pointLight = new THREE.PointLight(0xffffff, 0.5)
  pointLight.position.set(0, 1, 1)
  scene.add(pointLight)

  
  trainConfig.forEach((carConfig, index) => {
    const loader = new GLTFLoader()
    
    loader.load(
      carConfig.modelPath,
      (gltf) => {
        console.log(`模型加载成功: ${carConfig.modelPath}`)
        
        const model = gltf.scene
        
        // 计算模型边界框，以便正确定位
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        
        console.log(`模型大小: ${size.x}, ${size.y}, ${size.z}`)
        console.log(`模型中心: ${center.x}, ${center.y}, ${center.z}`)
        
        // 调整模型大小，确保它适合场景
        const maxSize = Math.max(size.x, size.y, size.z)
        const scaleFactor = 1.5 / maxSize // 调整缩放因子，使模型大小合适
        model.scale.set(scaleFactor, scaleFactor, scaleFactor)
        
        // 重新计算边界框，获取缩放后的大小
        box.setFromObject(model)
        box.getCenter(center)
        
        // 调整模型位置，使其在场景中排列
        const spacing = 1.5 // 减小车辆之间的间距
        const carPositionX = (index - 3.5) * spacing // 居中排列8辆车
        
        // 调整模型位置，使其居中显示
        model.position.set(carPositionX - center.x, -center.y, -center.z)
        
        // 绕自身垂直轴（Y轴）旋转
        // 除最后一节车外，其余车保持原方向旋转90度，最后一节车向相反方向旋转90度
        if (index === 7) { // 最后一节车（索引为7）
          // 最后一节车：向相反方向旋转90度
          model.rotation.y = -Math.PI / 2
        } else {
          // 其余车：保持原方向旋转90度
          model.rotation.y = Math.PI / 2
        }
        
        // 添加模型到场景
        scene.add(model)
        
        loadedModels++
        console.log(`已加载 ${loadedModels}/${trainConfig.length} 个模型`)
        
        // 当所有模型加载完成后，开始渲染
        if (loadedModels === trainConfig.length) {
          console.log('所有模型加载完成，开始渲染...')
          animate()
        }
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded')
      },
      (error) => {
        console.error('模型加载错误:', error)
      }
    )
  })
  
  // 渲染场景
  function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
  }
}





// 加载模型到画布
function loadModelToCanvas(canvas, carConfig) {
  console.log(`加载模型到画布 ${canvas.dataset.carIndex}: ${carConfig.modelPath}`)
  
  // 创建场景
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x2a3b4c) // 使用深色背景，而不是纯黑色
  
  // 创建相机
  const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000)
  camera.position.set(0, 0, 3) // 调整相机位置，使其更接近模型
  
  // 创建渲染器
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true })
  renderer.setSize(canvas.width, canvas.height)
  
  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0) // 增加环境光亮度
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5) // 增加方向光亮度
  directionalLight.position.set(1, 1, 2) // 调整方向光位置
  scene.add(directionalLight)
  
  // 添加额外的点光源，增强模型细节
  const pointLight = new THREE.PointLight(0xffffff, 0.5)
  pointLight.position.set(0, 1, 1)
  scene.add(pointLight)
  
  // 加载模型
  const loader = new GLTFLoader()
  
  loader.load(
    carConfig.modelPath,
    (gltf) => {
      console.log(`模型加载成功: ${carConfig.modelPath}`)
      
      const model = gltf.scene
      scene.add(model)
      
      // 计算模型边界框，以便正确定位
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      
      console.log(`模型大小: ${size.x}, ${size.y}, ${size.z}`)
      console.log(`模型中心: ${center.x}, ${center.y}, ${center.z}`)
      
      // 调整模型大小，确保它适合画布
      const maxSize = Math.max(size.x, size.y, size.z)
      const scaleFactor = 2 / maxSize // 调整缩放因子，使模型大小合适
      model.scale.set(scaleFactor, scaleFactor, scaleFactor)
      
      // 重新计算边界框，获取缩放后的大小
      box.setFromObject(model)
      box.getCenter(center)
      
      // 调整模型位置，使其居中显示
      model.position.set(-center.x, -center.y, -center.z)
      
      // 绕自身垂直轴（Y轴）旋转
      // 除最后一节车外，其余车保持原方向旋转90度，最后一节车向相反方向旋转90度
      const carIndex = parseInt(canvas.dataset.carIndex)
      if (carIndex === 7) { // 最后一节车（索引为7）
        // 最后一节车：向相反方向旋转90度
        model.rotation.y = -Math.PI / 2
      } else {
        // 其余车：保持原方向旋转90度
        model.rotation.y = Math.PI / 2
      }
      
      // 渲染场景
      function animate() {
        requestAnimationFrame(animate)
        renderer.render(scene, camera)
      }
      
      animate()
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    },
    (error) => {
      console.error('模型加载错误:', error)
      // 显示错误信息
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('模型加载失败', canvas.width / 2, canvas.height / 2)
    }
  )
}

// 创建环境贴图
function createEnvironmentMap() {
  // 创建一个简单的立方体环境贴图
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256)
  cubeRenderTarget.texture.type = THREE.HalfFloatType
  // 使用新的颜色空间设置
  cubeRenderTarget.texture.colorSpace = THREE.SRGBColorSpace
  
  // 创建一个立方体相机用于环境贴图
  const cubeCamera = new THREE.CubeCamera(0.1, 10000, cubeRenderTarget)
  scene.environment = cubeRenderTarget.texture
  
  // 在动画循环中更新环境贴图
  const originalAnimate = animate
  animate = function() {
    if (wheelSet) {
      cubeCamera.position.copy(wheelSet.position)
      cubeCamera.update(renderer, scene)
    }
    originalAnimate()
  }
}

// 添加光源
function addLights() {
  // 环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambientLight)
  
  // 平行光（模拟太阳光）
  const directionalLight = new THREE.DirectionalLight(0xffffcc, 1.0)
  directionalLight.position.set(100, 100, 100)
  directionalLight.castShadow = true
  scene.add(directionalLight)
  
  // 补光
  const fillLight = new THREE.DirectionalLight(0xccccff, 0.3)
  fillLight.position.set(-100, 50, -100)
  scene.add(fillLight)
  
  // 配置阴影
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.left = -200
  directionalLight.shadow.camera.right = 200
  directionalLight.shadow.camera.top = 200
  directionalLight.shadow.camera.bottom = -200
  directionalLight.shadow.camera.near = 0.1
  directionalLight.shadow.camera.far = 300
}

// 创建地面
function createWheelRailGround() {
  // 清除旧的地面和网格线
  trackElements.ground.forEach(ground => {
    scene.remove(ground)
  })
  trackElements.ground = []
  
  trackElements.grids.forEach(grid => {
    scene.remove(grid)
  })
  trackElements.grids = []
  
  // 初始创建一些地面块和网格线
  updateTrackElements()
}

// 创建轨道轮廓
function createRailProfile() {
  // 60kg/m钢轨核心尺寸（单位：米）
  const railHeight = 0.176
  const halfTopWidth = 0.0708 / 2
  const halfBottomWidth = 0.150 / 2
  const webHalfThickness = 0.0165 / 2
  const r13 = 0.013
  const r20 = 0.020
      
  const points = []
  const headTopY = railHeight / 2
  const headBottomY = headTopY - 0.0483
  const baseBottomY = -railHeight / 2
  const webBottomY = baseBottomY + 0.0305
      
  // 右侧轮廓
  points.push(new THREE.Vector2(halfTopWidth, headTopY))
  
  // 轨头右侧圆角（R13）
  const headRightCenter = new THREE.Vector2(halfTopWidth, headTopY - r13)
  for (let angle = Math.PI / 2; angle >= 0; angle -= 0.1) {
    points.push(new THREE.Vector2(
      headRightCenter.x + r13 * Math.cos(angle),
      headRightCenter.y + r13 * Math.sin(angle)
    ))
  }
  
  // 轨头到轨腰的右侧斜面
  points.push(new THREE.Vector2(0.03325, headBottomY))
  points.push(new THREE.Vector2(webHalfThickness, webBottomY))
  
  // 轨底右侧到底部点
  points.push(new THREE.Vector2(halfBottomWidth, baseBottomY))
  
  // 左侧轮廓（对称复制右侧）
  const rightPointsCount = points.length
  for (let i = rightPointsCount - 1; i >= 0; i--) {
    const p = points[i]
    points.push(new THREE.Vector2(-p.x, p.y))
  }
  
  return points
}

// 创建拉伸几何体
function createRail(trackPath, color = 0x333333) {
  const profile = createRailProfile()
  
  // 将钢轨轮廓逆时针旋转90度
  const rotatedProfile = profile.map(point => new THREE.Vector2(-point.y, point.x))
  
  const extrudeSettings = {
    steps: 200,
    bevelEnabled: false,
    extrudePath: trackPath
  }
  
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(rotatedProfile), extrudeSettings)
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.3
  })
  
  const rail = new THREE.Mesh(geometry, material)
  rail.castShadow = true
  rail.receiveShadow = true
  // 调整钢轨位置，使其位于轨枕上方且不与车轮重叠
  rail.position.y = 0.1 + 0.2 + 0.2 + 0.2 // 钢轨位于指定高度，略低于车轮底部
  return rail
}

// 创建轨道偏移路径
function offsetTrackPath(basePath, offsetDistance) {
  const points = []
  const segments = 200
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    
    // 获取点
    const point = basePath.getPoint(t)
    
    // 获取切线
    const tangent = basePath.getTangentAt(t).normalize()
    
    // 计算垂直于切线的方向
    const normal = new THREE.Vector3(
      -tangent.z,
      0,
      tangent.x
    ).normalize()
    
    // 应用偏移
    const offsetPoint = point.clone().add(normal.multiplyScalar(offsetDistance))
    points.push(offsetPoint)
  }
  
  // 使用 CatmullRomCurve3 创建平滑曲线，确保法线方向一致
  const offsetPath = new THREE.CatmullRomCurve3(points)
  offsetPath.type = 'catmullrom'
  offsetPath.tension = 0.5
  
  return offsetPath
}

// 创建轨道
function createWheelRailTrack() {
  // 创建基础轨道路径
  const trackSegments = trackStore.getHorizontalSegments()
  baseTrackPath = createTrackPathFromSegments(trackSegments)
  
  // 创建左右轨道（偏移标准轨距）
  const gauge = 1.435 // 标准轨距
  leftTrackPath = offsetTrackPath(baseTrackPath, -gauge / 2)
  rightTrackPath = offsetTrackPath(baseTrackPath, gauge / 2)
  
  // 清除旧的钢轨段
  trackElements.rails.forEach(rail => {
    scene.remove(rail)
    if (rail.geometry) rail.geometry.dispose()
    if (rail.material) rail.material.dispose()
  })
  trackElements.rails = []
  
  // 初始创建一些钢轨段
  updateTrackElements()
  
  // 创建轨枕
  createSleepers()
  
  // 创建无砟轨道底座
  createBallastlessTrack()
}

// 创建无砟轨道底座
function createBallastlessTrack() {
  // 无砟轨道底座宽度（比轨枕稍宽）
  const baseWidth = 3.0 // 3米
  const baseHeight = 1.0 // 100厘米（增加深度以减少间隙）
  const baseThickness = 0.2 // 20厘米
  
  // 无砟轨道底座材质
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e3034, // 轨道基座颜色
    metalness: 0.1,
    roughness: 0.7
  })
  
  // 创建无砟轨道底座几何体
  const baseGeometry = new THREE.BoxGeometry(baseWidth, baseThickness, baseHeight)
  
  // 清除旧的底座段
  trackElements.bases.forEach(base => {
    scene.remove(base)
  })
  trackElements.bases = []
  
  // 初始创建一些底座段
  updateTrackElements()
}

// 创建轨枕
function createSleepers() {
  // 清除旧轨枕
  trackElements.sleepers.forEach(sleeper => {
    scene.remove(sleeper)
  })
  trackElements.sleepers = []
  
  // 清除旧的sleepers数组
  sleepers.forEach(sleeper => scene.remove(sleeper))
  sleepers = []
  
  // 初始创建一些轨枕
  updateTrackElements()
}

// 创建轮对
function createWheelSet() {
  // 创建车轮组容器
  wheelSet = new THREE.Group()
  
  // 创建车轮
  const wheelGeometry = new THREE.CylinderGeometry(
    wheelSetParams.wheelRadius,
    wheelSetParams.wheelRadius,
    0.1,
    32
  )
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.8,
    roughness: 0.2,
    envMapIntensity: 0.5
  })
  
  wheels = []
  
  // 左侧车轮
  const leftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
  leftWheel.position.x = -wheelSetParams.axleLength / 2
  leftWheel.rotation.z = Math.PI / 2
  leftWheel.castShadow = true
  wheels.push(leftWheel)
  wheelSet.add(leftWheel)
  
  // 右侧车轮
  const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
  rightWheel.position.x = wheelSetParams.axleLength / 2
  rightWheel.rotation.z = Math.PI / 2
  rightWheel.castShadow = true
  wheels.push(rightWheel)
  wheelSet.add(rightWheel)
  
  // 创建轮轴
  const axleGeometry = new THREE.CylinderGeometry(
    wheelSetParams.axleRadius,
    wheelSetParams.axleRadius,
    wheelSetParams.axleLength * 1.25,
    16
  )
  const axleMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    metalness: 0.7,
    roughness: 0.3,
    envMapIntensity: 0.4
  })
  
  axle = new THREE.Mesh(axleGeometry, axleMaterial)
  axle.rotation.z = Math.PI / 2
  axle.castShadow = true
  wheelSet.add(axle)
  
  // 将轮对添加到场景
  scene.add(wheelSet)
  
  // 创建第二个轮对（向前2.5m）
  secondWheelSet = new THREE.Group()
  secondWheels = []
  
  // 第二个轮对的左侧车轮
  const secondLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
  secondLeftWheel.position.x = -wheelSetParams.axleLength / 2
  secondLeftWheel.rotation.z = Math.PI / 2
  secondLeftWheel.castShadow = true
  secondWheels.push(secondLeftWheel)
  secondWheelSet.add(secondLeftWheel)
  
  // 第二个轮对的右侧车轮
  const secondRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
  secondRightWheel.position.x = wheelSetParams.axleLength / 2
  secondRightWheel.rotation.z = Math.PI / 2
  secondRightWheel.castShadow = true
  secondWheels.push(secondRightWheel)
  secondWheelSet.add(secondRightWheel)
  
  // 第二个轮对的轮轴
  const secondAxle = new THREE.Mesh(axleGeometry, axleMaterial)
  secondAxle.rotation.z = Math.PI / 2
  secondAxle.castShadow = true
  secondWheelSet.add(secondAxle)
  
  // 将第二个轮对添加到场景
  scene.add(secondWheelSet)
  
  // 创建第三个轮对（前方17.5米处的第一个轮对）
  thirdWheelSet = new THREE.Group()
  thirdWheels = []
  
  // 第三个轮对的左侧车轮
  const thirdLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
  thirdLeftWheel.position.x = -wheelSetParams.axleLength / 2
  thirdLeftWheel.rotation.z = Math.PI / 2
  thirdLeftWheel.castShadow = true
  thirdWheels.push(thirdLeftWheel)
  thirdWheelSet.add(thirdLeftWheel)
  
  // 第三个轮对的右侧车轮
  const thirdRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
  thirdRightWheel.position.x = wheelSetParams.axleLength / 2
  thirdRightWheel.rotation.z = Math.PI / 2
  thirdRightWheel.castShadow = true
  thirdWheels.push(thirdRightWheel)
  thirdWheelSet.add(thirdRightWheel)
  
  // 第三个轮对的轮轴
  const thirdAxle = new THREE.Mesh(axleGeometry, axleMaterial)
  thirdAxle.rotation.z = Math.PI / 2
  thirdAxle.castShadow = true
  thirdWheelSet.add(thirdAxle)
  
  // 将第三个轮对添加到场景
  scene.add(thirdWheelSet)
  
  // 创建第四个轮对（前方17.5米处的第二个轮对，距离第三个轮对2.5米）
  fourthWheelSet = new THREE.Group()
  fourthWheels = []
  
  // 第四个轮对的左侧车轮
  const fourthLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
  fourthLeftWheel.position.x = -wheelSetParams.axleLength / 2
  fourthLeftWheel.rotation.z = Math.PI / 2
  fourthLeftWheel.castShadow = true
  fourthWheels.push(fourthLeftWheel)
  fourthWheelSet.add(fourthLeftWheel)
  
  // 第四个轮对的右侧车轮
  const fourthRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
  fourthRightWheel.position.x = wheelSetParams.axleLength / 2
  fourthRightWheel.rotation.z = Math.PI / 2
  fourthRightWheel.castShadow = true
  fourthWheels.push(fourthRightWheel)
  fourthWheelSet.add(fourthRightWheel)
  
  // 第四个轮对的轮轴
  const fourthAxle = new THREE.Mesh(axleGeometry, axleMaterial)
  fourthAxle.rotation.z = Math.PI / 2
  fourthAxle.castShadow = true
  fourthWheelSet.add(fourthAxle)
  
  // 将第四个轮对添加到场景
  scene.add(fourthWheelSet)
  
  // 更新轮对位置
  updateWheelSetPosition(progress.value)
  
  // 创建轮轨接触点箭头
  createContactArrows()
  
  // 加载转向架模型
  loadBogie()
}

// 加载转向架模型
function loadBogie() {
  // 清除旧的转向架
  if (bogie) {
    scene.remove(bogie)
    bogie = null
  }
  if (secondBogie) {
    scene.remove(secondBogie)
    secondBogie = null
  }
  
  // 创建转向架加载器
  const loader = new GLTFLoader()
  
  // 尝试加载第一个转向架模型
  loader.load(
    '/models_3d/bogie_wheelset_models.glb',
    (gltf) => {
      // 加载成功
      bogie = gltf.scene
      
      // 调整转向架大小和位置
      bogie.scale.set(1, 1, 1)
      scene.add(bogie)
      
      // 调整转向架位置，使其横跨在两个轮对上方
      updateBogiePosition()
      
      // 加载第二个转向架模型
      loader.load(
        '/models_3d/bogie_wheelset_models.glb',
        (gltf) => {
          // 加载成功
          secondBogie = gltf.scene
          
          // 调整转向架大小和位置
          secondBogie.scale.set(1, 1, 1)
          scene.add(secondBogie)
          
          // 调整第二个转向架位置
          updateSecondBogiePosition()
        },
        undefined,
        (error) => {
          // 加载失败，创建透明长方体作为替代
          console.error('第二个转向架模型加载失败，使用透明长方体替代:', error)
          
          // 创建透明长方体
          const bogieGeometry = new THREE.BoxGeometry(5, 1, 2)
          const bogieMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            metalness: 0.2,
            roughness: 0.8
          })
          
          secondBogie = new THREE.Mesh(bogieGeometry, bogieMaterial)
          scene.add(secondBogie)
          
          // 调整第二个转向架位置
          updateSecondBogiePosition()
        }
      )
    },
    undefined,
    (error) => {
      // 加载失败，创建透明长方体作为替代
      console.error('转向架模型加载失败，使用透明长方体替代:', error)
      
      // 创建透明长方体
      const bogieGeometry = new THREE.BoxGeometry(5, 1, 2)
      const bogieMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        metalness: 0.2,
        roughness: 0.8
      })
      
      bogie = new THREE.Mesh(bogieGeometry, bogieMaterial)
      scene.add(bogie)
      
      // 调整转向架位置，使其横跨在两个轮对上方
      updateBogiePosition()
      
      // 为第二个转向架也创建透明长方体
      secondBogie = new THREE.Mesh(bogieGeometry, bogieMaterial)
      scene.add(secondBogie)
      
      // 调整第二个转向架位置
      updateSecondBogiePosition()
    }
  )
}

// 更新转向架位置
function updateBogiePosition() {
  if (!bogie || !wheelSet || !secondWheelSet) return
  
  // 计算两个轮对之间的中心点
  const centerX = (wheelSet.position.x + secondWheelSet.position.x) / 2
  const centerY = Math.max(wheelSet.position.y, secondWheelSet.position.y) +0.05// 在轮对上方0.1米（降低高度）
  const centerZ = (wheelSet.position.z + secondWheelSet.position.z) / 2
  
  // 设置转向架位置
  bogie.position.set(centerX, centerY, centerZ)
  
  // 使转向架朝向与轮对一致
  bogie.quaternion.copy(wheelSet.quaternion)
}

// 更新第二个转向架位置
function updateSecondBogiePosition() {
  if (!secondBogie || !thirdWheelSet || !fourthWheelSet) return
  
  // 计算两个轮对之间的中心点
  const centerX = (thirdWheelSet.position.x + fourthWheelSet.position.x) / 2
  const centerY = Math.max(thirdWheelSet.position.y, fourthWheelSet.position.y) + 0.05// 在轮对上方0.1米（降低高度）
  const centerZ = (thirdWheelSet.position.z + fourthWheelSet.position.z) / 2
  
  // 设置转向架位置
  secondBogie.position.set(centerX, centerY, centerZ)
  
  // 使转向架朝向与轮对一致
  secondBogie.quaternion.copy(thirdWheelSet.quaternion)
}

// 更新轮对位置
function updateWheelSetPosition(progressValue) {
  if (!baseTrackPath || !wheelSet) return
  
  // 获取轨道上的点和切线
  const point = baseTrackPath.getPoint(progressValue)
  let tangent = baseTrackPath.getTangentAt(progressValue)
  
  if (!tangent) {
    tangent = new THREE.Vector3(1, 0, 0)
  } else {
    tangent = tangent.normalize()
  }
  
  // 设置轮对位置
  wheelSet.position.copy(point)
  wheelSet.position.y = 0.1 + 0.2 + 0.2 + 0.23 + 0.01 + wheelSetParams.wheelRadius // 轮对位于指定高度
  
  // 设置轮对朝向
  const up = new THREE.Vector3(0, 1, 0)
  wheelSet.matrix.lookAt(point, point.clone().add(tangent), up)
  wheelSet.quaternion.setFromRotationMatrix(wheelSet.matrix)
  
  // 计算车轮旋转角度
  const trackLength = baseTrackPath.getLength()
  const traveledDistance = trackLength * progressValue
  const rotationAngle = traveledDistance / wheelSetParams.wheelRadius
  
  // 更新车轮旋转
  wheels.forEach(wheel => {
    wheel.rotation.x = rotationAngle
  })
  
  // 更新第二个轮对的位置（向前2.5m）
  if (secondWheelSet) {
    const distanceAhead = 2.5 // 向前2.5m
    const secondTraveledDistance = traveledDistance + distanceAhead
    const secondProgressValue = (secondTraveledDistance % trackLength) / trackLength
    
    const secondPoint = baseTrackPath.getPoint(secondProgressValue)
    let secondTangent = baseTrackPath.getTangentAt(secondProgressValue)
    
    if (!secondTangent) {
      secondTangent = new THREE.Vector3(1, 0, 0)
    } else {
      secondTangent = secondTangent.normalize()
    }
    
    // 设置第二个轮对位置
    secondWheelSet.position.copy(secondPoint)
    secondWheelSet.position.y = 0.1 + 0.2 + 0.2 + 0.23 + 0.01 + wheelSetParams.wheelRadius // 轮对位于指定高度
    
    // 设置第二个轮对朝向
    secondWheelSet.matrix.lookAt(secondPoint, secondPoint.clone().add(secondTangent), up)
    secondWheelSet.quaternion.setFromRotationMatrix(secondWheelSet.matrix)
    
    // 计算第二个轮对的车轮旋转角度
    const secondRotationAngle = secondTraveledDistance / wheelSetParams.wheelRadius
    
    // 更新第二个轮对的车轮旋转
    secondWheels.forEach(wheel => {
      wheel.rotation.x = secondRotationAngle
    })
  }
  
  // 更新第三个轮对的位置（向前17.5m）
  if (thirdWheelSet) {
    const distanceAhead = 17.5 // 向前17.5m
    const thirdTraveledDistance = traveledDistance + distanceAhead
    const thirdProgressValue = (thirdTraveledDistance % trackLength) / trackLength
    
    const thirdPoint = baseTrackPath.getPoint(thirdProgressValue)
    let thirdTangent = baseTrackPath.getTangentAt(thirdProgressValue)
    
    if (!thirdTangent) {
      thirdTangent = new THREE.Vector3(1, 0, 0)
    } else {
      thirdTangent = thirdTangent.normalize()
    }
    
    // 设置第三个轮对位置
    thirdWheelSet.position.copy(thirdPoint)
    thirdWheelSet.position.y = 0.1 + 0.2 + 0.2 + 0.23 + 0.01 + wheelSetParams.wheelRadius // 轮对位于指定高度
    
    // 设置第三个轮对朝向
    thirdWheelSet.matrix.lookAt(thirdPoint, thirdPoint.clone().add(thirdTangent), up)
    thirdWheelSet.quaternion.setFromRotationMatrix(thirdWheelSet.matrix)
    
    // 计算第三个轮对的车轮旋转角度
    const thirdRotationAngle = thirdTraveledDistance / wheelSetParams.wheelRadius
    
    // 更新第三个轮对的车轮旋转
    thirdWheels.forEach(wheel => {
      wheel.rotation.x = thirdRotationAngle
    })
  }
  
  // 更新第四个轮对的位置（向前20m，即17.5+2.5m）
  if (fourthWheelSet) {
    const distanceAhead = 20 // 向前20m
    const fourthTraveledDistance = traveledDistance + distanceAhead
    const fourthProgressValue = (fourthTraveledDistance % trackLength) / trackLength
    
    const fourthPoint = baseTrackPath.getPoint(fourthProgressValue)
    let fourthTangent = baseTrackPath.getTangentAt(fourthProgressValue)
    
    if (!fourthTangent) {
      fourthTangent = new THREE.Vector3(1, 0, 0)
    } else {
      fourthTangent = fourthTangent.normalize()
    }
    
    // 设置第四个轮对位置
    fourthWheelSet.position.copy(fourthPoint)
    fourthWheelSet.position.y = 0.1 + 0.2 + 0.2 + 0.23 + 0.01 + wheelSetParams.wheelRadius // 轮对位于指定高度
    
    // 设置第四个轮对朝向
    fourthWheelSet.matrix.lookAt(fourthPoint, fourthPoint.clone().add(fourthTangent), up)
    fourthWheelSet.quaternion.setFromRotationMatrix(fourthWheelSet.matrix)
    
    // 计算第四个轮对的车轮旋转角度
    const fourthRotationAngle = fourthTraveledDistance / wheelSetParams.wheelRadius
    
    // 更新第四个轮对的车轮旋转
    fourthWheels.forEach(wheel => {
      wheel.rotation.x = fourthRotationAngle
    })
  }
  
  // 更新转向架位置
  updateBogiePosition()
  updateSecondBogiePosition()
  
  // 立即更新相机目标位置，确保相机能及时跟随
  if (cameraFollow.value) {
    // 选择目标：根据cameraTarget的值选择不同的跟踪目标
    let targetPosition = new THREE.Vector3()
    let targetQuaternion = new THREE.Quaternion()
    
    // 根据选择的目标轴确定跟踪对象
    switch (cameraTarget.value) {
      case 'BOG1-AX1':
        // 第一个转向架的第一个轴（第一个轮对）
        if (wheelSet) {
          targetPosition.copy(wheelSet.position)
          targetQuaternion.copy(wheelSet.quaternion)
        } else if (bogie) {
          targetPosition.copy(bogie.position)
          targetQuaternion.copy(bogie.quaternion)
        } else {
          targetPosition.set(0, 2, 0)
          targetQuaternion.set(0, 0, 0, 1)
        }
        break
      case 'BOG1-AX2':
        // 第一个转向架的第二个轴（第二个轮对）
        if (secondWheelSet) {
          targetPosition.copy(secondWheelSet.position)
          targetQuaternion.copy(secondWheelSet.quaternion)
        } else if (bogie) {
          targetPosition.copy(bogie.position)
          targetQuaternion.copy(bogie.quaternion)
        } else {
          targetPosition.set(0, 2, 0)
          targetQuaternion.set(0, 0, 0, 1)
        }
        break
      case 'BOG2-AX1':
        // 第二个转向架的第一个轴（第三个轮对）
        if (thirdWheelSet) {
          targetPosition.copy(thirdWheelSet.position)
          targetQuaternion.copy(thirdWheelSet.quaternion)
        } else if (secondBogie) {
          targetPosition.copy(secondBogie.position)
          targetQuaternion.copy(secondBogie.quaternion)
        } else {
          targetPosition.set(0, 2, 0)
          targetQuaternion.set(0, 0, 0, 1)
        }
        break
      case 'BOG2-AX2':
        // 第二个转向架的第二个轴（第四个轮对）
        if (fourthWheelSet) {
          targetPosition.copy(fourthWheelSet.position)
          targetQuaternion.copy(fourthWheelSet.quaternion)
        } else if (secondBogie) {
          targetPosition.copy(secondBogie.position)
          targetQuaternion.copy(secondBogie.quaternion)
        } else {
          targetPosition.set(0, 2, 0)
          targetQuaternion.set(0, 0, 0, 1)
        }
        break
      default:
        // 默认使用第一个转向架的第一个轴
        if (wheelSet) {
          targetPosition.copy(wheelSet.position)
          targetQuaternion.copy(wheelSet.quaternion)
        } else if (bogie) {
          targetPosition.copy(bogie.position)
          targetQuaternion.copy(bogie.quaternion)
        } else {
          targetPosition.set(0, 2, 0)
          targetQuaternion.set(0, 0, 0, 1)
        }
    }
    
    // 计算相机目标位置
    const cameraOffset = new THREE.Vector3(-3, 8, -20)
    cameraOffset.applyQuaternion(targetQuaternion)
    
    // 设置相机目标位置
    cameraTargetPosition.copy(targetPosition.clone().add(cameraOffset))
    
    // 设置相机目标朝向点
    cameraTargetLookAt.copy(targetPosition)
    
    // 设置轨道控制器目标点
    controlsTarget.copy(targetPosition)
  }
  
  // 相机目标位置已经在 updateWheelSetPosition 中更新
  
  // 更新轨道元素
  updateTrackElements()
  
  // 更新轮轨接触点箭头位置
  updateContactArrows()
}

// 更新轨道元素（动态生成和销毁）
function updateTrackElements() {
  if (!baseTrackPath || !camera) return
  
  // 可见区域范围（单位：米）
  const visibilityRange = 50 // 相机周围50米范围内的轨道元素可见
  
  // 轨枕尺寸
  const sleeperLength = 2.4 // 轨枕总长度 2400mm
  const sleeperWidth = 0.2 // 轨枕总宽度 200mm
  const sleeperHeight = 0.23 // 轨枕总高度 230mm
  const sleeperSpacing = 0.65 // 标准间距 650mm
  
  // 底座尺寸
  const baseWidth = 3.0 // 3米
  const baseHeight = 1.0 // 100厘米
  const baseThickness = 0.2 // 20厘米
  
  // 轨枕材质
  const sleeperMaterial = new THREE.MeshStandardMaterial({
    color: 0xfffdff, // 浅灰色
    metalness: 0.1,
    roughness: 0.8
  })
  
  // 初始化共享几何体和材质
  if (!sharedGeometries.base) {
    sharedGeometries.base = new THREE.BoxGeometry(baseWidth, baseThickness, baseHeight)
  }
  if (!sharedMaterials.base) {
    sharedMaterials.base = new THREE.MeshStandardMaterial({
      color: 0x2e3034, // 轨道基座颜色
      metalness: 0.1,
      roughness: 0.7
    })
  }
  if (!sharedGeometries.block) {
    const blockWidth = 0.2 // 块体宽度
    const blockLength = 0.6 // 块体长度
    const blockHeight = sleeperHeight // 块体高度
    sharedGeometries.block = new THREE.BoxGeometry(blockLength, blockHeight, blockWidth)
  }
  if (!sharedGeometries.bar) {
    const barDiameter = 0.02 // 钢筋直径
    const barLength = sleeperLength - 0.6 // 钢筋长度
    sharedGeometries.bar = new THREE.CylinderGeometry(barDiameter / 2, barDiameter / 2, barLength, 8)
  }
  if (!sharedMaterials.sleeper) {
    sharedMaterials.sleeper = new THREE.MeshStandardMaterial({
      color: 0xfffdff, // 浅灰色
      metalness: 0.1,
      roughness: 0.8
    })
  }
  if (!sharedMaterials.bar) {
    sharedMaterials.bar = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa, // 钢筋颜色
      metalness: 0.8,
      roughness: 0.2
    })
  }
  
  // 创建SK-2型CRTSⅠ型双块式轨枕几何体
  function createSK2SleeperGeometry() {
    const group = new THREE.Group()
    
    // 双块式轨枕的两个混凝土块
    const blockSpacing = 0.1 // 两根钢筋之间的间距
    
    // 标准轨距为1.435米，钢轨中心距离
    const gauge = 1.435
    const railOffset = gauge / 2
    
    // 创建左侧混凝土块（位于左侧钢轨下方）
    const leftBlock = new THREE.Mesh(sharedGeometries.block, sharedMaterials.sleeper)
    leftBlock.position.x = -railOffset
    
    // 创建右侧混凝土块（位于右侧钢轨下方）
    const rightBlock = new THREE.Mesh(sharedGeometries.block, sharedMaterials.sleeper)
    rightBlock.position.x = railOffset
    
    // 创建第一根连接钢筋
    const bar1 = new THREE.Mesh(sharedGeometries.bar, sharedMaterials.bar)
    bar1.position.z = blockSpacing / 2
    bar1.rotation.z = Math.PI / 2
    
    // 创建第二根连接钢筋
    const bar2 = new THREE.Mesh(sharedGeometries.bar, sharedMaterials.bar)
    bar2.position.z = -blockSpacing / 2
    bar2.rotation.z = Math.PI / 2
    
    // 将所有部分添加到组中
    group.add(leftBlock)
    group.add(rightBlock)
    group.add(bar1)
    group.add(bar2)
    
    return group
  }
  
  // 计算轨道长度
  const trackLength = baseTrackPath.getLength()
  
  // 获取相机位置
  const cameraPosition = camera.position
  
  // 计算相机在轨道上的近似位置
  let closestProgress = 0
  let minDistance = Infinity
  
  // 采样一些点来找到相机在轨道上的近似位置
  for (let i = 0; i <= 100; i++) {
    const progressValue = i / 100
    const point = baseTrackPath.getPoint(progressValue)
    const distance = cameraPosition.distanceTo(point)
    
    if (distance < minDistance) {
      minDistance = distance
      closestProgress = progressValue
    }
  }
  
  // 计算可见区域的起点和终点
  const visibleStartProgress = Math.max(0, closestProgress - visibilityRange / trackLength)
  const visibleEndProgress = Math.min(1, closestProgress + visibilityRange / trackLength)
  
  // 更新底座段
  const newBases = []
  const baseSegmentLength = 1 // 每1米一段
  const baseCount = Math.ceil((visibleEndProgress - visibleStartProgress) * trackLength / baseSegmentLength)
  
  for (let i = 0; i < baseCount; i++) {
    const progressValue = visibleStartProgress + (i * baseSegmentLength) / trackLength
    if (progressValue > visibleEndProgress) break
    
    const point = baseTrackPath.getPoint(progressValue)
    let tangent = baseTrackPath.getTangentAt(progressValue)
    
    if (!tangent) {
      tangent = new THREE.Vector3(1, 0, 0)
    } else {
      tangent = tangent.normalize()
    }
    
    // 检查是否已经存在这个位置的底座段
    let baseExists = false
    for (const existingBase of trackElements.bases) {
      if (existingBase.position.distanceTo(point) < 0.5) {
        baseExists = true
        newBases.push(existingBase)
        break
      }
    }
    
    // 如果不存在，创建新的底座段
    if (!baseExists) {
      const baseSegment = new THREE.Mesh(sharedGeometries.base, sharedMaterials.base)
      
      // 设置底座段位置
      baseSegment.position.copy(point)
      baseSegment.position.y = 0.1 // 底座底部与地面接触，顶部在y=0.3米处
      
      // 设置底座段朝向（与轨道方向一致）
      const up = new THREE.Vector3(0, 1, 0)
      baseSegment.matrix.lookAt(point, point.clone().add(tangent), up)
      baseSegment.quaternion.setFromRotationMatrix(baseSegment.matrix)
      
      // 添加到场景和数组
      scene.add(baseSegment)
      newBases.push(baseSegment)
    }
  }
  
  // 移除不在可见区域的底座段
  for (const base of trackElements.bases) {
    if (!newBases.includes(base)) {
      scene.remove(base)
      // 注意：不释放几何体和材质，因为它们是共享的
    }
  }
  
  // 更新底座数组
  trackElements.bases = newBases
  
  // 更新轨枕
  const newSleepers = []
  const sleeperCount = Math.ceil((visibleEndProgress - visibleStartProgress) * trackLength / sleeperSpacing)
  
  for (let i = 0; i < sleeperCount; i++) {
    const progressValue = visibleStartProgress + (i * sleeperSpacing) / trackLength
    if (progressValue > visibleEndProgress) break
    
    const point = baseTrackPath.getPoint(progressValue)
    let tangent = baseTrackPath.getTangentAt(progressValue)
    
    if (!tangent) {
      tangent = new THREE.Vector3(1, 0, 0)
    } else {
      tangent = tangent.normalize()
    }
    
    // 检查是否已经存在这个位置的轨枕
    let sleeperExists = false
    for (const existingSleeper of trackElements.sleepers) {
      if (existingSleeper.position.distanceTo(point) < 0.3) {
        sleeperExists = true
        newSleepers.push(existingSleeper)
        break
      }
    }
    
    // 如果不存在，创建新的轨枕
    if (!sleeperExists) {
      // 创建SK-2型CRTSⅠ型双块式轨枕
      const sleeper = createSK2SleeperGeometry()
      
      // 设置轨枕位置
      sleeper.position.copy(point)
      sleeper.position.y = 0.1 + 0.2 + sleeperHeight / 2 // 轨枕位于无砟轨道底座上方0.2米处
      
      // 设置轨枕朝向（与轨道方向一致）
      const up = new THREE.Vector3(0, 1, 0)
      sleeper.matrix.lookAt(point, point.clone().add(tangent), up)
      sleeper.quaternion.setFromRotationMatrix(sleeper.matrix)
      
      // 添加到场景和数组
      scene.add(sleeper)
      newSleepers.push(sleeper)
    }
  }
  
  // 移除不在可见区域的轨枕
  for (const sleeper of trackElements.sleepers) {
    if (!newSleepers.includes(sleeper)) {
      scene.remove(sleeper)
      // 注意：不释放几何体和材质，因为它们是共享的
    }
  }
  
  // 更新轨枕数组
  trackElements.sleepers = newSleepers
  
  // 更新地面和网格线
  updateGroundAndGrids()
  
  // 更新钢轨
  updateRails()
}

// 更新钢轨
function updateRails() {
  if (!baseTrackPath || !leftTrackPath || !rightTrackPath || !camera) return
  
  // 可见区域范围（单位：米）
  const visibilityRange = 60 // 相机周围60米范围内的钢轨可见
  
  // 钢轨段长度
  const railSegmentLength = 20 // 每个钢轨段20米
  
  // 获取相机位置
  const cameraPosition = camera.position
  
  // 计算可见区域的边界
  const minX = cameraPosition.x - visibilityRange
  const maxX = cameraPosition.x + visibilityRange
  const minZ = cameraPosition.z - visibilityRange
  const maxZ = cameraPosition.z + visibilityRange
  
  // 获取轮对位置（用于判断钢轨是否需要销毁）
  let wheelSetPosition = null
  if (wheelSet) {
    wheelSetPosition = wheelSet.position
  }
  
  // 计算轨道总长度
  const trackLength = baseTrackPath.getLength()
  
  // 更新钢轨段
  const newRails = []
  
  // 创建钢轨段
  for (let i = 0; i < trackLength; i += railSegmentLength) {
    // 计算钢轨段的起始和结束位置
    const startProgress = i / trackLength
    const endProgress = Math.min((i + railSegmentLength) / trackLength, 1)
    
    // 获取钢轨段的起始和结束点
    const startPoint = baseTrackPath.getPoint(startProgress)
    const endPoint = baseTrackPath.getPoint(endProgress)
    
    // 计算钢轨段的中心点
    const centerX = (startPoint.x + endPoint.x) / 2
    const centerZ = (startPoint.z + endPoint.z) / 2
    
    // 检查钢轨段是否在可见区域内
    const isInVisibleRange = centerX >= minX && centerX <= maxX && centerZ >= minZ && centerZ <= maxZ
    
    // 检查钢轨段是否在轮对后方（需要销毁的条件）
    let isBehindWheelSet = false
    if (wheelSetPosition) {
      // 计算钢轨段中心点到轮对的距离
      const distanceToWheelSet = Math.sqrt(
        Math.pow(centerX - wheelSetPosition.x, 2) +
        Math.pow(centerZ - wheelSetPosition.z, 2)
      )
      
      // 计算钢轨段中心点相对于轮对的方向
      const directionToWheelSet = new THREE.Vector3(
        wheelSetPosition.x - centerX,
        0,
        wheelSetPosition.z - centerZ
      ).normalize()
      
      // 计算轮对的前进方向
      let wheelSetDirection = new THREE.Vector3(1, 0, 0)
      if (wheelSet && wheelSet.quaternion) {
        wheelSetDirection.applyQuaternion(wheelSet.quaternion)
        wheelSetDirection.y = 0
        wheelSetDirection.normalize()
      }
      
      // 计算两个方向的点积，判断钢轨段是否在轮对后方
      const dotProduct = directionToWheelSet.dot(wheelSetDirection)
      isBehindWheelSet = dotProduct > 0.5 && distanceToWheelSet > 10 // 轮对后方10米以外的钢轨段需要销毁
    }
    
    // 如果钢轨段在可见区域内且不在轮对后方，则创建或保留
    if (isInVisibleRange && !isBehindWheelSet) {
      // 分别检查左侧和右侧钢轨段是否存在
      let leftRailExists = false
      let rightRailExists = false
      
      for (const existingRail of trackElements.rails) {
        const dx = Math.abs(existingRail.userData.centerX - centerX)
        const dz = Math.abs(existingRail.userData.centerZ - centerZ)
        if (dx < railSegmentLength / 2 && dz < railSegmentLength / 2) {
          if (existingRail.userData.type === 'left') {
            leftRailExists = true
            newRails.push(existingRail)
          } else if (existingRail.userData.type === 'right') {
            rightRailExists = true
            newRails.push(existingRail)
          }
        }
      }
      
      // 如果左侧钢轨段不存在，创建新的左侧钢轨段
      if (!leftRailExists) {
        const leftRailSegment = createRailSegment(leftTrackPath, startProgress, endProgress, 0x333333)
        leftRailSegment.userData = {
          type: 'left',
          startProgress,
          endProgress,
          centerX,
          centerZ
        }
        scene.add(leftRailSegment)
        newRails.push(leftRailSegment)
      }
      
      // 如果右侧钢轨段不存在，创建新的右侧钢轨段
      if (!rightRailExists) {
        const rightRailSegment = createRailSegment(rightTrackPath, startProgress, endProgress, 0x444444)
        rightRailSegment.userData = {
          type: 'right',
          startProgress,
          endProgress,
          centerX,
          centerZ
        }
        scene.add(rightRailSegment)
        newRails.push(rightRailSegment)
      }
    }
  }
  
  // 移除不在可见区域内或在轮对后方的钢轨段
  for (const rail of trackElements.rails) {
    if (!newRails.includes(rail)) {
      scene.remove(rail)
      // 释放钢轨段的几何体和材质内存
      if (rail.geometry) rail.geometry.dispose()
      if (rail.material) rail.material.dispose()
    }
  }
  
  // 更新钢轨段数组
  trackElements.rails = newRails
}

// 创建钢轨段
function createRailSegment(trackPath, startProgress, endProgress, color = 0x333333) {
  // 创建钢轨轮廓
  const profile = createRailProfile()
  
  // 将钢轨轮廓逆时针旋转90度
  const rotatedProfile = profile.map(point => new THREE.Vector2(-point.y, point.x))
  
  // 创建钢轨段路径
  const segmentPoints = []
  const segmentSteps = 50
  
  for (let i = 0; i <= segmentSteps; i++) {
    const progress = startProgress + (endProgress - startProgress) * (i / segmentSteps)
    const point = trackPath.getPoint(progress)
    segmentPoints.push(point)
  }
  
  // 使用 CatmullRomCurve3 创建平滑曲线，确保法线方向一致
  const segmentPath = new THREE.CatmullRomCurve3(segmentPoints)
  segmentPath.type = 'catmullrom'
  segmentPath.tension = 0.5
  
  const extrudeSettings = {
    steps: segmentSteps,
    bevelEnabled: false,
    extrudePath: segmentPath
  }
  
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(rotatedProfile), extrudeSettings)
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.3
  })
  
  const railSegment = new THREE.Mesh(geometry, material)
  railSegment.castShadow = true
  railSegment.receiveShadow = true
  // 调整钢轨位置，使其位于轨枕上方且不与车轮重叠
  railSegment.position.y = 0.1 + 0.2 + 0.2 + 0.2 // 钢轨位于指定高度，略低于车轮底部
  
  return railSegment
}

// 更新地面和网格线
function updateGroundAndGrids() {
  if (!camera) return
  
  // 可见区域范围（单位：米）
  const visibilityRange = 60 // 相机周围60米范围内的地面和网格线可见
  
  // 地面块尺寸
  const groundBlockSize = 50 // 每个地面块50x50米
  
  // 获取相机位置
  const cameraPosition = camera.position
  
  // 计算可见区域的边界
  const minX = cameraPosition.x - visibilityRange
  const maxX = cameraPosition.x + visibilityRange
  const minZ = cameraPosition.z - visibilityRange
  const maxZ = cameraPosition.z + visibilityRange
  
  // 计算需要创建的地面块数量
  const startX = Math.floor(minX / groundBlockSize) * groundBlockSize
  const startZ = Math.floor(minZ / groundBlockSize) * groundBlockSize
  const endX = Math.ceil(maxX / groundBlockSize) * groundBlockSize
  const endZ = Math.ceil(maxZ / groundBlockSize) * groundBlockSize
  
  // 初始化共享地面材质
  if (!sharedMaterials.ground) {
    sharedMaterials.ground = new THREE.MeshStandardMaterial({
      color: 0xc0c5c9,
      roughness: 0.9,
      metalness: 0.1
    })
  }
  
  // 初始化共享地面几何体
  if (!sharedGeometries.ground) {
    sharedGeometries.ground = new THREE.PlaneGeometry(groundBlockSize, groundBlockSize)
  }
  
  // 更新地面块
  const newGroundBlocks = []
  
  // 创建地面块
  for (let x = startX; x < endX; x += groundBlockSize) {
    for (let z = startZ; z < endZ; z += groundBlockSize) {
      // 检查是否已经存在这个位置的地面块
      let groundExists = false
      for (const existingGround of trackElements.ground) {
        const dx = Math.abs(existingGround.position.x - (x + groundBlockSize / 2))
        const dz = Math.abs(existingGround.position.z - (z + groundBlockSize / 2))
        if (dx < groundBlockSize / 2 && dz < groundBlockSize / 2) {
          groundExists = true
          newGroundBlocks.push(existingGround)
          break
        }
      }
      
      // 如果不存在，创建新的地面块
      if (!groundExists) {
        const groundBlock = new THREE.Mesh(sharedGeometries.ground, sharedMaterials.ground)
        groundBlock.rotation.x = -Math.PI / 2
        groundBlock.position.set(x + groundBlockSize / 2, 0, z + groundBlockSize / 2)
        groundBlock.receiveShadow = true
        
        scene.add(groundBlock)
        newGroundBlocks.push(groundBlock)
      }
    }
  }
  
  // 移除不在可见区域的地面块
  for (const ground of trackElements.ground) {
    if (!newGroundBlocks.includes(ground)) {
      scene.remove(ground)
    }
  }
  
  // 更新地面块数组
  trackElements.ground = newGroundBlocks
  
  // 更新网格线 - 已禁用
  /*
  const newGrids = []
  
  // 计算需要创建的网格线数量
  const gridSize = 50 // 每个网格线50x50米
  const gridStartX = Math.floor(minX / gridSize) * gridSize
  const gridStartZ = Math.floor(minZ / gridSize) * gridSize
  const gridEndX = Math.ceil(maxX / gridSize) * gridSize
  const gridEndZ = Math.ceil(maxZ / gridSize) * gridSize
  
  // 创建网格线
  for (let x = gridStartX; x < gridEndX; x += gridSize) {
    for (let z = gridStartZ; z < gridEndZ; z += gridSize) {
      // 检查是否已经存在这个位置的网格线
      let gridExists = false
      for (const existingGrid of trackElements.grids) {
        const dx = Math.abs(existingGrid.position.x - (x + gridSize / 2))
        const dz = Math.abs(existingGrid.position.z - (z + gridSize / 2))
        if (dx < gridSize / 2 && dz < gridSize / 2) {
          gridExists = true
          newGrids.push(existingGrid)
          break
        }
      }
      
      // 如果不存在，创建新的网格线
      if (!gridExists) {
        const gridHelper = new THREE.GridHelper(gridSize, 5, 0x000000, 0x000000)
        gridHelper.position.set(x + gridSize / 2, 0.01, z + gridSize / 2)
        scene.add(gridHelper)
        newGrids.push(gridHelper)
      }
    }
  }
  
  // 移除不在可见区域的网格线
  for (const grid of trackElements.grids) {
    if (!newGrids.includes(grid)) {
      scene.remove(grid)
    }
  }
  
  // 更新网格线数组
  trackElements.grids = newGrids
  */
  
  // 移除所有现有的网格线
  trackElements.grids.forEach(grid => {
    scene.remove(grid)
  })
  trackElements.grids = []
}

// 更新轮对参数
function updateWheelSet() {
  if (wheelSet) {
    // 移除旧的轮对
    scene.remove(wheelSet)
    if (secondWheelSet) {
      scene.remove(secondWheelSet)
    }
    if (thirdWheelSet) {
      scene.remove(thirdWheelSet)
    }
    if (fourthWheelSet) {
      scene.remove(fourthWheelSet)
    }
    if (bogie) {
      scene.remove(bogie)
      bogie = null
    }
    if (secondBogie) {
      scene.remove(secondBogie)
      secondBogie = null
    }
    
    // 创建新的轮对
    createWheelSet()
  }
}

// 动画循环
function animate() {
  animationId = requestAnimationFrame(animate)
  
  // 更新当前时间（每100ms更新一次，减少计算）
  if (Date.now() - lastTimeUpdate > 100) {
    updateCurrentTime()
    lastTimeUpdate = Date.now()
  }
  
  // 更新列车状态（每50ms更新一次，减少计算）
  if (Date.now() - lastStatusUpdate > 50) {
    updateTrainStatus()
    lastStatusUpdate = Date.now()
  }
  
  if (isAnimating.value) {
    progress.value += 0.0005 // 减慢轮对运行速度，从0.001改为0.0001
    if (progress.value > 1) {
      progress.value = 0
    }
    updateWheelSetPosition(progress.value)
  }
  
  // 相机平滑跟随
  if (cameraFollow.value) {
    const smoothFactor = 0.08 // 平滑过渡因子，值越小过渡越平滑
    
    // 根据当前视角类型更新相机目标
    if (currentView.value === 'main') {
      // 主视角：使用原有的相机目标更新逻辑
      camera.position.lerp(cameraTargetPosition, smoothFactor)
      
      // 平滑更新相机朝向
      const lookAtDirection = cameraTargetLookAt.clone().sub(camera.position).normalize()
      const currentDirection = new THREE.Vector3().subVectors(controls.target, camera.position).normalize()
      const smoothedDirection = currentDirection.lerp(lookAtDirection, smoothFactor)
      const newLookAt = camera.position.clone().add(smoothedDirection.multiplyScalar(10))
      
      // 平滑更新轨道控制器目标点
      controls.target.lerp(controlsTarget, smoothFactor)
      
      // 更新相机朝向
      camera.lookAt(newLookAt)
    } else {
      // 车轮视角：根据当前选择的车轮更新相机位置
      let targetWheelSet = null
      let offsetX = 0
      
      switch (currentView.value) {
        case 'axle1-position1': // 一轴左轮
          targetWheelSet = wheelSet
          offsetX = -1
          break
        case 'axle1-position2': // 一轴右轮
          targetWheelSet = wheelSet
          offsetX = 1
          break
        case 'axle2-position1': // 二轴左轮
          targetWheelSet = secondWheelSet
          offsetX = -1
          break
        case 'axle2-position2': // 二轴右轮
          targetWheelSet = secondWheelSet
          offsetX = 1
          break
        case 'axle3-position1': // 三轴左轮
          targetWheelSet = thirdWheelSet
          offsetX = -1
          break
        case 'axle3-position2': // 三轴右轮
          targetWheelSet = thirdWheelSet
          offsetX = 1
          break
        case 'axle4-position1': // 四轴左轮
          targetWheelSet = fourthWheelSet
          offsetX = -1
          break
        case 'axle4-position2': // 四轴右轮
          targetWheelSet = fourthWheelSet
          offsetX = 1
          break
      }
      
      if (targetWheelSet) {
        // 计算目标相机位置
        let offsetX = 0
        let offsetZ = -2
        
        // 根据当前视角类型调整偏移量
        if (currentView.value === 'axle1-position1') {
          offsetX = -1.5
        } else if (currentView.value === 'axle1-position2') {
          offsetX = 1.5
        } else if (currentView.value === 'axle2-position1') {
          offsetX = -1
        } else if (currentView.value === 'axle2-position2') {
          offsetX = 1
        } else if (currentView.value === 'axle3-position1') {
          offsetX = -1
        } else if (currentView.value === 'axle3-position2') {
          offsetX = 1
        } else if (currentView.value === 'axle4-position1') {
          offsetX = -1
        } else if (currentView.value === 'axle4-position2') {
          offsetX = 1
        }
        
        const targetCamPos = new THREE.Vector3(
          targetWheelSet.position.x + offsetX,
          3,  // 使用与switchView一致的相机高度
          targetWheelSet.position.z + offsetZ
        )
        
        // 计算目标朝向点
        const targetLookAt = new THREE.Vector3(
          targetWheelSet.position.x,
          0.5,
          targetWheelSet.position.z
        )
        
        // 平滑更新相机位置
        camera.position.lerp(targetCamPos, smoothFactor)
        
        // 平滑更新相机朝向
        controls.target.lerp(targetLookAt, smoothFactor)
        
        // 更新相机朝向
        camera.lookAt(targetLookAt)
      }
    }
  }
  
  controls.update()
  renderer.render(scene, camera)
  
  // 更新轮轨接触点箭头位置（每2帧更新一次，减少计算）
  if (frameCount % 2 === 0) {
    updateContactArrows()
  }
  
  // 更新小地图（每5帧更新一次，减少计算）
  if (frameCount % 5 === 0) {
    updateMinimap(camera, [wheelSet, secondWheelSet, thirdWheelSet, fourthWheelSet].filter(Boolean))
  }
  
  frameCount++
}

// 开始运行
function startAnimation() {
  isAnimating.value = true
  
  // 开始数据模拟
  if (!simulationInterval) {
    simulationInterval = dataSimulator.startSimulation(100, {
      onWheelLoadReduction: handleWheelLoadReductionMessage,
      onDerailmentCoefficient: handleDerailmentCoefficientMessage,
      onWheelRailForce: handleWheelRailForceMessage,
      onSpeed: handleSpeedMessage
    })
  }
}

// 停止运行
function stopAnimation() {
  isAnimating.value = false
  
  // 停止数据模拟
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }
}

// 切换动画状态
function toggleAnimation() {
  if (isAnimating.value) {
    stopAnimation()
  } else {
    startAnimation()
  }
}

// 重置动画
function resetAnimation() {
  isAnimating.value = false
  progress.value = 0
  updateWheelSetPosition(0)
  
  // 停止数据模拟
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }
  
  // 清空图表数据
  wheelLoadReductionData.mileages = []
  wheelLoadReductionData.leftReductionRates = []
  wheelLoadReductionData.rightReductionRates = []
  
  derailmentCoefficientData.mileages = []
  derailmentCoefficientData.leftCoefficients = []
  derailmentCoefficientData.rightCoefficients = []
  
  wheelRailForceData.mileages = []
  wheelRailForceData.verticalForces = []
  wheelRailForceData.lateralForces = []
  wheelRailForceData.longitudinalForces = []
  
  speedData.mileages = []
  speedData.speeds = []
  
  // 更新图表
  updateWheelLoadReductionChart()
  updateDerailmentCoefficientChart()
  updateWheelRailForceChart()
  updateSpeedChart()
}

// 切换轮轨力图表显示
function toggleWheelRailForceChart() {
  showWheelRailForceChart.value = !showWheelRailForceChart.value
}

// 切换轮重减载率图表显示
function toggleWheelLoadReductionChart() {
  showWheelLoadReductionChart.value = !showWheelLoadReductionChart.value
}

// 切换脱轨系数图表显示
function toggleDerailmentCoefficientChart() {
  showDerailmentCoefficientChart.value = !showDerailmentCoefficientChart.value
}

// 切换运行轨迹视窗显示
function toggleMinimap() {
  showMinimap.value = !showMinimap.value
  // 如果重新打开小地图，重新初始化
  if (showMinimap.value) {
    setTimeout(() => {
      const minimapCanvas = document.getElementById('minimapCanvas')
      if (minimapCanvas) {
        initMinimap(minimapCanvas)
        // 设置轨道路径
        if (baseTrackPath) {
          setTrackPath(baseTrackPath)
        }
      }
    }, 0)
  }
}

// 切换速度图表显示
function toggleSpeedChart() {
  showSpeedChart.value = !showSpeedChart.value
}

// 切换车辆信息视窗显示
function toggleMarshalling() {
  showMarshalling.value = !showMarshalling.value
  // 如果重新打开编组视窗，不需要重新初始化
}

// 设置关注轮轴位置
function setCameraTarget(target) {
  cameraTarget.value = target
  // 立即更新相机目标位置，确保切换后立即生效
  updateCameraTargetPosition()
}

// 更新相机目标位置
function updateCameraTargetPosition() {
  if (!cameraFollow.value) return
  
  // 选择目标：根据cameraTarget的值选择不同的跟踪目标
  let targetPosition = new THREE.Vector3()
  let targetQuaternion = new THREE.Quaternion()
  
  // 根据选择的目标轴确定跟踪对象
  switch (cameraTarget.value) {
    case 'BOG1-AX1':
      // 第一个转向架的第一个轴（第一个轮对）
      if (wheelSet) {
        targetPosition.copy(wheelSet.position)
        targetQuaternion.copy(wheelSet.quaternion)
      } else if (bogie) {
        targetPosition.copy(bogie.position)
        targetQuaternion.copy(bogie.quaternion)
      } else {
        targetPosition.set(0, 2, 0)
        targetQuaternion.set(0, 0, 0, 1)
      }
      break
    case 'BOG1-AX2':
      // 第一个转向架的第二个轴（第二个轮对）
      if (secondWheelSet) {
        targetPosition.copy(secondWheelSet.position)
        targetQuaternion.copy(secondWheelSet.quaternion)
      } else if (bogie) {
        targetPosition.copy(bogie.position)
        targetQuaternion.copy(bogie.quaternion)
      } else {
        targetPosition.set(0, 2, 0)
        targetQuaternion.set(0, 0, 0, 1)
      }
      break
    case 'BOG2-AX1':
      // 第二个转向架的第一个轴（第三个轮对）
      if (thirdWheelSet) {
        targetPosition.copy(thirdWheelSet.position)
        targetQuaternion.copy(thirdWheelSet.quaternion)
      } else if (secondBogie) {
        targetPosition.copy(secondBogie.position)
        targetQuaternion.copy(secondBogie.quaternion)
      } else {
        targetPosition.set(0, 2, 0)
        targetQuaternion.set(0, 0, 0, 1)
      }
      break
    case 'BOG2-AX2':
      // 第二个转向架的第二个轴（第四个轮对）
      if (fourthWheelSet) {
        targetPosition.copy(fourthWheelSet.position)
        targetQuaternion.copy(fourthWheelSet.quaternion)
      } else if (secondBogie) {
        targetPosition.copy(secondBogie.position)
        targetQuaternion.copy(secondBogie.quaternion)
      } else {
        targetPosition.set(0, 2, 0)
        targetQuaternion.set(0, 0, 0, 1)
      }
      break
    default:
      // 默认使用第一个转向架的第一个轴
      if (wheelSet) {
        targetPosition.copy(wheelSet.position)
        targetQuaternion.copy(wheelSet.quaternion)
      } else if (bogie) {
        targetPosition.copy(bogie.position)
        targetQuaternion.copy(bogie.quaternion)
      } else {
        targetPosition.set(0, 2, 0)
        targetQuaternion.set(0, 0, 0, 1)
      }
  }
  
  // 计算相机目标位置
  const cameraOffset = new THREE.Vector3(-3, 8, -20)
  cameraOffset.applyQuaternion(targetQuaternion)
  
  // 设置相机目标位置
  cameraTargetPosition.copy(targetPosition.clone().add(cameraOffset))
  
  // 设置相机目标朝向点
  cameraTargetLookAt.copy(targetPosition)
  
  // 设置轨道控制器目标点
  controlsTarget.copy(targetPosition)
  
  // 立即更新相机位置，确保切换后立即生效
  if (camera) {
    camera.position.copy(cameraTargetPosition)
    camera.lookAt(cameraTargetLookAt)
  }
  
  // 立即更新轨道控制器
  if (controls) {
    controls.target.copy(controlsTarget)
    controls.update()
  }
  
  // 立即渲染场景
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

// 创建箭头（圆柱体+圆锥体）
function createArrow() {
  const arrowGroup = new THREE.Group()
  
  // 创建圆柱体（箭头杆）- 放大比例
  const cylinderGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8)
  const arrowMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 })
  const cylinder = new THREE.Mesh(cylinderGeometry, arrowMaterial)
  cylinder.position.y = 0.1
  arrowGroup.add(cylinder)
  
  // 创建圆锥体（箭头头）- 放大比例
  const coneGeometry = new THREE.ConeGeometry(0.04, 0.08, 8)
  const cone = new THREE.Mesh(coneGeometry, arrowMaterial)
  cone.position.y = 0.24
  arrowGroup.add(cone)
  
  return arrowGroup
}

// 创建轮轨接触点箭头
function createContactArrows() {
  // 清除旧的箭头
  contactArrows.forEach(arrow => {
    scene.remove(arrow)
  })
  contactArrows = []
  
  // 为每个车轮创建箭头
  const wheelSets = [wheelSet, secondWheelSet, thirdWheelSet, fourthWheelSet]
  const wheelArrays = [wheels, secondWheels, thirdWheels, fourthWheels]
  
  wheelSets.forEach((ws, wsIndex) => {
    if (!ws) return
    
    const wsWheels = wheelArrays[wsIndex]
    if (!wsWheels) return
    
    wsWheels.forEach((wheel, wheelIndex) => {
      // 创建三个方向的箭头（x, y, z）
      for (let i = 0; i < 3; i++) {
        const arrow = createArrow()
        
        // 设置箭头方向
        switch (i) {
          case 0: // x轴方向
            arrow.rotation.z = Math.PI / 2
            break
          case 1: // y轴方向（默认）
            break
          case 2: // z轴方向
            arrow.rotation.x = Math.PI / 2
            break
        }
        
        scene.add(arrow)
        contactArrows.push(arrow)
      }
    })
  })
}

// 更新轮轨接触点箭头位置和长度
function updateContactArrows() {
  if (contactArrows.length === 0) return
  
  // 轮对和车轮数组
  const wheelSets = [wheelSet, secondWheelSet, thirdWheelSet, fourthWheelSet]
  const wheelArrays = [wheels, secondWheels, thirdWheels, fourthWheels]
  
  let arrowIndex = 0
  
  // 获取最新的轮轨力数据
  const latestForceIndex = wheelRailForceData.mileages.length - 1
  const hasForceData = latestForceIndex >= 0
  
  // 力值缩放因子（调整箭头长度）
  const forceScaleFactor = 0.0005
  
  // 基础箭头长度
  const baseArrowLength = 0.2
  
  wheelSets.forEach((ws, wsIndex) => {
    if (!ws) return
    
    const wsWheels = wheelArrays[wsIndex]
    if (!wsWheels) return
    
    wsWheels.forEach((wheel, wheelIndex) => {
      // 计算车轮与钢轨接触点位置
      const wheelPosition = new THREE.Vector3()
      wheel.getWorldPosition(wheelPosition)
      
      // 车轮半径
      const wheelRadius = wheelSetParams.wheelRadius
      
      // 接触点位置（车轮底部，与轨道顶面齐平）
      const contactPoint = new THREE.Vector3(
        wheelPosition.x,
        wheelPosition.y - wheelRadius, // 车轮中心高度减去车轮半径，即为轨道顶面高度
        wheelPosition.z
      )
      
      // 更新三个方向的箭头
      for (let i = 0; i < 3; i++) {
        if (arrowIndex < contactArrows.length) {
          const arrow = contactArrows[arrowIndex]
          // 箭头位置：接触点位置向后移动一定距离（Z轴负方向）
          const arrowPosition = new THREE.Vector3(
            contactPoint.x,
            contactPoint.y,
            contactPoint.z - 0.5 // 向后移动0.5单位距离
          )
          arrow.position.copy(arrowPosition)
          
          // 计算箭头长度（基于力数据或默认值，添加随机动态效果）
          let baseScaledLength = baseArrowLength
          if (hasForceData) {
            let forceValue = 0
            switch (i) {
              case 0: // x轴方向（横向力）
                forceValue = Math.abs(wheelRailForceData.lateralForces[latestForceIndex])
                baseScaledLength = baseArrowLength + (forceValue * forceScaleFactor)
                break
              case 1: // y轴方向（垂向力）
                forceValue = Math.abs(wheelRailForceData.verticalForces[latestForceIndex])
                baseScaledLength = baseArrowLength + (forceValue * forceScaleFactor)
                break
              case 2: // z轴方向（纵向力）
                forceValue = Math.abs(wheelRailForceData.longitudinalForces[latestForceIndex])
                baseScaledLength = baseArrowLength + (forceValue * forceScaleFactor)
                break
            }
          }
          
          // 添加随机动态效果到圆柱体（箭头杆）长度（仅当模拟运行时）
          let scaledLength = baseScaledLength
          try {
            if (typeof isAnimating !== 'undefined' && isAnimating.value) {
              const randomFactor = 0.8 + Math.random() * 0.4 // 0.8到1.2之间的随机因子
              scaledLength = baseScaledLength * randomFactor
            }
          } catch (e) {
            // 如果isAnimating不可用，不应用动态效果
          }
          
          // 更新箭头
          if (arrow.children.length > 0) {
            // 更新圆柱体（箭头杆）长度
            const cylinder = arrow.children[0]
            if (cylinder) {
              // 使用缩放而不是重新创建几何体，减少内存开销
              cylinder.scale.y = scaledLength / 0.2 // 0.2是基础长度
              cylinder.position.y = scaledLength / 2
            }
            
            // 更新圆锥体（箭头头）位置
            const cone = arrow.children[1]
            if (cone) {
              cone.position.y = scaledLength + 0.04
            }
          }
          
          arrowIndex++
        }
      }
    })
  })
}

// 进度条变化处理
function onProgressChange() {
  updateWheelSetPosition(progress.value)
}



// 窗口大小变化处理
function onWindowResize() {
  if (!camera || !renderer || !canvasContainer.value) return
  
  camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
  
  // 调整图表大小
  wheelLoadReductionChart?.resize()
  derailmentCoefficientChart?.resize()
  wheelRailForceChart?.resize()
}

// 组件挂载时初始化
onMounted(() => {
  initScene()
  window.addEventListener('resize', onWindowResize)
  
  // 初始化图表
  initWheelLoadReductionChart()
  initDerailmentCoefficientChart()
  initWheelRailForceChart()
  initSpeedChart()
  
  
})

// 监听图表显示状态变化，重新初始化图表
watch(showWheelRailForceChart, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      initWheelRailForceChart()
      if (wheelRailForceData.mileages.length > 0) {
        updateWheelRailForceChart()
      }
    }, 0)
  }
})

watch(showWheelLoadReductionChart, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      initWheelLoadReductionChart()
      if (wheelLoadReductionData.mileages.length > 0) {
        updateWheelLoadReductionChart()
      }
    }, 0)
  }
})

watch(showDerailmentCoefficientChart, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      initDerailmentCoefficientChart()
      if (derailmentCoefficientData.mileages.length > 0) {
        updateDerailmentCoefficientChart()
      }
    }, 0)
  }
})

// 监听速度图表显示状态变化，重新初始化图表
watch(showSpeedChart, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      initSpeedChart()
    }, 0)
  }
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize)
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (controls) {
    controls.dispose()
  }
  if (renderer) {
    renderer.dispose()
  }
  
  // 清理编组场景资源
  if (marshallingAnimationId) {
    cancelAnimationFrame(marshallingAnimationId)
  }
  if (marshallingRenderer) {
    marshallingRenderer.dispose()
  }
  if (marshallingScene) {
    // 清理编组模型
    marshallingModels.forEach(model => {
      marshallingScene.remove(model)
    })
    marshallingModels = []
  }
  // 重置编组场景变量
  marshallingScene = null
  marshallingCamera = null
  marshallingRenderer = null
  marshallingAnimationId = null
  
  // 清理场景中的所有对象
  if (scene) {
    // 清理轮对
    if (wheelSet) {
      scene.remove(wheelSet)
    }
    if (secondWheelSet) {
      scene.remove(secondWheelSet)
    }
    if (thirdWheelSet) {
      scene.remove(thirdWheelSet)
    }
    if (fourthWheelSet) {
      scene.remove(fourthWheelSet)
    }
    
    // 清理转向架
    if (bogie) {
      scene.remove(bogie)
      bogie = null
    }
    if (secondBogie) {
      scene.remove(secondBogie)
      secondBogie = null
    }
    
    // 清理接触点箭头
    contactArrows.forEach(arrow => {
      scene.remove(arrow)
    })
    contactArrows = []
    
    // 清理轨道元素
    trackElements.bases.forEach(base => scene.remove(base))
    trackElements.sleepers.forEach(sleeper => scene.remove(sleeper))
    trackElements.rails.forEach(rail => {
      scene.remove(rail)
      if (rail.geometry) rail.geometry.dispose()
      if (rail.material) rail.material.dispose()
    })
    trackElements.ground.forEach(ground => scene.remove(ground))
    trackElements.grids.forEach(grid => scene.remove(grid))
    
    // 重置轨道元素数组
    trackElements = {
      bases: [],
      sleepers: [],
      rails: [],
      ground: [],
      grids: []
    }
  }
  
  // 清理共享几何体和材质
  for (const key in sharedGeometries) {
    if (sharedGeometries[key]) {
      sharedGeometries[key].dispose()
    }
  }
  sharedGeometries = {
    base: null,
    block: null,
    bar: null,
    ground: null
  }
  
  for (const key in sharedMaterials) {
    if (sharedMaterials[key]) {
      sharedMaterials[key].dispose()
    }
  }
  sharedMaterials = {
    base: null,
    sleeper: null,
    bar: null,
    ground: null
  }
  
  // 清理轮对和车轮数组
  wheelSet = null
  secondWheelSet = null
  thirdWheelSet = null
  fourthWheelSet = null
  wheels = []
  secondWheels = []
  thirdWheels = []
  fourthWheels = []
  
  // 清理轨道路径
  baseTrackPath = null
  leftTrackPath = null
  rightTrackPath = null
  
  // 清理编组视窗资源
  if (marshallingContainer.value) {
    // 清空编组容器，触发画布的清理
    marshallingContainer.value.innerHTML = ''
  }
  
  // 销毁图表
  wheelLoadReductionChart?.dispose()
  derailmentCoefficientChart?.dispose()
  wheelRailForceChart?.dispose()
  
  // 停止数据模拟
  dataSimulator.stopSimulation(simulationInterval)
})

// 初始化轮重减载率曲线
const initWheelLoadReductionChart = () => {
  if (!wheelLoadReductionChartRef.value) return
  
  wheelLoadReductionChart = echarts.init(wheelLoadReductionChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        if (!params || params.length === 0) return '';
        return `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>` +
               `左侧轮重减载率: ${(params[0]?.data || 0).toFixed(3)}<br/>` +
               `右侧轮重减载率: ${(params[1]?.data || 0).toFixed(3)}`;
      }
    },
    legend: {
      data: ['左侧轮重减载率', '右侧轮重减载率'],
      top: 10,
      left: 'center',
      textStyle: {
        fontSize: 12,
        color: '#fff'
      },
      selected: {
        '左侧轮重减载率': true,
        '右侧轮重减载率': false
      },
      itemWidth: 15,
      itemHeight: 10,
      itemGap: 20
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
      name: '轮重减载率',
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
        formatter: '{value}',
        color: '#fff',
        fontSize: 9
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
          width: 1.5
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
            formatter: '安全阈值: 0.6',
            color: '#fff',
            fontSize: 9
          }
        }
      ]
    }
  }
  
  wheelLoadReductionChart.setOption(option)
}

// 更新轮重减载率图表数据
const updateWheelLoadReductionChart = () => {
  if (!wheelLoadReductionChart) return
  
  wheelLoadReductionChart.setOption({
    xAxis: {
      data: wheelLoadReductionData.mileages
    },
    series: [
      {
        name: '左侧轮重减载率',
        data: wheelLoadReductionData.leftReductionRates
      },
      {
        name: '右侧轮重减载率',
        data: wheelLoadReductionData.rightReductionRates
      }
    ]
  })
}

// 处理轮重减载率数据消息
const handleWheelLoadReductionMessage = (dataPoint) => {
  // 直接使用模拟器生成的数据格式
  wheelLoadReductionData.mileages.push(dataPoint.mileage);
  wheelLoadReductionData.leftReductionRates.push(dataPoint.leftReductionRate);
  wheelLoadReductionData.rightReductionRates.push(dataPoint.rightReductionRate);
  
  // 保持数据点在合理范围内
  if (wheelLoadReductionData.mileages.length > 100) {
    wheelLoadReductionData.mileages.shift();
    wheelLoadReductionData.leftReductionRates.shift();
    wheelLoadReductionData.rightReductionRates.shift();
  }
  
  updateWheelLoadReductionChart();
}

// 初始化脱轨系数曲线
const initDerailmentCoefficientChart = () => {
  if (!derailmentCoefficientChartRef.value) return
  
  derailmentCoefficientChart = echarts.init(derailmentCoefficientChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        if (!params || params.length === 0) return '';
        return `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>` +
               `左侧脱轨系数: ${(params[0]?.data || 0).toFixed(3)}<br/>` +
               `右侧脱轨系数: ${(params[1]?.data || 0).toFixed(3)}`;
      }
    },
    legend: {
      data: ['左侧脱轨系数', '右侧脱轨系数'],
      top: 10,
      left: 'center',
      textStyle: {
        fontSize: 12,
        color: '#fff'
      },
      selected: {
        '左侧脱轨系数': true,
        '右侧脱轨系数': false
      },
      itemWidth: 15,
      itemHeight: 10,
      itemGap: 20
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
      name: '脱轨系数',
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
        formatter: '{value}',
        color: '#fff',
        fontSize: 9
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
          width: 1.5
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
          width: 1.5
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
            formatter: '安全阈值: 1.2',
            color: '#fff',
            fontSize: 9
          }
        }
      ]
    }
  }
  
  derailmentCoefficientChart.setOption(option)
}

// 更新脱轨系数图表数据
const updateDerailmentCoefficientChart = () => {
  if (!derailmentCoefficientChart) return
  
  derailmentCoefficientChart.setOption({
    xAxis: {
      data: derailmentCoefficientData.mileages
    },
    series: [
      {
        name: '左侧脱轨系数',
        data: derailmentCoefficientData.leftCoefficients
      },
      {
        name: '右侧脱轨系数',
        data: derailmentCoefficientData.rightCoefficients
      }
    ]
  })
}

// 处理脱轨系数数据消息
const handleDerailmentCoefficientMessage = (dataPoint) => {
  // 直接使用模拟器生成的数据格式
  derailmentCoefficientData.mileages.push(dataPoint.mileage);
  derailmentCoefficientData.leftCoefficients.push(dataPoint.leftCoefficient);
  derailmentCoefficientData.rightCoefficients.push(dataPoint.rightCoefficient);
  
  // 保持数据点在合理范围内
  if (derailmentCoefficientData.mileages.length > 100) {
    derailmentCoefficientData.mileages.shift();
    derailmentCoefficientData.leftCoefficients.shift();
    derailmentCoefficientData.rightCoefficients.shift();
  }
  
  updateDerailmentCoefficientChart();
}

// 初始化轮轨力曲线
const initWheelRailForceChart = () => {
  if (!wheelRailForceChartRef.value) return
  
  wheelRailForceChart = echarts.init(wheelRailForceChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        if (!params || params.length === 0) return '';
        let result = `里程标: ${(params[0].axisValue / 1000).toFixed(2)}km<br/>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${(param.data || 0).toFixed(2)}kN<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['轮轨垂向力', '轮轨横向力', '轮轨纵向力'],
      top: 10,
      left: 'center',
      textStyle: {
        fontSize: 12,
        color: '#fff'
      },
      selected: {
        '轮轨垂向力': true,
        '轮轨横向力': false,
        '轮轨纵向力': false
      },
      itemWidth: 15,
      itemHeight: 10,
      itemGap: 15
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
      name: '轮轨力 (kN)',
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
        formatter: '{value}kN',
        color: '#fff',
        fontSize: 9
      }
    },
    series: [
      {
        name: '轮轨垂向力',
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
      },
      {
        name: '轮轨横向力',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#F56C6C',
          width: 1.5
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
        name: '轮轨纵向力',
        type: 'line',
        stack: 'Total',
        data: [],
        lineStyle: {
          color: '#67C23A',
          width: 1.5
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
  }
  
  wheelRailForceChart.setOption(option)
}

// 更新轮轨力图表数据
const updateWheelRailForceChart = () => {
  if (!wheelRailForceChart) return
  
  wheelRailForceChart.setOption({
    xAxis: {
      data: wheelRailForceData.mileages
    },
    series: [
      {
        name: '轮轨垂向力',
        data: wheelRailForceData.verticalForces
      },
      {
        name: '轮轨横向力',
        data: wheelRailForceData.lateralForces
      },
      {
        name: '轮轨纵向力',
        data: wheelRailForceData.longitudinalForces
      }
    ]
  })
}

// 处理轮轨力数据消息
const handleWheelRailForceMessage = (dataPoint) => {
  // 直接使用模拟器生成的数据格式
  wheelRailForceData.mileages.push(dataPoint.mileage);
  wheelRailForceData.verticalForces.push(dataPoint.verticalForce);
  wheelRailForceData.lateralForces.push(dataPoint.lateralForce);
  wheelRailForceData.longitudinalForces.push(dataPoint.longitudinalForce);
  
  // 保持数据点在合理范围内
  if (wheelRailForceData.mileages.length > 100) {
    wheelRailForceData.mileages.shift();
    wheelRailForceData.verticalForces.shift();
    wheelRailForceData.lateralForces.shift();
    wheelRailForceData.longitudinalForces.shift();
  }
  
  updateWheelRailForceChart();
}

// 处理速度数据消息
const handleSpeedMessage = (dataPoint) => {
  // 直接使用模拟器生成的数据格式
  speedData.mileages.push(dataPoint.mileage);
  speedData.speeds.push(dataPoint.speed);
  
  // 保持数据点在合理范围内
  if (speedData.mileages.length > 100) {
    speedData.mileages.shift();
    speedData.speeds.shift();
  }
  
  // 更新当前速度
  currentSpeed.value = dataPoint.speed;
  
  // 更新图表
  updateSpeedChart();
}

// 初始化速度曲线
const initSpeedChart = () => {
  if (!speedChartRef.value) return
  
  speedChart = echarts.init(speedChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    },
    legend: {
      data: ['速度'],
      textStyle: {
        color: '#fff'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: speedData.mileages,
        axisLabel: {
          color: '#fff'
        },
        axisLine: {
          lineStyle: {
            color: '#444'
          }
        }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: '速度 (km/h)',
        nameTextStyle: {
          color: '#fff'
        },
        axisLabel: {
          color: '#fff'
        },
        axisLine: {
          lineStyle: {
            color: '#444'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    ],
    series: [
      {
        name: '速度',
        type: 'line',
        stack: 'Total',
        areaStyle: {
          opacity: 0.3
        },
        emphasis: {
          focus: 'series'
        },
        data: speedData.speeds,
        lineStyle: {
          width: 2,
          color: '#ff6b00'
        }
      }
    ]
  }
  
  speedChart.setOption(option)
}

// 更新速度曲线
const updateSpeedChart = () => {
  if (!speedChart) return
  
  speedChart.setOption({
    xAxis: {
      data: speedData.mileages
    },
    series: [
      {
        data: speedData.speeds
      }
    ]
  })
}
</script>

<style scoped>
.wheel-rail-contact-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.viewer-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.canvas-container {
  flex: 1;
  background: linear-gradient(135deg, #89ceff 0%, #ffffff 100%);
  overflow: hidden;
}

/* 固定位置的曲线图窗 */
.chart-windows {
  position: absolute;
  top: 80px;
  left: 350px;
  right: 280px;
  bottom: 250px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 15px;
  pointer-events: none;
}

.chart-controls {
  display: flex;
  gap: 10px;
  justify-content: flex-start;
  margin-bottom: 5px;
  pointer-events: auto;
  flex-wrap: nowrap;
}

.chart-controls .speed-button {
  width: 120px;
  max-width: 120px;
}

.chart-window-container {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.chart-window {
  position: absolute;
  background-color: rgba(0, 28, 78, 0.7);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  width: 280px;
  height: 190px;
  z-index: 101;
  pointer-events: auto;
}

.chart-window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  cursor: move;
  user-select: none;
}

.chart-window-header h4 {
  cursor: move;
}

.chart-window-header .close-button {
  cursor: pointer;
}

.chart-window h4 {
  color: #fff;
  margin: 0;
  font-size: 14px;
  text-align: center;
  flex: 1;
}

.close-button {
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  z-index: 1001;
  position: relative;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Ensure close buttons work properly on touch devices */
.close-button {
  touch-action: manipulation;
  user-select: none;
}

.chart {
  width: 100%;
  height: calc(100% - 22px);
}

.section-title {
  color: #333;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  padding: 0;
  margin-right: 20px;
  white-space: nowrap;
}

.controls-container {
  padding: 10px;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.buttons-and-selector {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.buttons-and-selector .el-button {
  background-color: #008afa;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.buttons-and-selector .el-button:hover {
  background-color: #0077d9;
}

.buttons-and-selector .el-button.active {
  background-color: #0077d9;
  box-shadow: 0 2px 4px rgba(0, 119, 217, 0.3);
  font-weight: 600;
}

.view-selector {
  margin-left: 0;
}

.view-select-dropdown {
  background-color: #008afa;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  outline: none;
  transition: background-color 0.3s ease;
}

.view-select-dropdown:hover {
  background-color: #0077d9;
}

.view-select-dropdown option {
  background-color: #fff;
  color: #333;
}

.chart-buttons {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.speed-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #ff6b00 !important;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
  width: 120px;
  min-width: 120px;
  max-width: 120px;
}

.speed-button:hover {
  background-color: #ff8500 !important;
}

.speed-button.active {
  background-color: #ff4500 !important;
  box-shadow: 0 2px 4px rgba(255, 69, 0, 0.3);
  font-weight: 600;
}

/* 固定位置的列车实时运行视窗 */
.realtime-view-fixed {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 400px;
  height: 300px;
  background-color: rgba(10, 25, 47, 0.8);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 100;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.realtime-view-fixed h4 {
  color: #fff;
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 14px;
  text-align: center;
}

.realtime-view {
  width: 100%;
  height: 250px;
  border-radius: 4px;
  overflow: hidden;
}

/* 固定位置的小地图 */

.minimap-fixed {
  position: absolute;
  width: 280px;
  max-width: calc(100% - 40px);
  height: 190px;
  background-color: rgba(0, 28, 78, 0.7);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  z-index: 101;
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: auto;
}

.minimap-fixed .window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  cursor: move;
  user-select: none;
}

.minimap-fixed h4 {
  color: #fff;
  margin: 0;
  font-size: 14px;
  text-align: center;
  flex: 1;
}

.minimap-fixed canvas {
  width: 100%;
  height: calc(100% - 32px);
  border-radius: 4px;
  background-color: #b2d1fd;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 固定位置的编组视窗 */
.marshalling-fixed {
  position: absolute;
  top: 80px;
  left: 20px;
  background-color: rgba(10, 25, 47, 0.8);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 320px;
  max-width: calc(100% - 40px);
  height: 254px;
  display: block !important;
  pointer-events: auto;
}

.marshalling-fixed .window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.marshalling-fixed h4 {
  color: #fff;
  margin: 0;
  font-size: 14px;
  text-align: center;
  flex: 1;
}

.marshalling-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  color: #fff;
  margin-bottom: 10px;
  padding: 5px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.marshalling-status .status-item:first-child {
  text-align: center;
  margin-bottom: 4px;
}

.marshalling-status .buttons-row {
  display: flex;
  gap: 8px;
}

.status-button {
  flex: 1;
  padding: 6px 10px;
  background-color: rgba(0, 138, 250, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  text-align: left;
}

.status-button:hover {
  background-color: rgba(0, 119, 217, 0.9);
}

.status-button:active {
  background-color: rgba(0, 99, 184, 1);
}

.status-item {
  flex: 1;
  text-align: center;
}

.marshalling-container {
  width: 100%;
  height: calc(100% - 70px);
  overflow: hidden; /* 隐藏滑动条 */
  display: flex;
  align-items: center;
  justify-content: center; /* 居中显示内容 */
}

.marshalling-status-simple {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.marshalling-status-simple .status-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
  text-align: center;
}

.marshalling-status-simple .status-item {
  color: #e0e0e0;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .controls-container {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .buttons-and-selector {
    margin-left: 0;
    width: 100%;
    justify-content: flex-start;
  }
  
  .minimap-fixed {
    top: 140px;
    left: 10px;
    right: 10px;
    width: auto;
    max-width: calc(100% - 20px);
  }
  
  .marshalling-fixed {
    top: 420px;
    left: 10px;
    right: 10px;
    width: auto;
    max-width: calc(100% - 20px);
  }
  
  .chart-windows {
    left: 10px;
    right: 10px;
  }
}

@media (max-width: 480px) {
  .buttons-and-selector {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .view-selector {
    width: 100%;
  }
  
  .view-select-dropdown {
    width: 100%;
  }
  
  .minimap-fixed,
  .marshalling-fixed {
    width: calc(100% - 20px);
  }
}



.train-car {
  min-width: 60px;
  height: 120px;
  margin: 0 5px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent; /* 隐藏文字 */
  font-size: 12px;
  font-weight: bold;
  position: relative;
  border: none; /* 移除边框 */
  background: transparent; /* 透明背景 */
  padding: 0; /* 移除内边距 */
}

.car-number {
  display: none; /* 完全隐藏车厢编号和名称 */
}

.car-model {
  flex: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-canvas {
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.train-car.motor {
  background: transparent; /* 透明背景 */
}

.train-car.trailer {
  background: transparent; /* 透明背景 */
}

.train-car::after {
  display: none; /* 移除车厢之间的连接线 */
}

.train-car:last-child::after {
  display: none;
}
</style>