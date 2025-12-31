import * as THREE from 'three'

let minimapCanvas = null
let minimapCtx = null
let minimapSize = { width: 300, height: 300 }
let minimapScale = 0.5
let mapCenter = { x: 0, y: 0 }
let trackPath = null

// 初始化小地图
export function initMinimap(canvas) {
  minimapCanvas = canvas
  minimapCtx = minimapCanvas.getContext('2d')
  minimapCanvas.width = minimapSize.width
  minimapCanvas.height = minimapSize.height
  minimapCanvas.style.border = '1px solid #ddd'
  minimapCanvas.style.backgroundColor = '#f0f0f0'
  
  return { minimapCanvas, minimapCtx }
}

// 设置小地图大小
export function setMinimapSize(width, height) {
  minimapSize = { width, height }
  if (minimapCanvas) {
    minimapCanvas.width = width
    minimapCanvas.height = height
  }
}

// 设置小地图缩放
export function setMinimapScale(scale) {
  minimapScale = scale
}

// 设置小地图中心
export function setMapCenter(x, y) {
  mapCenter = { x, y }
}

// 设置轨道路径
export function setTrackPath(path) {
  trackPath = path
}

// 将3D坐标转换为小地图2D坐标
function worldToMinimapCoords(worldX, worldZ) {
  const minimapX = (worldX - mapCenter.x) * minimapScale + minimapSize.width / 2
  const minimapY = (-worldZ + mapCenter.y) * minimapScale + minimapSize.height / 2
  return { x: minimapX, y: minimapY }
}

// 绘制小地图
export function drawMinimap(camera, trains) {
  if (!minimapCtx) return
  
  // 清空画布
  minimapCtx.clearRect(0, 0, minimapSize.width, minimapSize.height)
  
  // 绘制轨道
  if (trackPath) {
    minimapCtx.strokeStyle = '#333333'
    minimapCtx.lineWidth = 2
    
    const segments = 2000 // 增加绘制精度，确保边界框计算准确
    minimapCtx.beginPath()
    
    // 计算轨道的边界框，用于自动调整地图中心
    let minX = Infinity, maxX = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const point = trackPath.getPoint(t)
      if (point) {
        minX = Math.min(minX, point.x)
        maxX = Math.max(maxX, point.x)
        minZ = Math.min(minZ, point.z)
        maxZ = Math.max(maxZ, point.z)
      }
    }
    
    // 检查是否成功计算了边界框
    if (minX === Infinity) {
      console.error('小地图：无法计算轨道边界框')
      return
    }
    
    // 自动设置地图中心为轨道的几何中心
    mapCenter.x = (minX + maxX) / 2
    mapCenter.y = (minZ + maxZ) / 2
    
    // 计算合适的缩放比例，确保整个轨道能在小地图内显示
    const trackWidth = maxX - minX
    const trackHeight = maxZ - minZ
    const margin = 60 // 增加边距，确保轨道完全显示
    const mapWidth = minimapSize.width - margin
    const mapHeight = minimapSize.height - margin
    
    // 根据轨道的最大尺寸调整缩放比例，并确保至少有一定的缩放比例
    const scaleX = mapWidth / trackWidth
    const scaleY = mapHeight / trackHeight
    minimapScale = Math.min(scaleX, scaleY) * 0.9 // 再缩小10%，确保完全显示
    
    // 绘制轨道路径
    let firstPoint = true
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const point = trackPath.getPoint(t)
      if (point) {
        const coords = worldToMinimapCoords(point.x, point.z)
        
        if (firstPoint) {
          minimapCtx.moveTo(coords.x, coords.y)
          firstPoint = false
        } else {
          minimapCtx.lineTo(coords.x, coords.y)
        }
      }
    }
    
    if (!firstPoint) {
      minimapCtx.stroke()
    }
  }
  
  // 绘制列车
  if (trains && trains.length > 0) {
    for (let i = 0; i < trains.length; i++) {
      const train = trains[i]
      const coords = worldToMinimapCoords(train.position.x, train.position.z)
      
      // 获取列车颜色
      const material = train.material
      let color = '#ff0000' // 默认颜色
      if (material && material.color) {
        const hexColor = material.color.getHexString()
        color = `#${hexColor}`
      }
      
      // 绘制列车标记
      minimapCtx.fillStyle = color
      minimapCtx.strokeStyle = '#ffffff'
      minimapCtx.lineWidth = 1
      minimapCtx.beginPath()
      minimapCtx.arc(coords.x, coords.y, 3, 0, Math.PI * 2)
      minimapCtx.fill()
      minimapCtx.stroke()
    }
  }
  
  // 绘制相机位置
  if (camera) {
    const cameraCoords = worldToMinimapCoords(camera.position.x, camera.position.z)
    
    // 绘制相机视野范围
    const frustumSize = 50 // 视野大小
    const cameraDirection = new THREE.Vector3()
    camera.getWorldDirection(cameraDirection)
    
    // 计算视野三角形的三个顶点
    const cameraForward = new THREE.Vector3(
      camera.position.x + cameraDirection.x * frustumSize,
      0,
      camera.position.z + cameraDirection.z * frustumSize
    )
    const leftDir = new THREE.Vector3(
      -cameraDirection.z,
      0,
      cameraDirection.x
    )
    const rightDir = new THREE.Vector3(
      cameraDirection.z,
      0,
      -cameraDirection.x
    )
    
    const leftVertex = new THREE.Vector3(
      cameraForward.x + leftDir.x * frustumSize / 2,
      0,
      cameraForward.z + leftDir.z * frustumSize / 2
    )
    const rightVertex = new THREE.Vector3(
      cameraForward.x + rightDir.x * frustumSize / 2,
      0,
      cameraForward.z + rightDir.z * frustumSize / 2
    )
    
    const forwardCoords = worldToMinimapCoords(cameraForward.x, cameraForward.z)
    const leftCoords = worldToMinimapCoords(leftVertex.x, leftVertex.z)
    const rightCoords = worldToMinimapCoords(rightVertex.x, rightVertex.z)
    
    // 绘制视野三角形
    minimapCtx.fillStyle = 'rgba(0, 128, 255, 0.3)'
    minimapCtx.strokeStyle = 'rgba(0, 128, 255, 0.8)'
    minimapCtx.lineWidth = 1
    minimapCtx.beginPath()
    minimapCtx.moveTo(cameraCoords.x, cameraCoords.y)
    minimapCtx.lineTo(leftCoords.x, leftCoords.y)
    minimapCtx.lineTo(forwardCoords.x, forwardCoords.y)
    minimapCtx.lineTo(rightCoords.x, rightCoords.y)
    minimapCtx.closePath()
    minimapCtx.fill()
    minimapCtx.stroke()
    
    // 绘制相机位置点
    minimapCtx.fillStyle = '#0077FF'
    minimapCtx.beginPath()
    minimapCtx.arc(cameraCoords.x, cameraCoords.y, 3, 0, Math.PI * 2)
    minimapCtx.fill()
  }
}

// 更新小地图
export function updateMinimap(camera, trains) {
  if (!minimapCanvas) return
  
  // 更新小地图
  drawMinimap(camera, trains)
}

// 清理小地图资源
export function cleanupMinimap() {
  minimapCanvas = null
  minimapCtx = null
}