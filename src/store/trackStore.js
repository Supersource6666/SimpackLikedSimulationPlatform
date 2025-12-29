import { reactive } from 'vue'

// 初始平断面轨道参数
const initialHorizontalSegments = [
  { id: 1, type: 'line', length: 200 },
  { id: 2, type: 'arc', radius: 200, length: 157.08, angle: 90 }, // 长度=半径*π/2，对应90度
  { id: 3, type: 'line', length: 200 }
]

// 初始纵断面轨道参数
const initialVerticalSegments = [
  { id: 1, type: 'grade', length: 200, grade: 0, startElevation: 0 }
]

// 初始车辆参数
const initialVehicleParams = {
  name: '',
  type: 'train',
  weight: 100,
  maxSpeed: 120,
  axles: 8,
  powerType: 'electric',
  maxPower: 4000,
  traction: 200,
  brakePower: 3000,
  capacity: 1000
}

// 初始运行参数
const initialOperationParams = {
  mode: 'automatic',
  speed: 80,
  acceleration: 0.5,
  deceleration: 0.8,
  stopTime: 30,
  safetyDistance: 50,
  maxGrade: 3,
  curveSpeedFactor: 0.8,
  emergencyBrakeThreshold: 'medium'
}

// 创建单例响应式状态
const trackParams = reactive({
  // 平断面轨道段数组 - 只包含直线和圆曲线，缓和曲线会自动插入
  horizontalSegments: JSON.parse(JSON.stringify(initialHorizontalSegments)),
  // 纵断面轨道段数组 - 包含坡道和竖曲线
  verticalSegments: JSON.parse(JSON.stringify(initialVerticalSegments)),
  // 车辆参数
  vehicleParams: JSON.parse(JSON.stringify(initialVehicleParams)),
  // 运行参数
  operationParams: JSON.parse(JSON.stringify(initialOperationParams))
})

// 设置平断面轨道段
const setHorizontalSegments = (newSegments) => {
  console.log('trackStore.setHorizontalSegments called with:', newSegments);
  // 清空现有数组并添加新的轨道段，确保响应式更新
  trackParams.horizontalSegments.length = 0;
  trackParams.horizontalSegments.push(...newSegments);
  console.log('trackStore horizontalSegments after setHorizontalSegments:', trackParams.horizontalSegments);
}

// 设置纵断面轨道段
const setVerticalSegments = (newSegments) => {
  console.log('trackStore.setVerticalSegments called with:', newSegments);
  // 清空现有数组并添加新的轨道段，确保响应式更新
  trackParams.verticalSegments.length = 0;
  trackParams.verticalSegments.push(...newSegments);
  console.log('trackStore verticalSegments after setVerticalSegments:', trackParams.verticalSegments);
}

// 添加平断面轨道段
const addHorizontalSegment = (segment) => {
  trackParams.horizontalSegments.push(segment)
}

// 添加纵断面轨道段
const addVerticalSegment = (segment) => {
  trackParams.verticalSegments.push(segment)
}

// 删除平断面轨道段
const deleteHorizontalSegment = (id) => {
  const index = trackParams.horizontalSegments.findIndex(s => s.id === id)
  if (index !== -1) {
    trackParams.horizontalSegments.splice(index, 1)
  }
}

// 删除纵断面轨道段
const deleteVerticalSegment = (id) => {
  const index = trackParams.verticalSegments.findIndex(s => s.id === id)
  if (index !== -1) {
    trackParams.verticalSegments.splice(index, 1)
  }
}

// 获取平断面轨道段
const getHorizontalSegments = () => {
  return trackParams.horizontalSegments
}

// 获取纵断面轨道段
const getVerticalSegments = () => {
  return trackParams.verticalSegments
}

// 设置车辆参数
const setVehicleParams = (newParams) => {
  console.log('trackStore.setVehicleParams called with:', newParams);
  // 更新车辆参数对象
  Object.assign(trackParams.vehicleParams, newParams);
  console.log('trackStore vehicleParams after setVehicleParams:', trackParams.vehicleParams);
}

// 获取车辆参数
const getVehicleParams = () => {
  return trackParams.vehicleParams
}

// 设置运行参数
const setOperationParams = (newParams) => {
  console.log('trackStore.setOperationParams called with:', newParams);
  // 更新运行参数对象
  Object.assign(trackParams.operationParams, newParams);
  console.log('trackStore operationParams after setOperationParams:', trackParams.operationParams);
}

// 获取运行参数
const getOperationParams = () => {
  return trackParams.operationParams
}

// 向后兼容的方法
const setSegments = (newSegments) => {
  console.log('trackStore.setSegments (deprecated) called with:', newSegments);
  setHorizontalSegments(newSegments);
}

const addSegment = (segment) => {
  console.log('trackStore.addSegment (deprecated) called with:', segment);
  addHorizontalSegment(segment);
}

const deleteSegment = (id) => {
  console.log('trackStore.deleteSegment (deprecated) called with:', id);
  deleteHorizontalSegment(id);
}

const getSegments = () => {
  console.log('trackStore.getSegments (deprecated) called');
  return getHorizontalSegments();
}

// 导出单例轨道状态管理
export const trackStore = {
  trackParams,
  // 平断面轨道段管理方法
  setHorizontalSegments,
  addHorizontalSegment,
  deleteHorizontalSegment,
  getHorizontalSegments,
  // 纵断面轨道段管理方法
  setVerticalSegments,
  addVerticalSegment,
  deleteVerticalSegment,
  getVerticalSegments,
  // 车辆参数管理方法
  setVehicleParams,
  getVehicleParams,
  // 运行参数管理方法
  setOperationParams,
  getOperationParams,
  // 向后兼容的方法
  setSegments,
  addSegment,
  deleteSegment,
  getSegments
}