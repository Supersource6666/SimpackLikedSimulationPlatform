import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// 全局变量
let scene, camera, renderer, controls
let directionalLight, fillLight
let ground

// 初始化Three.js场景
export function initThreeScene(container) {
  // 创建场景
  scene = new THREE.Scene()
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    10000
  )
  camera.position.set(0, 5, 15)
  camera.lookAt(0, 0, 0)
  
  // 创建渲染器（启用alpha通道以支持容器背景）
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)
  
  // 设置容器背景为渐变色（从8aceff到白色）
  container.style.background = 'linear-gradient(135deg, #8aceff 0%, #ffffff 100%)'
  
  // 创建轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 1, 0)
  
  // 添加窗口大小调整事件监听
  window.addEventListener('resize', onWindowResize)
  
  return { scene, camera, renderer, controls }
}

// 添加光源
export function addLights() {
  if (!scene) return
  
  // 环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5) // 增加强度
  scene.add(ambientLight)
  
  // 平行光（模拟太阳光）
  directionalLight = new THREE.DirectionalLight(0xffffcc, 0.8) // 增加强度
  directionalLight.position.set(100, 100, 100)
  directionalLight.castShadow = true
  scene.add(directionalLight)
  
  // 补光
  fillLight = new THREE.DirectionalLight(0xccccff, 0.3) // 增加强度
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
export function createGround() {
  if (!scene) return
  
  const geometry = new THREE.PlaneGeometry(1000, 1000)
  const material = new THREE.MeshStandardMaterial({
    color: 0x000000, // 改为黑色
    roughness: 0.9,
    metalness: 0.1,
    transparent: true,
    opacity: 0.3 // 增大透明度
  })
  ground = new THREE.Mesh(geometry, material)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  
  scene.add(ground)
}

// 添加网格辅助线
export function addGridHelper() {
  if (!scene) return
  
  const gridHelper = new THREE.GridHelper(1000, 50, 0x446644, 0x446644)
  gridHelper.position.y = 0.01
  scene.add(gridHelper)
}

// 窗口大小调整事件处理
export function onWindowResize() {
  if (!camera || !renderer) return
  
  const container = renderer.domElement.parentElement
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

// 相机跟随列车
export function followTrain(trains) {
  if (!camera || !controls || !trains || trains.length === 0) {
    console.log('followTrain: 缺少必要参数', { camera, controls, trains })
    return
  }
  
  // 获取第一辆车的位置
  const train = trains[0]
  const trainPosition = train.position
  
  // 计算相机目标位置
  const cameraOffset = new THREE.Vector3(-60, 20, -60)
  
  // 根据列车数量调整相机距离
  if (trains.length >= 4) {
    const distanceMultiplier = 1 + (trains.length - 3) * 0.3 // 30% increase per additional car
    cameraOffset.set(-60 * distanceMultiplier, 20 * distanceMultiplier, -60 * distanceMultiplier)
  }
  
  // 设置相机位置
  camera.position.lerp(trainPosition.clone().add(cameraOffset), 0.1)
  
  // 设置相机看向列车
  controls.target.lerp(trainPosition, 0.1)
  controls.update()
  
  // 地面跟随相机视角（移除了地面平移逻辑）
  // 现在我们将实现地面跟随相机视角扩展生成和销毁的功能
  updateGroundForCameraView()
}

// 地面跟随相机视角扩展生成和销毁
function updateGroundForCameraView() {
  if (!camera || !scene) return
  
  // 计算相机视野范围
  const distance = camera.position.distanceTo(controls.target)
  const viewportHeight = 2 * distance * Math.tan(camera.fov * Math.PI / 360)
  const viewportWidth = viewportHeight * camera.aspect
  
  // 计算所需地面大小（稍微大于视野范围）
  const groundSize = Math.max(viewportWidth, viewportHeight) * 1.5
  
  // 如果地面不存在，创建一个
  if (!ground) {
    const geometry = new THREE.PlaneGeometry(groundSize, groundSize)
    const material = new THREE.MeshStandardMaterial({
      color: 0x000000, // 改为黑色
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3 // 与之前地面相同的透明度
    })
    ground = new THREE.Mesh(geometry, material)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)
    
    // 添加地面网格线，与之前地面相同
    addGroundGrid(groundSize)
  } 
  // 如果地面存在但大小不合适，更新大小
  else if (Math.abs(ground.geometry.parameters.width - groundSize) > 10) {
    // 移除旧地面和网格线
    removeGroundGrid()
    scene.remove(ground)
    ground.geometry.dispose()
    ground.material.dispose()
    
    // 创建新地面
    const geometry = new THREE.PlaneGeometry(groundSize, groundSize)
    const material = new THREE.MeshStandardMaterial({
      color: 0x000000, // 改为黑色
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3 // 与之前地面相同的透明度
    })
    ground = new THREE.Mesh(geometry, material)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)
    
    // 添加新的地面网格线
    addGroundGrid(groundSize)
  }
  
  // 将地面位置设置在相机看向的目标点
  if (ground) {
    ground.position.x = controls.target.x
    ground.position.z = controls.target.z
    ground.position.y = 0 // 保持在地面高度
  }
  
  // 确保网格线也跟随移动
  if (groundGrid) {
    groundGrid.position.x = controls.target.x
    groundGrid.position.z = controls.target.z
  }
}

// 地面网格线对象
let groundGrid = null

// 添加地面网格线
function addGroundGrid(size) {
  if (!scene) return
  
  // 使用与之前相同的网格线设置
  groundGrid = new THREE.GridHelper(1000, 50, 0x446644, 0x446644)
  groundGrid.position.y = 0.01
  scene.add(groundGrid)
}

// 移除地面网格线
function removeGroundGrid() {
  if (groundGrid && scene) {
    scene.remove(groundGrid)
    groundGrid = null
  }
}

// 渲染场景
export function renderScene() {
  if (!renderer || !scene || !camera) return
  
  renderer.render(scene, camera)
}

// 更新控制器
export function updateControls() {
  if (!controls) return
  
  controls.update()
}

// 清理场景
export function cleanupScene() {
  if (renderer) {
    // 移除窗口大小调整事件监听
    window.removeEventListener('resize', onWindowResize)
    
    // 清理渲染器
    const container = renderer.domElement.parentElement
    if (container) {
      container.removeChild(renderer.domElement)
    }
    
    renderer.dispose()
  }
  
  // 重置全局变量
  scene = null
  camera = null
  renderer = null
  controls = null
}