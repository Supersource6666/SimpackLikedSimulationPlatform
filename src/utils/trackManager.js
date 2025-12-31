import * as THREE from 'three'
import { trackStore } from '../store/trackStore'

// 轨道段缓存相关变量
const cachedRailSegments = {
  rail1: [], // 左侧轨道段
  rail2: []  // 右侧轨道段
}

const segmentLength = 50 // 每个轨道段的长度
const visibleDistance = 200 // 可见距离（列车前后各显示多少距离的轨道）
const cacheSize = Math.ceil(visibleDistance / segmentLength) // 缓存段数量

let rail1, rail2
let trackPath = null
let trackLength = 0

// 从轨道段创建路径
export function createTrackPathFromSegments(segments) {
  const path = new THREE.CurvePath()
  
  // 创建轨道状态对象
  const trackState = {
    position: new THREE.Vector3(0, 0, 0),
    heading: 0 // 朝向角（弧度，0 表示 X 正方向）
  }
  
  segments.forEach((seg, index) => {
    try {
      if (seg.type === 'line') {
        addLineSegment(path, seg.length, trackState)
      } else if (seg.type === 'arc') {
        // 将角度从度转换为弧度
        const angleRad = (seg.angle * Math.PI) / 180
        addArcSegment(path, seg.radius, angleRad, trackState)
      } else {
        console.warn('createTrackPathFromSegments: Unknown segment type:', seg.type)
      }
    } catch (error) {
      console.error('createTrackPathFromSegments: Error adding segment', index, seg, error)
    }
  })
  
  // 确保路径至少包含一个曲线段
  if (path.curves.length === 0) {
    console.error('createTrackPathFromSegments: No valid curves added to path')
    // 添加一个默认的直线段避免崩溃
    const defaultPath = new THREE.CurvePath()
    const defaultState = {
      position: new THREE.Vector3(0, 0, 0),
      heading: 0
    }
    addLineSegment(defaultPath, 100, defaultState)
    return defaultPath
  }
  
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
  // 使用半径的符号决定轨道弯曲方向，当半径为负时改变轨道弯曲方向
  const sign = radius > 0 ? 1 : -1;
  // 使用半径的绝对值计算圆心位置
  const absRadius = Math.abs(radius);
  const center = new THREE.Vector3(
    state.position.x - sign * absRadius * Math.sin(state.heading),
    0,
    state.position.z + sign * absRadius * Math.cos(state.heading)
  )
  
  let prevPoint = state.position.clone()
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const theta = state.heading + angle * t
    
    const point = new THREE.Vector3(
      center.x + sign * absRadius * Math.sin(theta),
      0,
      center.z - sign * absRadius * Math.cos(theta)
    )
    
    path.add(new THREE.LineCurve3(prevPoint, point))
    prevPoint = point
  }
  
  state.heading += angle
  state.position.copy(prevPoint)
}

// 估算路径长度
export function estimatePathLength(path) {
  let length = 0
  path.curves.forEach(curve => {
    length += curve.getLength()
  })
  return length
}

// 创建轨道段（用于动态生成）
export function createRailSegment(options = {}) {
  const { trackPath, startT, endT, offset = 0, color = 0x333333 } = options
  
  // 添加防御性检查
  if (!trackPath) {
    console.error('createRailSegment: trackPath is null or undefined')
    return new THREE.Mesh() // 返回空对象避免崩溃
  }
  
  if (typeof startT !== 'number' || typeof endT !== 'number') {
    console.error('createRailSegment: startT or endT is not a number', { startT, endT })
    return new THREE.Mesh() // 返回空对象避免崩溃
  }
  
  // 确保trackPath包含有效的曲线段
  if (!trackPath.curves || trackPath.curves.length === 0) {
    console.error('createRailSegment: trackPath has no curves')
    return new THREE.Mesh() // 返回空对象避免崩溃
  }
  
  // 创建简单的钢轨轮廓（简化版）
  const railProfile = new THREE.Shape([
    new THREE.Vector2(-0.05, 0),
    new THREE.Vector2(0.05, 0),
    new THREE.Vector2(0.05, 0.1),
    new THREE.Vector2(-0.05, 0.1),
    new THREE.Vector2(-0.05, 0)
  ])
  
  // 创建该段落的偏移路径
  const offsetPath = new THREE.CurvePath()
  const segments = Math.floor((endT - startT) * 200)
  
  // 确保segments是有效的数字，最小为1
  if (isNaN(segments) || segments <= 0) {
    console.warn('createRailSegment: Invalid segments count, using minimum value 1:', segments)
    segments = 1
  }
  
  for (let i = 0; i <= segments; i++) {
    const t = startT + (endT - startT) * (i / segments)
    
    // 获取点
    let point = null
    try {
      point = trackPath.getPoint(t)
      if (!point) {
        console.error('createRailSegment: Failed to get point at t =', t)
        continue
      }
    } catch (error) {
      console.error('createRailSegment: Error getting point at t =', t, error)
      continue
    }
    
    // 获取切线
    let tangent = null
    try {
      tangent = trackPath.getTangentAt(t)
      if (!tangent || !tangent.normalize) {
        console.error('createRailSegment: Failed to get valid tangent at t =', t)
        // 使用默认方向避免崩溃
        tangent = new THREE.Vector3(1, 0, 0)
      } else {
        tangent = tangent.normalize()
      }
    } catch (error) {
      console.error('createRailSegment: Error getting tangent at t =', t, error)
      // 使用默认方向避免崩溃
      tangent = new THREE.Vector3(1, 0, 0)
    }
    
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
  
  let geometry = null
  let railSegment = null
  
  try {
    // 检查railProfile是否有效
    if (!railProfile || !railProfile.curves || railProfile.curves.length === 0) {
      console.error('createRailSegment: railProfile is invalid')
      return new THREE.Mesh()
    }
    
    // 检查offsetPath是否有效
    if (!offsetPath || !offsetPath.curves || offsetPath.curves.length === 0) {
      console.error('createRailSegment: offsetPath is invalid or empty')
      return new THREE.Mesh()
    }
    
    geometry = new THREE.ExtrudeGeometry(railProfile, extrudeSettings)
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.5,
      roughness: 0.3
    })
    
    railSegment = new THREE.Mesh(geometry, material)
    railSegment.castShadow = true
    railSegment.receiveShadow = true
    railSegment.userData = {
      startT,
      endT,
      length: (endT - startT) * trackLength
    }
  } catch (error) {
    console.error('createRailSegment: Error creating rail segment geometry', error)
    railSegment = new THREE.Mesh() // 返回空对象避免崩溃
  }
  
  return railSegment
}

// 更新轨道段
export function updateRailSegments(currentT, isLeftRail = true) {
  const cache = isLeftRail ? cachedRailSegments.rail1 : cachedRailSegments.rail2
  const railRoot = isLeftRail ? rail1 : rail2
  const offset = isLeftRail ? 1.435 / 2 : -1.435 / 2 // 标准轨距的一半
  
  // 添加防御性检查
  if (!trackPath) {
    console.error('updateRailSegments: trackPath is null or undefined')
    return
  }
  
  if (!trackLength || trackLength <= 0) {
    console.error('updateRailSegments: trackLength is invalid', trackLength)
    return
  }
  
  if (typeof currentT !== 'number') {
    console.error('updateRailSegments: currentT is not a number', currentT)
    return
  }
  
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
    const exists = cache.some(segment => {
      // 确保segment.userData存在且startT和endT是有效的数字
      if (!segment.userData || typeof segment.userData.startT !== 'number' || typeof segment.userData.endT !== 'number') {
        return false
      }
      return `${segment.userData.startT.toFixed(4)}-${segment.userData.endT.toFixed(4)}` === key
    })
    
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
export function initRailRoots(scene) {
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

// 创建轨道
export function createTrack(scene) {
  // 从trackStore获取轨道段数据
  const horizontalSegments = trackStore.getHorizontalSegments()
  
  // 确保有轨道段数据
  if (!horizontalSegments || horizontalSegments.length === 0) {
    console.error('createTrack: No horizontal segments found in trackStore')
    return { trackPath: null, trackLength: 0 }
  }
  
  // 创建轨道基准路径
  trackPath = createTrackPathFromSegments(horizontalSegments)
  
  // 确保路径创建成功
  if (!trackPath || !trackPath.getPoint) {
    console.error('createTrack: Failed to create valid trackPath')
    return { trackPath: null, trackLength: 0 }
  }
  
  // 计算轨道长度
  trackLength = estimatePathLength(trackPath)
  
  // 初始化轨道根节点，使用动态轨道段管理
  initRailRoots(scene)
  
  return { trackPath, trackLength }
}

// 获取轨道相关状态
export function getTrackState() {
  return { trackPath, trackLength, rail1, rail2 }
}

// 设置轨道相关状态
export function setTrackState(newState) {
  if (newState.trackPath) trackPath = newState.trackPath
  if (newState.trackLength) trackLength = newState.trackLength
  if (newState.rail1) rail1 = newState.rail1
  if (newState.rail2) rail2 = newState.rail2
}