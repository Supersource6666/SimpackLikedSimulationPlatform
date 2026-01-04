<template>
  <div class="wheel-rail-contact-container">
    <div class="viewer-container">
      <div ref="canvasContainer" class="canvas-container"></div>
      <div class="controls-container">
        <el-button @click="startAnimation" :disabled="isAnimating">开始动画</el-button>
        <el-button @click="stopAnimation" :disabled="!isAnimating">停止动画</el-button>
        <el-button @click="resetAnimation">重置</el-button>
        <el-checkbox v-model="cameraFollow" style="margin-left: 10px;">相机跟随</el-checkbox>
        <el-slider v-model="progress" :min="0" :max="1" :step="0.001" @change="onProgressChange"></el-slider>
      </div>
    </div>
    <div class="side-panel">
      <div class="section">
        <h4>轮对参数</h4>
        <el-form :model="wheelSetParams" label-width="100px">
          <el-form-item label="轮轴长度">
            <el-input-number v-model="wheelSetParams.axleLength" :min="0.5" :max="2" :step="0.1" @change="updateWheelSet"></el-input-number>
          </el-form-item>
          <el-form-item label="车轮半径">
            <el-input-number v-model="wheelSetParams.wheelRadius" :min="0.2" :max="1" :step="0.01" @change="updateWheelSet"></el-input-number>
          </el-form-item>
          <el-form-item label="轮轴半径">
            <el-input-number v-model="wheelSetParams.axleRadius" :min="0.03" :max="0.1" :step="0.005" @change="updateWheelSet"></el-input-number>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { trackStore } from '../store/trackStore'
import { createTrackPathFromSegments, estimatePathLength } from '../utils/trackManager'

const canvasContainer = ref(null)
let scene, camera, renderer, controls
let baseTrackPath, leftTrackPath, rightTrackPath
let leftRail, rightRail
let wheelSet, wheels, axle
let animationId
let isAnimating = ref(false)
let progress = ref(0)
let cameraFollow = ref(true)
let cameraTargetPosition = new THREE.Vector3()
let cameraTargetLookAt = new THREE.Vector3()
let controlsTarget = new THREE.Vector3()

const wheelSetParams = reactive({
  axleLength: 1.435, // 标准轨距
  wheelRadius: 0.45, // 标准车轮半径
  axleRadius: 0.05  // 轮轴半径
})

// 初始化3D场景
function initScene() {
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
  camera.position.set(0, 5, 15)
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
  controls.target.set(0, 1, 0)
  
  // 添加光源
  addLights()
  
  // 创建地面
  createGround()
  
  // 创建轨道
  createTrack()
  
  // 创建轮对
  createWheelSet()
  
  // 渲染场景
  animate()
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
function createGround() {
  const geometry = new THREE.PlaneGeometry(1000, 1000)
  const material = new THREE.MeshStandardMaterial({
    color: 0x668866,
    roughness: 0.9,
    metalness: 0.1
  })
  const ground = new THREE.Mesh(geometry, material)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  
  // 添加地面网格线
  const groundGridHelper = new THREE.GridHelper(1000, 50, 0x446644, 0x446644)
  groundGridHelper.position.y = 0.01
  scene.add(groundGridHelper)
  
  scene.add(ground)
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
  
  return rail
}

// 创建轨道偏移路径
function offsetTrackPath(basePath, offsetDistance) {
  const offsetPath = new THREE.CurvePath()
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
    
    if (i > 0) {
      const prevPoint = offsetPath.curves[offsetPath.curves.length - 1].v2
      offsetPath.add(new THREE.LineCurve3(prevPoint, offsetPoint))
    } else {
      // 第一个点，创建一个临时线段
      offsetPath.add(new THREE.LineCurve3(offsetPoint, offsetPoint))
    }
  }
  
  return offsetPath
}

// 创建轨道
function createTrack() {
  // 创建基础轨道路径
  const trackSegments = trackStore.getHorizontalSegments()
  baseTrackPath = createTrackPathFromSegments(trackSegments)
  
  // 创建左右轨道（偏移标准轨距）
  const gauge = 1.435 // 标准轨距
  leftTrackPath = offsetTrackPath(baseTrackPath, -gauge / 2)
  rightTrackPath = offsetTrackPath(baseTrackPath, gauge / 2)
  
  // 创建左右钢轨
  leftRail = createRail(leftTrackPath, 0x333333)
  rightRail = createRail(rightTrackPath, 0x444444)
  
  scene.add(leftRail)
  scene.add(rightRail)
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
    color: 0x888888,
    metalness: 0.6,
    roughness: 0.4
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
    wheelSetParams.axleLength,
    16
  )
  const axleMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    metalness: 0.5,
    roughness: 0.3
  })
  
  axle = new THREE.Mesh(axleGeometry, axleMaterial)
  axle.rotation.z = Math.PI / 2
  axle.castShadow = true
  wheelSet.add(axle)
  
  // 将轮对添加到场景
  scene.add(wheelSet)
  
  // 更新轮对位置
  updateWheelSetPosition(progress.value)
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
  wheelSet.position.y = wheelSetParams.wheelRadius + 0.01 // 轨道高度 + 车轮半径
  
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
  
  // 相机跟随轮对
  if (cameraFollow.value) {
    // 计算相机目标位置（在轮对后方一定距离）
    const cameraOffset = new THREE.Vector3(0, 5, -15) // 相机相对于轮对的位置偏移
    cameraOffset.applyQuaternion(wheelSet.quaternion) // 应用轮对的旋转
    
    // 设置相机目标位置
    cameraTargetPosition.copy(wheelSet.position.clone().add(cameraOffset))
    
    // 设置相机目标朝向点
    const lookAtPoint = wheelSet.position.clone().add(tangent.multiplyScalar(10))
    lookAtPoint.y = wheelSet.position.y // 保持水平视线高度
    cameraTargetLookAt.copy(lookAtPoint)
    
    // 设置轨道控制器目标点
    controlsTarget.copy(wheelSet.position)
  }
}

// 更新轮对参数
function updateWheelSet() {
  if (wheelSet) {
    // 移除旧的轮对
    scene.remove(wheelSet)
    
    // 创建新的轮对
    createWheelSet()
  }
}

// 动画循环
function animate() {
  animationId = requestAnimationFrame(animate)
  
  if (isAnimating.value) {
    progress.value += 0.001
    if (progress.value > 1) {
      progress.value = 0
    }
    updateWheelSetPosition(progress.value)
  }
  
  // 相机平滑跟随
  if (cameraFollow.value) {
    const smoothFactor = 0.08 // 平滑过渡因子，值越小过渡越平滑
    
    // 平滑更新相机位置
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
  }
  
  controls.update()
  renderer.render(scene, camera)
}

// 开始动画
function startAnimation() {
  isAnimating.value = true
}

// 停止动画
function stopAnimation() {
  isAnimating.value = false
}

// 重置动画
function resetAnimation() {
  isAnimating.value = false
  progress.value = 0
  updateWheelSetPosition(0)
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
}

// 组件挂载时初始化
onMounted(() => {
  initScene()
  window.addEventListener('resize', onWindowResize)
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
})
</script>

<style scoped>
.wheel-rail-contact-container {
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
}

.canvas-container {
  flex: 1;
  background-color: #f0f0f0;
  overflow: hidden;
}

.controls-container {
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #ddd;
  display: flex;
  align-items: center;
  gap: 10px;
}

.side-panel {
  width: 300px;
  background-color: #fff;
  border-left: 1px solid #ddd;
  padding: 20px;
  overflow-y: auto;
}

.section {
  margin-bottom: 20px;
}

.section h4 {
  margin-bottom: 10px;
  color: #333;
}
</style>