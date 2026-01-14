<template>
  <div class="wheel-rail-contact-container">
    <div class="viewer-container">
      <div ref="canvasContainer" class="canvas-container"></div>
      <div class="controls-container">
        <el-button @click="toggleAnimation">{{ isAnimating ? '停止运行' : '开始运行' }}</el-button>
        <el-button @click="resetAnimation">重置位置</el-button>
        <el-checkbox v-model="cameraFollow" style="margin-left: 10px;">相机跟随</el-checkbox>
        <el-slider v-model="progress" :min="0" :max="1" :step="0.001" @change="onProgressChange"></el-slider>
      </div>
    </div>
    <div class="side-panel">
      <div class="section">
        <h4>轮轨几何关系</h4>
        <el-form :model="wheelSetParams" label-width="100px">
          <el-form-item label="轮对横移量">
            <el-input-number v-model="wheelSetParams.axleLength" :min="0.5" :max="2" :step="0.1" @change="updateWheelSet"></el-input-number>
          </el-form-item>
          <el-form-item label="轮对I摇头角">
            <el-input-number v-model="wheelSetParams.wheelRadius" :min="0.2" :max="1" :step="0.01" @change="updateWheelSet"></el-input-number>
          </el-form-item>
          <el-form-item label="轮轨接触角">
            <el-input-number v-model="wheelSetParams.axleRadius" :min="0.03" :max="0.1" :step="0.005" @change="updateWheelSet"></el-input-number>
          </el-form-item>
        </el-form>
      </div>
      <div class="section">
        <h4>关注轮轴位置</h4>
        <div class="camera-target-buttons"> 
           <el-button @click="setCameraTarget('BOG1-AX1')" :class="{ 'active': cameraTarget === 'BOG1-AX1' }">转向架1-轴1</el-button> 
           <el-button @click="setCameraTarget('BOG1-AX2')" :class="{ 'active': cameraTarget === 'BOG1-AX2' }">转向架1-轴2</el-button> 
           <el-button @click="setCameraTarget('BOG2-AX1')" :class="{ 'active': cameraTarget === 'BOG2-AX1' }">转向架2-轴1</el-button> 
           <el-button @click="setCameraTarget('BOG2-AX2')" :class="{ 'active': cameraTarget === 'BOG2-AX2' }">转向架2-轴2</el-button> 
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

const canvasContainer = ref(null)
let scene, camera, renderer, controls
let baseTrackPath, leftTrackPath, rightTrackPath
let leftRail, rightRail
let wheelSet, wheels, axle
let secondWheelSet, secondWheels
let thirdWheelSet, thirdWheels
let fourthWheelSet, fourthWheels
let sleepers = []
let bogie = null
let secondBogie = null

// 轨道元素管理
let trackElements = {
  bases: [],
  sleepers: [],
  rails: [],
  ground: [],
  grids: []
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
let cameraTarget = ref('BOG1-AX1') // 默认跟踪第一个转向架的第一个轴
let cameraTargetPosition = new THREE.Vector3(-3, 8, -10) // 初始化为与相机位置一致
let cameraTargetLookAt = new THREE.Vector3(0, 2, 0) // 初始化为默认目标点
let controlsTarget = new THREE.Vector3(0, 2, 0) // 初始化为默认目标点

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
  camera.position.set(-3, 8, -10) // 与动态相机位置一致
  
  // 初始化相机目标位置
  cameraTargetPosition.set(-3, 8, -10)
  cameraTargetLookAt.set(0, 2, 0)
  controlsTarget.set(0, 2, 0)
  camera.lookAt(0, 0, 0)
  
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
  createGround()
  
  // 创建轨道
  createTrack()
  
  // 创建轮对
  createWheelSet()
  
  // 渲染场景
  animate()
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
function createGround() {
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
  // 调整钢轨位置，使其位于轨枕上方
  rail.position.y = 0.1 + 0.2 + 0.2 + 0.23 // 钢轨位于指定高度
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
    color: 0x8b8b8b, // 灰色混凝土
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
    color: 0xd9d9d9, // 浅灰色
    metalness: 0.1,
    roughness: 0.8
  })
  
  // 初始化共享几何体和材质
  if (!sharedGeometries.base) {
    sharedGeometries.base = new THREE.BoxGeometry(baseWidth, baseThickness, baseHeight)
  }
  if (!sharedMaterials.base) {
    sharedMaterials.base = new THREE.MeshStandardMaterial({
      color: 0x8b8b8b, // 灰色混凝土
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
      color: 0xd9d9d9, // 浅灰色
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
  const segmentPath = new THREE.CurvePath()
  const segmentSteps = 50
  
  for (let i = 0; i <= segmentSteps; i++) {
    const progress = startProgress + (endProgress - startProgress) * (i / segmentSteps)
    const point = trackPath.getPoint(progress)
    
    if (i > 0) {
      const prevPoint = segmentPath.curves[segmentPath.curves.length - 1].v2
      segmentPath.add(new THREE.LineCurve3(prevPoint, point))
    } else {
      // 第一个点，创建一个临时线段
      segmentPath.add(new THREE.LineCurve3(point, point))
    }
  }
  
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
  // 调整钢轨位置，使其位于轨枕上方
  railSegment.position.y = 0.1 + 0.2 + 0.2 + 0.23 // 钢轨位于指定高度
  
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
      color: 0xffffff,
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
  
  // 更新网格线
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

// 开始运行
function startAnimation() {
  isAnimating.value = true
}

// 停止运行
function stopAnimation() {
  isAnimating.value = false
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
  background: linear-gradient(135deg, #8aceff 0%, #ffffff 100%);
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

.camera-target-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 10px;
  margin-top: 10px;
  width: 100%;
}

.camera-target-buttons .el-button {
  background-color: #0075ff;
  color: white;
  border: none;
  width: 100%;
  min-width: 0;
  text-align: center;
}

.camera-target-buttons .el-button:hover {
  background-color: #1890ff;
}

.camera-target-buttons .el-button.active {
  background-color: #0050b3;
}

.section {
  margin-bottom: 20px;
}

.section h4 {
  margin-bottom: 10px;
  color: #333;
}
</style>