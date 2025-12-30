import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let scene, camera, renderer, controls

// 初始化Three.js场景
export function initThreeScene(canvasContainer) {
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    canvasContainer.clientWidth / canvasContainer.clientHeight,
    0.1,
    10000
  )
  camera.position.set(0, 50, 100)
  camera.lookAt(0, 0, 0)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight)
  renderer.shadowMap.enabled = true
  canvasContainer.appendChild(renderer.domElement)
  
  // 创建轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 0, 0)
  
  return { scene, camera, renderer, controls }
}

// 添加光源
export function addLights() {
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

// 创建地面
export function createGround() {
  const geometry = new THREE.PlaneGeometry(1000, 1000)
  const material = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.8
  })
  const ground = new THREE.Mesh(geometry, material)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  
  scene.add(ground)
  return ground
}

// 添加辅助网格
export function addGridHelper() {
  const gridHelper = new THREE.GridHelper(5000, 50, 0xcccccc, 0xeeeeee)
  scene.add(gridHelper)
  return gridHelper
}

// 窗口大小变化处理
export function onWindowResize(canvasContainer) {
  if (!camera || !renderer || !canvasContainer) return
  
  camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight)
}

// 相机跟随列车移动
export function followTrain(trains) {
  if (!camera || !controls || trains.length === 0) return
  
  // 获取第一列车的位置和朝向作为参考
  const train = trains[0]
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

// 渲染场景
export function renderScene() {
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

// 更新控制器
export function updateControls() {
  if (controls) {
    controls.update()
  }
}

// 清理场景资源
export function cleanupScene() {
  if (controls) {
    controls.dispose()
  }
  
  if (renderer) {
    renderer.dispose()
  }
}

// 获取场景相关对象
export function getSceneObjects() {
  return { scene, camera, renderer, controls }
}

// 重置相机位置
export function resetCameraPosition() {
  if (camera) {
    camera.position.set(0, 50, 100)
    camera.lookAt(0, 0, 0)
  }
  
  if (controls) {
    controls.target.set(0, 0, 0)
    controls.update()
  }
}