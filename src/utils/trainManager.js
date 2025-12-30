import * as THREE from 'three'
import { trackStore } from '../store/trackStore'

let trains = [] // 存储所有车体
let trackPath = null
let trackLength = 0

// 创建列车
export function createTrain(scene, trackPathRef, trackLengthRef) {
  // 保存轨道路径和长度引用
  trackPath = trackPathRef
  trackLength = trackLengthRef
  
  // 获取车辆参数
  const vehicleParams = getVehicleParams()
  const { trainCount } = vehicleParams
  
  // 清空现有车体
  trains.forEach(train => {
    scene.remove(train)
    if (train.geometry) train.geometry.dispose()
    if (train.material) train.material.dispose()
  })
  trains = []
  
  // 创建几何体
  const geometry = new THREE.BoxGeometry(3, 2, 6)
  
  // 根据trainCount创建多个车体，使用不同颜色区分
  for (let i = 0; i < trainCount; i++) {
    // 使用HSL颜色空间创建不同颜色的材质
    const hue = (i / trainCount) * 360
    const material = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(`hsl(${hue}, 100%, 50%)`) 
    })
    
    const train = new THREE.Mesh(geometry, material)
    train.castShadow = true
    trains.push(train)
    scene.add(train)
  }
  
  // 初始化位置
  if (trackPath) {
    updateTrainPosition(0)
  }
  
  return trains
}

// 更新列车位置
export function updateTrainPosition(progress) {
  if (!trackPath || !trains || trains.length === 0) return
  
  // 确保progress在0-1范围内
  progress = Math.max(0, Math.min(1, progress))
  
  // 获取车辆参数
  const { trainSpacing } = getVehicleParams()
  
  // 计算每节车厢之间的间距比例
  const spacingRatio = trainSpacing / trackLength
  
  // 更新所有车体的位置
  for (let i = 0; i < trains.length; i++) {
    const carProgress = progress - (i * spacingRatio)
    
    // 处理循环边界
    let adjustedProgress = carProgress
    if (adjustedProgress < 0) {
      adjustedProgress += 1
    }
    
    // 获取路径上的点和切线
    const point = trackPath.getPoint(adjustedProgress)
    // 添加空值检查，确保切线不为null
    let tangent = trackPath.getTangentAt(adjustedProgress)
    if (!tangent) {
      // 如果切线为null，使用默认的切线向量（沿X轴正方向）
      tangent = new THREE.Vector3(1, 0, 0)
    } else {
      tangent = tangent.normalize()
    }
    
    // 设置列车位置，提高y轴位置使列车在轨道上
    const train = trains[i]
    train.position.copy(point)
    train.position.y = 1.5 // 立方体高度的一半加上一些偏移
    
    // 设置列车朝向（沿轨道方向）
    const up = new THREE.Vector3(0, 1, 0)
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
    train.matrix.lookAt(point, point.clone().add(tangent), up)
    train.quaternion.setFromRotationMatrix(train.matrix)
  }
}

// 从trackStore获取车辆参数
function getVehicleParams() {
  return trackStore.getVehicleParams()
}

// 获取列车数组
export function getTrains() {
  return trains
}

// 设置轨道路径和长度
export function setTrackInfo(path, length) {
  trackPath = path
  trackLength = length
}

// 清空列车
export function clearTrains(scene) {
  trains.forEach(train => {
    scene.remove(train)
    if (train.geometry) train.geometry.dispose()
    if (train.material) train.material.dispose()
  })
  trains = []
}