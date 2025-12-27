<template>
  <div class="track-inspection-container">
    <div class="inspection-header">
      <h1>轨检列车视图</h1>
      <div class="inspection-controls">
        <button @click="startAnimation" :disabled="isAnimating">开始运行</button>
        <button @click="stopAnimation" :disabled="!isAnimating">停止运行</button>
        <button @click="resetPosition">重置位置</button>
        <button @click="goToParams">参数设置</button>
      </div>
    </div>
    <div class="inspection-main">
      <div ref="canvasContainer" class="canvas-container"></div>
      <div class="inspection-info">
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
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { trackStore } from '../store/trackStore'

const canvasContainer = ref(null)
const router = useRouter()

// 状态变量
const isAnimating = ref(false)
const trainSpeed = ref(1.0)
const animationProgress = ref(0)
const animationId = ref(null)

// 计算属性
const currentPositionText = computed(() => {
  const percent = Math.round(animationProgress.value * 100)
  return `${percent}%`
})

// 场景变量
let scene, camera, renderer, controls
let train, rail1, rail2
let trackPath = null
let trackLength = 0

// 新增：轨道段缓存相关变量
const cachedRailSegments = {
  rail1: [], // 左侧轨道段
  rail2: []  // 右侧轨道段
}
const segmentLength = 50 // 每个轨道段的长度
const visibleDistance = 200 // 可见距离（列车前后各显示多少距离的轨道）
const cacheSize = Math.ceil(visibleDistance / segmentLength) // 缓存段数量
let currentTrackPosition = 0 // 当前轨道位置（0-1范围）

// 跳转到参数设置界面
function goToParams() {
  stopAnimation()
  router.push('/')
}

// 初始化Three.js场景
function initThreeScene() {
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    canvasContainer.value.clientWidth / canvasContainer.value.clientHeight,
    0.1,
    10000
  )
  camera.position.set(0, 50, 100)
  camera.lookAt(0, 0, 0)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
  renderer.shadowMap.enabled = true
  canvasContainer.value.appendChild(renderer.domElement)
  
  // 创建轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 0, 0)
  
  // 添加光源
  addLights()
  
  // 创建轨道
  createTrack()
  
  // 创建列车（立方体）
  createTrain()
  
  // 添加地面
  createGround()
  
  // 添加辅助网格
  addGridHelper()
  
  // 开始渲染循环
  animate()
  
  // 监听窗口大小变化
  window.addEventListener('resize', onWindowResize)
}

// 添加光源
function addLights() {
  // 环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  
  // 平行光（模拟太阳光）
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(50, 50, 50)
  directionalLight.castShadow = true
  scene.add(directionalLight)
  
  // 配置阴影贴图
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.left = -100
  directionalLight.shadow.camera.right = 100
  directionalLight.shadow.camera.top = 100
  directionalLight.shadow.camera.bottom = -100
  directionalLight.shadow.camera.near = 0.1
  directionalLight.shadow.camera.far = 200
}

// 创建轨道
function createTrack() {
  // 从trackStore获取轨道段数据
  const horizontalSegments = trackStore.getHorizontalSegments()
  
  // 创建轨道基准路径
  trackPath = createTrackPathFromSegments(horizontalSegments)
  
  // 计算轨道长度
  trackLength = estimatePathLength(trackPath)
  
  // 初始化轨道根节点，使用动态轨道段管理
  initRailRoots()
}

// 从轨道段创建路径
function createTrackPathFromSegments(segments) {
  const path = new THREE.CurvePath()
  
  // 创建轨道状态对象
  const trackState = {
    position: new THREE.Vector3(0, 0, 0),
    heading: 0 // 朝向角（弧度，0 表示 X 正方向）
  }
  
  segments.forEach(seg => {
    if (seg.type === 'line') {
      addLineSegment(path, seg.length, trackState)
    } else if (seg.type === 'arc') {
      // 将角度从度转换为弧度
      const angleRad = (seg.angle * Math.PI) / 180
      addArcSegment(path, seg.radius, angleRad, trackState)
    }
  })
  
  return path
}

// 添加直线段
function addLineSegment(path, length, state) {
  const start = state.position.clone()
  const end = state.position.clone().add(
    new THREE.Vector3(
      Math.cos(state.heading) * length,
      0,
      Math.sin(state.heading) * length
    )
  )
  
  path.add(new THREE.LineCurve3(start, end))
  state.position.copy(end)
}

// 添加圆弧段
function addArcSegment(path, radius, angle, state) {
  const segments = 50
  const sign = angle > 0 ? 1 : -1
  const center = new THREE.Vector3(
    state.position.x - sign * radius * Math.sin(state.heading),
    0,
    state.position.z + sign * radius * Math.cos(state.heading)
  )
  
  let prevPoint = state.position.clone()
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const theta = state.heading + angle * t
    
    const point = new THREE.Vector3(
      center.x + sign * radius * Math.sin(theta),
      0,
      center.z - sign * radius * Math.cos(theta)
    )
    
    path.add(new THREE.LineCurve3(prevPoint, point))
    prevPoint = point
  }
  
  state.heading += angle
  state.position.copy(prevPoint)
}

// 估算路径长度
function estimatePathLength(path) {
  let length = 0
  path.curves.forEach(curve => {
    length += curve.getLength()
  })
  return length
}

// 创建轨道段（用于动态生成）
function createRailSegment(options = {}) {
  const { trackPath, startT, endT, offset = 0, color = 0x333333 } = options
  
  // 创建简单的钢轨轮廓（简化版）
  const railProfile = new THREE.Shape([
    new THREE.Vector2(-0.05, 0),
    new THREE.Vector2(-0.05, 0.15),
    new THREE.Vector2(0.05, 0.15),
    new THREE.Vector2(0.05, 0)
  ])
  
  // 创建该段落的偏移路径
  const offsetPath = new THREE.CurvePath()
  const segments = Math.floor((endT - startT) * 200)
  
  for (let i = 0; i <= segments; i++) {
    const t = startT + (endT - startT) * (i / segments)
    const point = trackPath.getPoint(t)
    const tangent = trackPath.getTangent(t).normalize()
    
    // 计算垂直于切线的方向
    const normal = new THREE.Vector3(
      -tangent.z,
      0,
      tangent.x
    ).normalize()
    
    // 应用偏移
    const offsetPoint = point.clone().add(normal.multiplyScalar(offset))
    
    if (i > 0) {
      const prevPoint = offsetPath.curves.length > 0 
        ? offsetPath.curves[offsetPath.curves.length - 1].v2 
        : trackPath.getPoint(startT).clone().add(normal.multiplyScalar(offset))
      offsetPath.add(new THREE.LineCurve3(prevPoint, offsetPoint))
    }
  }
  
  // 创建拉伸几何体
  const extrudeSettings = {
    steps: segments,
    bevelEnabled: false,
    extrudePath: offsetPath
  }
  
  const geometry = new THREE.ExtrudeGeometry(railProfile, extrudeSettings)
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.3
  })
  
  const railSegment = new THREE.Mesh(geometry, material)
  railSegment.castShadow = true
  railSegment.receiveShadow = true
  railSegment.userData = {
    startT,
    endT,
    length: (endT - startT) * trackLength
  }
  
  return railSegment
}

// 更新轨道段（根据当前列车位置）
function updateRailSegments(currentT, isLeftRail = true) {
  const cache = isLeftRail ? cachedRailSegments.rail1 : cachedRailSegments.rail2
  const railRoot = isLeftRail ? rail1 : rail2
  const offset = isLeftRail ? 1.435 / 2 : -1.435 / 2 // 标准轨距的一半
  
  // 计算需要保留的轨道段范围
  const segmentSpacing = 1 / trackLength * segmentLength // 每个段落在0-1路径参数中的占比
  const startOffset = -Math.ceil(visibleDistance / 2 / segmentLength) // 向前预加载的段数
  const endOffset = Math.ceil(visibleDistance / 2 / segmentLength) // 向后预加载的段数
  
  // 计算当前段索引
  const currentSegmentIndex = Math.floor(currentT / segmentSpacing)
  
  // 标记需要保留的轨道段
  const segmentsToKeep = new Set()
  
  for (let i = startOffset; i <= endOffset; i++) {
    const index = (currentSegmentIndex + i + Math.ceil(1 / segmentSpacing)) % Math.ceil(1 / segmentSpacing)
    const startT = Math.max(0, index * segmentSpacing)
    const endT = Math.min(1, (index + 1) * segmentSpacing)
    segmentsToKeep.add(`${startT.toFixed(4)}-${endT.toFixed(4)}`)
  }
  
  // 移除不需要的轨道段
  const segmentsToRemove = []
  for (let i = 0; i < cache.length; i++) {
    const segment = cache[i]
    const key = `${segment.userData.startT.toFixed(4)}-${segment.userData.endT.toFixed(4)}`
    
    if (!segmentsToKeep.has(key)) {
      segmentsToRemove.push(i)
      if (railRoot) {
        railRoot.remove(segment)
      }
      // 清理几何体和材质，释放内存
      if (segment.geometry) {
        segment.geometry.dispose()
      }
      if (segment.material) {
        segment.material.dispose()
      }
    }
  }
  
  // 从缓存中删除已移除的段
  for (let i = segmentsToRemove.length - 1; i >= 0; i--) {
    cache.splice(segmentsToRemove[i], 1)
  }
  
  // 创建新的轨道段
  segmentsToKeep.forEach(key => {
    // 检查该段是否已经存在
    const exists = cache.some(segment => 
      `${segment.userData.startT.toFixed(4)}-${segment.userData.endT.toFixed(4)}` === key
    )
    
    if (!exists) {
      const [startT, endT] = key.split('-').map(Number)
      const newSegment = createRailSegment({
        trackPath,
        startT,
        endT,
        offset,
        color: 0x333333
      })
      
      cache.push(newSegment)
      if (railRoot) {
        railRoot.add(newSegment)
      }
    }
  })
}

// 初始化轨道根节点
function initRailRoots() {
  // 移除旧的整体轨道
  if (rail1 && scene) {
    scene.remove(rail1)
    if (rail1.geometry) rail1.geometry.dispose()
    if (rail1.material) rail1.material.dispose()
  }
  if (rail2 && scene) {
    scene.remove(rail2)
    if (rail2.geometry) rail2.geometry.dispose()
    if (rail2.material) rail2.material.dispose()
  }
  
  // 创建轨道根节点
  rail1 = new THREE.Group()
  rail1.name = 'leftRail'
  rail2 = new THREE.Group()
  rail2.name = 'rightRail'
  
  scene.add(rail1)
  scene.add(rail2)
  
  // 清空缓存
  cachedRailSegments.rail1 = []
  cachedRailSegments.rail2 = []
  
  // 初始生成一些轨道段
  updateRailSegments(0, true)
  updateRailSegments(0, false)
}

// 创建列车（立方体）
function createTrain() {
  const geometry = new THREE.BoxGeometry(3, 2, 6)
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
  train = new THREE.Mesh(geometry, material)
  train.castShadow = true
  
  // 初始化位置
  if (trackPath) {
    updateTrainPosition(0)
  }
  
  scene.add(train)
}

// 更新列车位置
function updateTrainPosition(progress) {
  if (!trackPath || !train) return
  
  // 确保progress在0-1范围内
  progress = Math.max(0, Math.min(1, progress))
  
  // 获取路径上的点和切线
  const point = trackPath.getPoint(progress)
  const tangent = trackPath.getTangent(progress).normalize()
  
  // 设置列车位置，提高y轴位置使列车在轨道上
  train.position.copy(point)
  train.position.y = 1.5 // 立方体高度的一半加上一些偏移
  
  // 设置列车朝向（沿轨道方向）
  const up = new THREE.Vector3(0, 1, 0)
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
  train.matrix.lookAt(point, point.clone().add(tangent), up)
  train.quaternion.setFromRotationMatrix(train.matrix)
}

// 创建地面
function createGround() {
  const geometry = new THREE.PlaneGeometry(1000, 1000)
  const material = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.8
  })
  const ground = new THREE.Mesh(geometry, material)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  
  scene.add(ground)
}

// 添加辅助网格
function addGridHelper() {
  const gridHelper = new THREE.GridHelper(5000, 50, 0xcccccc, 0xeeeeee)
  scene.add(gridHelper)
}

// 窗口大小变化处理
function onWindowResize() {
  if (!camera || !renderer || !canvasContainer.value) return
  
  camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
}

// 动画循环
function animate() {
  animationId.value = requestAnimationFrame(animate)
  
  // 更新控制器
  if (controls) {
    controls.update()
  }
  
  // 更新列车位置（如果正在动画）
  if (isAnimating.value && trackPath) {
    animationProgress.value += 0.001 * trainSpeed.value
    if (animationProgress.value > 1) {
      animationProgress.value = 0
    }
    updateTrainPosition(animationProgress.value)
    
    // 更新轨道段 - 根据列车当前位置动态生成和销毁轨道
    updateRailSegments(animationProgress.value, true) // 更新左侧轨道
    updateRailSegments(animationProgress.value, false) // 更新右侧轨道
    
    // 相机跟随列车移动 - 使用平滑插值
    if (train) {
      // 获取列车的位置和朝向
      const trainPosition = train.position.clone()
      const trainDirection = new THREE.Vector3()
      train.getWorldDirection(trainDirection)
      
      // 计算目标相机位置：列车后方上方
      const cameraOffset = new THREE.Vector3(-15, 10, -30) // 调整这个偏移量可以改变相机视角
      const rotatedOffset = cameraOffset.applyQuaternion(train.quaternion)
      const targetCameraPosition = trainPosition.clone().add(rotatedOffset)
      
      // 计算目标看向点：列车前方一点
      const targetLookAtPoint = trainPosition.clone().add(trainDirection.multiplyScalar(10))
      
      // 平滑插值移动相机 - 0.1是插值因子，值越小过渡越平滑但反应越慢
      const lerpFactor = 0.1
      camera.position.lerp(targetCameraPosition, lerpFactor)
      
      // 平滑更新看向点 - 使用lookAt的替代方法以实现平滑效果
      // 创建一个临时向量存储当前看向点
      const currentLookAt = new THREE.Vector3()
      // 计算当前相机看向的方向
      const cameraDirection = new THREE.Vector3()
      camera.getWorldDirection(cameraDirection)
      // 计算当前看向点
      const distance = camera.position.distanceTo(targetLookAtPoint)
      currentLookAt.copy(camera.position).add(cameraDirection.multiplyScalar(distance))
      // 平滑过渡查看点
      const lerpedLookAt = new THREE.Vector3().lerpVectors(currentLookAt, targetLookAtPoint, lerpFactor)
      camera.lookAt(lerpedLookAt)
      
      // 平滑更新控制器目标
      if (controls) {
        controls.target.lerp(trainPosition, lerpFactor)
      }
    }
  } else if (!isAnimating.value && trackPath) {
    // 即使停止动画，也需要确保当前位置的轨道段已加载
    updateRailSegments(animationProgress.value, true)
    updateRailSegments(animationProgress.value, false)
  }
  
  // 渲染场景
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
  
  // 更新小地图
  updateMinimap()
}

// 新增：更新小地图
function updateMinimap() {
  const canvas = document.getElementById('minimapCanvas')
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  drawMinimap(ctx, canvas.width, canvas.height)
}

// 开始动画
function startAnimation() {
  isAnimating.value = true
}

// 停止动画
function stopAnimation() {
  isAnimating.value = false
}

// 重置位置
function resetPosition() {
  stopAnimation()
  animationProgress.value = 0
  updateTrainPosition(0)
  
  // 重置相机位置到初始值
  if (camera) {
    camera.position.set(0, 50, 100)
    camera.lookAt(0, 0, 0)
  }
  
  // 重置控制器目标
  if (controls) {
    controls.target.set(0, 0, 0)
    controls.update()
  }
}

// 组件挂载时初始化
onMounted(() => {
  initThreeScene()
  
  // 初始化小地图
  initMinimap()
})

// 组件卸载时清理
onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
  
  if (controls) {
    controls.dispose()
  }
  
  if (renderer) {
    renderer.dispose()
  }
  
  window.removeEventListener('resize', onWindowResize)
})

// 新增：初始化小地图
function initMinimap() {
  // 获取canvas元素
  const canvas = document.getElementById('minimapCanvas')
  if (!canvas) return
  
  // 获取2D渲染上下文
  const ctx = canvas.getContext('2d')
  
  // 设置canvas样式
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  
  // 初始绘制小地图
  drawMinimap(ctx, canvas.width, canvas.height)
}

// 新增：绘制小地图
function drawMinimap(ctx, width, height) {
  if (!trackPath) return
  
  // 清除画布
  ctx.clearRect(0, 0, width, height)
  
  // 1. 采样路径点
  const samples = []
  const numSamples = 200 // 采样点数量
  const trackWidth = 1.435 // 标准轨距
  
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const point = trackPath.getPoint(t)
    const tangent = trackPath.getTangent(t).normalize()
    
    // 计算垂直于切线的方向
    const normal = new THREE.Vector3(
      -tangent.z,
      0,
      tangent.x
    ).normalize()
    
    // 计算左右轨道位置
    const leftPoint = point.clone().add(normal.multiplyScalar(trackWidth / 2))
    const rightPoint = point.clone().add(normal.multiplyScalar(-trackWidth / 2))
    
    samples.push({
      center: { x: point.x, y: point.z }, // 注意：将z坐标映射到2D的y坐标
      left: { x: leftPoint.x, y: leftPoint.z },
      right: { x: rightPoint.x, y: rightPoint.z }
    })
  }
  
  // 2. 计算坐标边界
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  samples.forEach(sample => {
    minX = Math.min(minX, sample.left.x, sample.center.x, sample.right.x)
    minY = Math.min(minY, sample.left.y, sample.center.y, sample.right.y)
    maxX = Math.max(maxX, sample.left.x, sample.center.x, sample.right.x)
    maxY = Math.max(maxY, sample.left.y, sample.center.y, sample.right.y)
  })
  
  // 添加一些边距
  const margin = 20
  minX -= margin
  minY -= margin
  maxX += margin
  maxY += margin
  
  // 3. 计算缩放和偏移
  const contentWidth = maxX - minX
  const contentHeight = maxY - minY
  const scale = Math.min(
    (width - 2 * margin) / contentWidth,
    (height - 2 * margin) / contentHeight
  )
  const offsetX = margin + (width - 2 * margin - contentWidth * scale) / 2
  const offsetY = margin + (height - 2 * margin - contentHeight * scale) / 2
  
  // 4. 绘制网格背景
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 0.5
  
  const gridSize = 50 // 网格大小
  const gridCountX = Math.ceil(contentWidth / gridSize)
  const gridCountY = Math.ceil(contentHeight / gridSize)
  
  for (let i = 0; i <= gridCountX; i++) {
    const x = minX + i * gridSize
    const screenX = offsetX + (x - minX) * scale
    ctx.beginPath()
    ctx.moveTo(screenX, offsetY)
    ctx.lineTo(screenX, offsetY + contentHeight * scale)
    ctx.stroke()
  }
  
  for (let i = 0; i <= gridCountY; i++) {
    const y = minY + i * gridSize
    const screenY = offsetY + (y - minY) * scale
    ctx.beginPath()
    ctx.moveTo(offsetX, screenY)
    ctx.lineTo(offsetX + contentWidth * scale, screenY)
    ctx.stroke()
  }
  
  // 5. 绘制左右轨道
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
  
  // 绘制左侧轨道
  ctx.beginPath()
  for (let i = 0; i < samples.length; i++) {
    const x = offsetX + (samples[i].left.x - minX) * scale
    const y = offsetY + (samples[i].left.y - minY) * scale
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()
  
  // 绘制右侧轨道
  ctx.beginPath()
  for (let i = 0; i < samples.length; i++) {
    const x = offsetX + (samples[i].right.x - minX) * scale
    const y = offsetY + (samples[i].right.y - minY) * scale
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()
  
  // 6. 绘制中心线（可选）
  ctx.strokeStyle = '#999999'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  
  ctx.beginPath()
  for (let i = 0; i < samples.length; i++) {
    const x = offsetX + (samples[i].center.x - minX) * scale
    const y = offsetY + (samples[i].center.y - minY) * scale
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()
  
  // 重置线条样式
  ctx.setLineDash([])
  
  // 7. 绘制列车位置标记
  drawTrainMarker(ctx, animationProgress.value, minX, minY, scale, offsetX, offsetY)
}

// 新增：绘制列车位置标记
function drawTrainMarker(ctx, progress, minX, minY, scale, offsetX, offsetY) {
  if (!trackPath) return
  
  // 确保progress在0-1范围内
  progress = Math.max(0, Math.min(1, progress))
  
  // 获取列车在路径上的位置
  const point = trackPath.getPoint(progress)
  const tangent = trackPath.getTangent(progress).normalize()
  
  // 计算屏幕坐标
  const screenX = offsetX + (point.x - minX) * scale
  const screenY = offsetY + (point.z - minY) * scale // 注意：z坐标映射到2D的y坐标
  
  // 计算列车朝向（旋转角度）
  const angle = Math.atan2(tangent.z, tangent.x)
  
  ctx.save()
  
  // 移动到列车位置并旋转
  ctx.translate(screenX, screenY)
  ctx.rotate(angle)
  
  // 绘制列车标记（使用简单的三角形表示）
  const markerSize = 8
  
  // 列车主体（三角形）
  ctx.beginPath()
  ctx.moveTo(markerSize, 0)
  ctx.lineTo(-markerSize/2, markerSize/2)
  ctx.lineTo(-markerSize/2, -markerSize/2)
  ctx.closePath()
  
  // 填充和描边
  ctx.fillStyle = '#ff0000'
  ctx.fill()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  ctx.stroke()
  
  // 可选：添加方向指示器（小圆点）
  ctx.beginPath()
  ctx.arc(markerSize/2, 0, markerSize/4, 0, 2 * Math.PI)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  
  ctx.restore()
  
  // 可选：添加进度文本
  ctx.font = '12px Arial'
  ctx.fillStyle = '#333333'
  ctx.textAlign = 'center'
  ctx.fillText(`${Math.round(progress * 100)}%`, screenX, screenY - 15)
}
</script>

<style scoped>
.track-inspection-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.inspection-header {
  background-color: #333;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.inspection-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.inspection-controls {
  display: flex;
  gap: 1rem;
}

.inspection-controls button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.inspection-controls button:hover:not(:disabled) {
  background-color: #45a049;
}

.inspection-controls button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.inspection-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  background-color: #000;
  position: relative;
}

.inspection-info {
  width: 300px;
  background-color: white;
  padding: 1.5rem;
  box-shadow: -2px 0 4px rgba(0,0,0,0.1);
  overflow-y: auto;
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
</style>