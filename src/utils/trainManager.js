import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { trackStore } from '../store/trackStore'

let trains = [] // 存储所有车体
let trackPath = null
let trackLength = 0
const loader = new GLTFLoader()

// 创建列车
export function createTrain(scene, trackPathRef, trackLengthRef) {
  // 保存轨道路径和长度引用
  trackPath = trackPathRef
  trackLength = trackLengthRef
  
  // 获取车辆参数
  const vehicleParams = trackStore.getVehicleParams()
  const { trainCount } = vehicleParams
  
  // 清空现有车体
  trains.forEach(train => {
    scene.remove(train)
  })
  trains = []
  
  // 加载并创建车体
  for (let i = 0; i < trainCount; i++) {
    // 决定使用哪个模型
    const isFirst = i === 0
    const isLast = i === trainCount - 1 // 不管车辆数量多少，最后一节车都使用motor_car_transparent.glb
    const modelPath = (isFirst || isLast) 
      // ? '/models_3d/motor_car_transparent.glb' 
      ? '/models_3d/gao.glb' 
      : '/models_3d/tuo.glb'
    
    // console.log(`准备加载第${i+1}个车厢模型 (${isFirst ? '车头' : isLast ? '车尾' : '中间'}): ${modelPath}`)
    
    // 保存当前车辆的位置信息，用于回调函数中使用
    const carIndex = i
    const carIsFirst = isFirst
    const carIsLast = isLast
    
    // 直接使用GLTFLoader加载模型
    loader.load(
      modelPath,
      (gltf) => {
        // console.log('模型加载成功:', modelPath)
        
        const trainModel = gltf.scene
        // console.log('模型包含的子对象数量:', trainModel.children.length)
        
        // 计算模型的边界框，以了解模型的实际尺寸
        const box = new THREE.Box3().setFromObject(trainModel)
        const size = new THREE.Vector3()
        box.getSize(size)
        // console.log('模型尺寸:', size)
        // console.log('模型边界框最小点:', box.min)
        // console.log('模型边界框最大点:', box.max)
        
        // 设置模型初始状态，校准模型轴向
        // 假设模型长轴方向沿Z轴，这里进行校准
        trainModel.rotation.set(0, 0, 0) // 动力学参数初始旋转
        // 添加模型轴向校准，确保模型长轴与预期方向一致
        // 对于GLB模型，可能需要根据模型自身的朝向进行调整
        // 这里假设模型需要绕Y轴旋转90度才能使长轴与X轴一致
        
        // 根据车辆位置设置朝向
        if (carIsFirst) {
          // 车头模型朝向 - 绕自身Y轴旋转180度
          trainModel.rotation.y = Math.PI
        } else if (carIsLast) {
          // 车尾模型朝向（与车头相反）
          trainModel.rotation.y = -Math.PI / 2
        } else {
          // 中间车辆朝向与车头一致
          trainModel.rotation.y = Math.PI / 2
        }
        
        // 计算基础位置
        // 实现从trainSpacing（米）到三维场景单位的线性映射：7米对应25单位
        const { trainSpacing } = trackStore.getVehicleParams()
        const spacingRatio = 25 / 7 // 7米对应25单位的映射比例
        const basePositionX = (trainCount - 1 - carIndex) * -(trainSpacing * spacingRatio)
        const basePositionY = 1.5
        const basePositionZ = 0
        
        // 为头尾车添加位置偏移，补偿模型中心与驾驶室中心的距离差异
        if (carIsFirst || carIsLast) {
          // 头尾车（使用motor_car_transparent.glb）需要位置偏移
          // 根据模型尺寸计算偏移量，确保与中间车间隔统一
          // 头尾车长度约27单位，驾驶室中心靠前
          const offsetDistance = size.z * 0.3 // 偏移量为模型长度的30%
          // console.log('头尾车偏移量:', offsetDistance)
          // 根据车辆位置调整偏移方向
          if (carIsFirst) {
            // 车头需要向前偏移
            trainModel.position.set(basePositionX + offsetDistance, basePositionY, basePositionZ)
          } else {
            // 车尾需要向后偏移
            trainModel.position.set(basePositionX - offsetDistance, basePositionY, basePositionZ)
          }
        } else {
          // 中间车（使用traction_car_transparent.glb）保持正常位置
          // 中间车长度约30单位，不需要偏移
          trainModel.position.set(basePositionX, basePositionY, basePositionZ)
        }
        trainModel.castShadow = true
        
        scene.add(trainModel)
        trains[carIndex] = trainModel // 根据carIndex将模型添加到正确位置，确保数组索引与车辆索引匹配
        // console.log('模型添加到场景，当前列车数量:', trains.length)
        // console.log('列车', carIndex, '类型:', carIsFirst ? '车头 (motor_car_transparent.glb)' : carIsLast ? '车尾 (motor_car_transparent.glb)' : '中间 (traction_car_transparent.glb)')
        // console.log('模型位置:', trainModel.position)
        // console.log('模型类型:', carIsFirst ? '车头' : carIsLast ? '车尾' : '中间')
        // console.log('模型朝向:', trainModel.rotation.y)
        
        // 初始化位置
        // 检查是否所有模型都已加载完成
        const allLoaded = trains.every(train => train !== undefined) && trains.length >= trainCount
        if (trackPath && allLoaded) {
          // console.log('所有模型加载完成，开始初始化位置')
          updateTrainPosition(0)
          // console.log('所有模型加载完成，初始化位置')
        }
      },
      (xhr) => {
        // console.log((xhr.loaded / xhr.total * 100) + '% loaded')
      },
      (error) => {
        // console.error('模型加载失败:', modelPath, error)
        // 如果模型加载失败，创建一个简单的立方体作为替代
        const fallbackGeometry = new THREE.BoxGeometry(3, 2, 6)
        const fallbackMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x3498db 
        })
        const fallbackTrain = new THREE.Mesh(fallbackGeometry, fallbackMaterial)
        fallbackTrain.castShadow = true
        
        // 计算基础位置
        // 实现从trainSpacing（米）到三维场景单位的线性映射：7米对应25单位
        const { trainSpacing } = trackStore.getVehicleParams()
        const spacingRatio = 25 / 7 // 7米对应25单位的映射比例
        const basePositionX = (trainCount - 1 - carIndex) * -(trainSpacing * spacingRatio)
        const basePositionY = 1.5
        const basePositionZ = 0
        
        // 为头尾车添加位置偏移，补偿模型中心与驾驶室中心的距离差异
        if (carIsFirst || carIsLast) {
          // 头尾车（使用motor_car_transparent.glb）需要位置偏移
          // 假设模型长度约27单位，驾驶室中心靠前
          const offsetDistance = 27 * 0.3 // 偏移量为模型长度的30%
          // console.log('头尾车备用模型偏移量:', offsetDistance)
          // 根据车辆位置调整偏移方向
          if (carIsFirst) {
            // 车头需要向前偏移
            fallbackTrain.position.set(basePositionX + offsetDistance, basePositionY, basePositionZ)
          } else {
            // 车尾需要向后偏移
            fallbackTrain.position.set(basePositionX - offsetDistance, basePositionY, basePositionZ)
          }
        } else {
          // 中间车（使用traction_car_transparent.glb）保持正常位置
          // 假设模型长度约30单位，不需要偏移
          fallbackTrain.position.set(basePositionX, basePositionY, basePositionZ)
        }
        
        // 根据车辆位置设置备用模型朝向
        if (carIsFirst) {
          // 车头模型朝向 - 绕自身Y轴旋转180度
          fallbackTrain.rotation.y = Math.PI
        } else if (carIsLast) {
          fallbackTrain.rotation.y = -Math.PI / 2
        } else {
          fallbackTrain.rotation.y = Math.PI / 2
        }
        
        scene.add(fallbackTrain)
        trains[carIndex] = fallbackTrain // 根据carIndex将模型添加到正确位置，确保数组索引与车辆索引匹配
        // console.log('使用立方体替代，当前列车数量:', trains.length)
        // console.log('列车', carIndex, '类型:', carIsFirst ? '车头 (motor_car_transparent.glb)' : carIsLast ? '车尾 (motor_car_transparent.glb)' : '中间 (traction_car_transparent.glb)')
        // console.log('替代模型类型:', carIsFirst ? '车头' : carIsLast ? '车尾' : '中间')
        
        // 初始化位置
        // 检查是否所有模型都已加载完成
        const allLoaded = trains.every(train => train !== undefined) && trains.length >= trainCount
        if (trackPath && allLoaded) {
          // console.log('所有模型加载完成，开始初始化位置')
          updateTrainPosition(0)
          // console.log('所有模型加载完成，初始化位置')
        }
      }
    )
  }
  
  return trains
}

// 更新列车位置
export function updateTrainPosition(progress) {
  if (!trackPath || !trains || trains.length === 0) return
  
  // 确保progress在0-1范围内
  progress = Math.max(0, Math.min(1, progress))
  
  // 获取车辆参数
  const { trainSpacing } = trackStore.getVehicleParams()
  
  // 计算每节车厢之间的间距比例，确保多节车状态下有足够的轴向间隔
  // 对于多节车，需要确保间距足够大以避免车辆重叠
  const baseSpacing = Math.max(trainSpacing, 27.5) // 使用用户设置的间距，不再强制最小间距
  // 限制spacingRatio的最大值，确保车辆位置计算正确
  // 对于n辆车，spacingRatio不应超过1/n，否则会导致位置计算错误
  const maxSpacingRatio = 1 / Math.max(trains.length, 1)
  const spacingRatio = Math.min(baseSpacing / trackLength, maxSpacingRatio)
  
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
    train.position.y = 1.5 // 调整y轴位置，适应模型高度
    
    // 计算车辆朝向，确保车体长轴（假设沿Z轴）与轨道方向完全一致
    // 对于大多数3D模型，长轴通常沿Z轴，需要调整旋转逻辑
    const direction = new THREE.Vector3().copy(tangent)
    const up = new THREE.Vector3(0, 1, 0)
    
    // 创建一个目标点，使模型的Z轴（长轴）指向轨道方向
    const target = new THREE.Vector3().copy(train.position).add(direction)
    
    // 使用lookAt方法，这会使模型的Z轴指向目标点
    train.lookAt(target)
    
    // 对于第一辆车，额外添加180度旋转
    if (i === 0) {
      train.rotation.y += Math.PI // 绕Y轴旋转180度
    }
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
  })
  trains = []
}