<template>
  <div class="track-view-container">
    <div class="viewer-container">
      <div ref="canvasContainer" class="canvas-container"></div>
      <div class="controls-container">
        <button id="exportBtn" @click="exportGLTF">导出GLB模型</button>
        <button id="paramsBtn" @click="goToParams">参数设置</button>
      </div>
    </div>
    <div class="side-panel">
    <div class="profile-container">
      <div id="profileContainer" class="profile-info">
        <h4>钢轨断面廓形</h4>
        <canvas id="profileCanvas" width="150" height="210"></canvas>
      </div>
    </div>
    <div class="trajectory-container">
      <div id="trajectoryContainer" class="trajectory-info">
        <h4>钢轨平断面视图</h4>
        <canvas id="trajectoryCanvas" width="300" height="300"></canvas>
      </div>
    </div>
    <div class="trajectory-container">
      <div id="verticalTrajectoryContainer" class="trajectory-info">
        <h4>钢轨纵断面视图</h4>
        <canvas id="verticalTrajectoryCanvas" width="300" height="300"></canvas>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const canvasContainer = ref(null)
const router = useRouter()

// 引入轨道参数状态管理
import { trackStore } from '../store/trackStore'

// 跳转到参数设置界面
function goToParams() {
  router.push('/')
}

let scene, camera, renderer, controls
let rail1, rail2, basePathLine
let animationId

// 创建钢轨2D轮廓
function createRailProfile() {
  // 60kg/m钢轨核心尺寸（单位：米）
  const railHeight = 0.176;      // 钢轨总高度176mm
  const halfTopWidth = 0.0708 / 2; // 轨头顶部半宽35.4mm
  const halfBottomWidth = 0.150 / 2; // 轨底半宽75mm
  const webHalfThickness = 0.0165 / 2; // 轨腰半厚8.25mm
  // 关键圆角半径
  const r13 = 0.013; // 轨头圆角R13mm
  const r20 = 0.020; // 轨底圆角R20mm
      
  const points = [];
  // 关键Y坐标（以中心为原点，向上为正）
  const headTopY = railHeight / 2; // 轨头顶部Y：0.088m
  const headBottomY = headTopY - 0.0483; // 轨头底部Y：0.0397m
  const baseBottomY = -railHeight / 2; // 轨底底部Y：-0.088m
  const webBottomY = baseBottomY + 0.0305; // 轨腰底部Y：-0.0575m
      
  // ===================== 右侧轮廓（从轨头到轨底） =====================
  // 1. 轨头顶部右侧点
  points.push(new THREE.Vector2(halfTopWidth, headTopY));
      
  // 2. 轨头右侧圆角（R13）
  const headRightCenter = new THREE.Vector2(halfTopWidth, headTopY - r13);
  for (let angle = Math.PI / 2; angle >= 0; angle -= 0.1) {
    points.push(new THREE.Vector2(
      headRightCenter.x + r13 * Math.cos(angle),
      headRightCenter.y + r13 * Math.sin(angle)
    ));
  }
  
  // 3. 轨头到轨腰的右侧斜面
  points.push(new THREE.Vector2(0.03325, headBottomY)); // 斜面终点
  points.push(new THREE.Vector2(webHalfThickness, webBottomY)); // 轨腰右侧点
  
  // 5. 轨底右侧到底部点
  points.push(new THREE.Vector2(halfBottomWidth, baseBottomY));
  
  // ===================== 左侧轮廓（对称复制右侧） =====================
  // 反转右侧点的X坐标，生成左侧轮廓（从轨底到轨头）
  const rightPointsCount = points.length;
  for (let i = rightPointsCount - 1; i >= 0; i--) {
    const p = points[i];
    points.push(new THREE.Vector2(-p.x, p.y));
  }
  
  return points;
}

// 创建轨道路径 - 通用函数，可以创建不同的轨道
function createTrackPath(options = {}) {
  const {
    startPosition = new THREE.Vector3(0, 0, 0),
    segments = [], // 优先使用用户定义的轨道段
    curveRadius = 200,
    transitionLength = 50,
    firstLineLength = 200,
    secondLineLength = 200,
    curveAngle = Math.PI / 2, // 弧度
    railName = "直线-曲线-直线轨道"
  } = options;
  
  // 调试：检查传入的轨道段
  console.log('Creating track path with segments:', segments);
  
  const path = new THREE.CurvePath();
      
  // 使用用户定义的轨道段或默认生成的轨道段
  let userSegments = segments.length > 0 ? segments : [
    // 第一段直线
    { type: 'line', length: firstLineLength },
    // 圆曲线
    { type: 'arc', radius: curveRadius, angle: curveAngle },
    // 第二段直线
    { type: 'line', length: secondLineLength }
  ];

  // 自动插入缓和曲线
  const trackSegments = [];

  for (let i = 0; i < userSegments.length; i++) {
    const currentSegment = userSegments[i];
    
    // 添加当前轨道段
    trackSegments.push(currentSegment);
    
    // 检查是否需要在当前段和下一段之间插入缓和曲线
    if (i < userSegments.length - 1) {
      const nextSegment = userSegments[i + 1];
      
      // 检测直线-圆曲线过渡
      if (currentSegment.type === 'line' && nextSegment.type === 'arc') {
        // 插入直线-圆曲线缓和曲线
        trackSegments.push({
          type: 'transition',
          length: transitionLength,
          startRadius: Infinity,
          endRadius: nextSegment.radius
        });
      }
      // 检测圆曲线-直线过渡
      else if (currentSegment.type === 'arc' && nextSegment.type === 'line') {
        // 插入圆曲线-直线缓和曲线
        trackSegments.push({
          type: 'transition',
          length: transitionLength,
          startRadius: currentSegment.radius,
          endRadius: Infinity
        });
      }
      // 检测圆曲线-圆曲线过渡（半径不同）
      else if (currentSegment.type === 'arc' && nextSegment.type === 'arc' && currentSegment.radius !== nextSegment.radius) {
        // 插入圆曲线-圆曲线缓和曲线
        trackSegments.push({
          type: 'transition',
          length: transitionLength,
          startRadius: currentSegment.radius,
          endRadius: nextSegment.radius
        });
      }
    }
  }
  
  // 创建轨道状态对象，确保每次调用createTrackPath时都是独立的
  const trackState = {
    position: startPosition.clone(),
    heading: 0 // 朝向角（弧度，0 表示 X 正方向）
  };
      
  trackSegments.forEach(seg => {
    if (seg.type === 'line') {
      addLine(path, seg.length, trackState);
    }
    if (seg.type === 'arc') {
      addArc(path, seg.radius, seg.angle, trackState);
    }
    if (seg.type === 'transition') {
      addTransition(path, seg.length, seg.startRadius, seg.endRadius, trackState);
    }
  });
  
  return path;

  /* ========= 内部函数 ========= */

  function addLine(path, length, state) {
    const start = state.position.clone();
    const end = state.position.clone().add(
      new THREE.Vector3(
        Math.cos(state.heading) * length,
        Math.sin(state.heading) * length,
        0
      )
    );
    
    path.add(new THREE.LineCurve3(start, end));
    state.position.copy(end);
  }

  function addArc(path, radius, angle, state) {
    const segments = 50;
    const sign = angle > 0 ? 1 : -1;
    const center = new THREE.Vector3(
      state.position.x - sign * radius * Math.sin(state.heading),
      state.position.y + sign * radius * Math.cos(state.heading),
      0
    );
    
    let prevPoint = state.position.clone();
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const theta = state.heading + angle * t;
      
      const point = new THREE.Vector3(
        center.x + sign * radius * Math.sin(theta),
        center.y - sign * radius * Math.cos(theta),
        0
      );
      
      path.add(new THREE.LineCurve3(prevPoint, point));
      prevPoint = point;
    }
    
    state.heading += angle;
    state.position.copy(prevPoint);
  }

  function addTransition(path, length, startRadius, endRadius, state) {
    const segments = 50;
    let prevPoint = state.position.clone();
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      
      // 曲率线性变化（Clothoid 近似）
      const radius = 
        startRadius === Infinity
          ? endRadius / t
          : endRadius === Infinity
          ? startRadius / (1 - t)
          : startRadius + (endRadius - startRadius) * t;
      
      const curvature = 1 / radius;
      const ds = length / segments;
      
      state.heading += curvature * ds;
      
      const point = prevPoint.clone().add(
        new THREE.Vector3(
          Math.cos(state.heading) * ds,
          Math.sin(state.heading) * ds,
          0
        )
      );
      
      path.add(new THREE.LineCurve3(prevPoint, point));
      prevPoint = point;
    }
    
    state.position.copy(prevPoint);
  }
}

// 创建偏移轨道路径 - 将基准轨道偏移一定距离创建左右轨道
function offsetTrackPath(basePath, offsetDistance) {
  const offsetPath = new THREE.CurvePath();
  const segments = 200; // 采样点数量
  
  // 预计算所有路径点，确保只包含有效的Vector3对象
  const pathPoints = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = basePath.getPoint(t);
    // 确保point不是null
    pathPoints.push(point || new THREE.Vector3(0, 0, 0));
  }
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = pathPoints[i];
    
    // 计算切线
    let tangent;
    if (i === 0) {
      // 起点：使用下一个点计算切线
      const nextPoint = pathPoints[i + 1];
      tangent = nextPoint.clone().sub(point).normalize();
    } else if (i === segments) {
      // 终点：使用前一个点计算切线
      const prevPoint = pathPoints[i - 1];
      tangent = point.clone().sub(prevPoint).normalize();
    } else {
      // 中间点：使用前后两个点计算切线
      const nextPoint = pathPoints[i + 1];
      const prevPoint = pathPoints[i - 1];
      tangent = nextPoint.clone().sub(prevPoint).normalize();
    }
    
    // 计算垂直于切线的偏移方向（左侧为负，右侧为正）
    const offsetDirection = new THREE.Vector3(
      -tangent.y, // 垂直于切线方向（左转90度）
      tangent.x,  // 垂直于切线方向（左转90度）
      0
    );
    
    // 根据偏移距离计算偏移后的点
    const offsetPoint = point.clone().add(
      offsetDirection.multiplyScalar(offsetDistance)
    );
    
    // 添加点到偏移路径
    if (i > 0) {
      // 获取前一个点
      let prevPoint;
      if (offsetPath.curves.length > 0) {
        prevPoint = offsetPath.curves[offsetPath.curves.length - 1].v2;
      } else if (offsetPath.firstPoint) {
        prevPoint = offsetPath.firstPoint;
      } else {
        prevPoint = offsetPoint;
      }
      offsetPath.add(new THREE.LineCurve3(prevPoint, offsetPoint));
    } else {
      // 第一个点，先保存下来
      offsetPath.firstPoint = offsetPoint;
    }
  }
  
  return offsetPath;
}

// 创建拉伸几何体 - 通用函数
function createRail(options = {}) {
  const {
    color = 0x333333,
    trackPath, // 接受已创建的轨道路径
    startPosition = new THREE.Vector3(0, 0, 0),
    curveRadius = 200,
    railName = "钢轨"
  } = options;
  
  const profile = createRailProfile();
  
  // 如果没有提供trackPath，则创建新的路径
  const finalTrackPath = trackPath || createTrackPath({ 
    startPosition, 
    curveRadius, 
    railName 
  });
  
  // 将钢轨轮廓逆时针旋转90度
  const rotatedProfile = profile.map(point => new THREE.Vector2(-point.y, point.x));
  
  const extrudeSettings = {
    steps: 200, // 优化步数，平衡性能和效果
    bevelEnabled: false,
    extrudePath: finalTrackPath
  };
  
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(rotatedProfile), extrudeSettings);
  const material = new THREE.MeshStandardMaterial({ 
    color: color,
    metalness: 0.5,
    roughness: 0.3
  });
  
  const rail = new THREE.Mesh(geometry, material);
  rail.castShadow = true;
  rail.receiveShadow = true;
  
  return rail;
}

// 绘制钢轨2D廓形到Canvas
function drawRailProfile() {
  const canvas = document.getElementById('profileCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const points = createRailProfile();
  
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 设置绘图样式
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(51, 51, 51, 0.1)';
  
  // 计算坐标转换参数
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const padding = 20;
  
  // 找出点的最小和最大坐标
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  
  // 计算缩放比例
  const widthRange = maxX - minX;
  const heightRange = maxY - minY;
  const scale = Math.min(
    (canvasWidth - 2 * padding) / widthRange,
    (canvasHeight - 2 * padding) / heightRange
  );
  
  // 计算偏移量
  const offsetX = canvasWidth / 2;
  const offsetY = canvasHeight / 2;
  
  // 开始绘制路径
  ctx.beginPath();
  
  // 转换第一个点
  const firstPoint = points[0];
  const firstCanvasX = offsetX + firstPoint.x * scale;
  const firstCanvasY = offsetY - firstPoint.y * scale; // Y轴翻转
  ctx.moveTo(firstCanvasX, firstCanvasY);
  
  // 绘制其他点
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const canvasX = offsetX + point.x * scale;
    const canvasY = offsetY - point.y * scale; // Y轴翻转
    ctx.lineTo(canvasX, canvasY);
  }
  
  // 闭合路径
  ctx.closePath();
  
  // 填充和描边
  ctx.fill();
  ctx.stroke();
  
  // 绘制坐标轴
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  
  // X轴
  ctx.beginPath();
  ctx.moveTo(padding, offsetY);
  ctx.lineTo(canvasWidth - padding, offsetY);
  ctx.stroke();
  
  // Y轴
  ctx.beginPath();
  ctx.moveTo(offsetX, padding);
  ctx.lineTo(offsetX, canvasHeight - padding);
  ctx.stroke();
  
  // 重置线条样式
  ctx.setLineDash([]);
}

// 绘制钢轨平断面轨迹到Canvas
function drawRailTrajectory(baseTrackPath, leftTrackPath, rightTrackPath) {
  const canvas = document.getElementById('trajectoryCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 获取所有路径的点，确保只包含有效的Vector3对象
  const samples = 200;
  const basePoints = [];
  const leftPoints = [];
  const rightPoints = [];
  
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    basePoints.push(baseTrackPath.getPoint(t) || new THREE.Vector3(0, 0, 0));
    leftPoints.push(leftTrackPath.getPoint(t) || new THREE.Vector3(0, 0, 0));
    rightPoints.push(rightTrackPath.getPoint(t) || new THREE.Vector3(0, 0, 0));
  }
  
  // 合并所有点以计算边界
  const allPoints = [...basePoints, ...leftPoints, ...rightPoints];
  
  // 找出点的最小和最大坐标（XOY平面）
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  allPoints.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  
  // 计算坐标转换参数
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const padding = 30;
  
  // 计算缩放比例
  const widthRange = maxX - minX;
  const heightRange = maxY - minY;
  const scale = Math.min(
    (canvasWidth - 2 * padding) / (widthRange || 1),
    (canvasHeight - 2 * padding) / (heightRange || 1)
  );
  
  // 计算偏移量（居中显示）
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const offsetX = canvasWidth / 2 - centerX * scale;
  const offsetY = canvasHeight / 2 + centerY * scale; // Y轴翻转
  
  // 绘制网格背景
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);
  
  // 绘制水平网格线
  for (let y = padding; y < canvasHeight - padding; y += 20) {
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.stroke();
  }
  
  // 绘制垂直网格线
  for (let x = padding; x < canvasWidth - padding; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, canvasHeight - padding);
    ctx.stroke();
  }
  
  // 重置线条样式
  ctx.setLineDash([]);
  
  // 绘制左右钢轨轨迹
  ctx.lineWidth = 2;
  
  // 绘制左轨
  ctx.strokeStyle = '#333333';
  ctx.beginPath();
  leftPoints.forEach((point, index) => {
    const canvasX = offsetX + point.x * scale;
    const canvasY = offsetY - point.y * scale; // Y轴翻转
    if (index === 0) {
      ctx.moveTo(canvasX, canvasY);
    } else {
      ctx.lineTo(canvasX, canvasY);
    }
  });
  ctx.stroke();
  
  // 绘制右轨
  ctx.strokeStyle = '#444444';
  ctx.beginPath();
  rightPoints.forEach((point, index) => {
    const canvasX = offsetX + point.x * scale;
    const canvasY = offsetY - point.y * scale; // Y轴翻转
    if (index === 0) {
      ctx.moveTo(canvasX, canvasY);
    } else {
      ctx.lineTo(canvasX, canvasY);
    }
  });
  ctx.stroke();
  
  // 绘制中心线
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  basePoints.forEach((point, index) => {
    const canvasX = offsetX + point.x * scale;
    const canvasY = offsetY - point.y * scale; // Y轴翻转
    if (index === 0) {
      ctx.moveTo(canvasX, canvasY);
    } else {
      ctx.lineTo(canvasX, canvasY);
    }
  });
  ctx.stroke();
  
  // 绘制坐标轴
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  
  // X轴
  ctx.beginPath();
  ctx.moveTo(padding, canvasHeight / 2);
  ctx.lineTo(canvasWidth - padding, canvasHeight / 2);
  ctx.stroke();
  
  // Y轴
  ctx.beginPath();
  ctx.moveTo(canvasWidth / 2, padding);
  ctx.lineTo(canvasWidth / 2, canvasHeight - padding);
  ctx.stroke();
  
  // 绘制坐标轴标签
  ctx.font = '10px Arial';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';
  ctx.fillText('X (m)', canvasWidth - 15, canvasHeight / 2 - 5);
  ctx.save();
  ctx.translate(padding + 5, canvasHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Y (m)', 0, 0);
  ctx.restore();
}

// 绘制钢轨纵断面轨迹到Canvas
function drawVerticalRailTrajectory() {
  const canvas = document.getElementById('verticalTrajectoryCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 获取纵断面轨道段数据
  const verticalSegments = trackStore.getVerticalSegments();
  
  if (verticalSegments.length === 0) {
    console.log('No vertical segments available');
    return;
  }
  
  // 计算每个轨道段的累计长度和高程
  const samples = 200;
  const trajectoryPoints = [];
  let cumulativeDistance = 0;
  
  verticalSegments.forEach(segment => {
    const { type, length, grade, startElevation } = segment;
    
    // 计算当前段的高程变化
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const distance = cumulativeDistance + length * t;
      const elevation = startElevation + (grade / 100) * length * t;
      
      trajectoryPoints.push({ distance, elevation });
    }
    
    // 更新累计距离
    cumulativeDistance += length;
  });
  
  // 找出点的最小和最大坐标（距离-高程平面）
  let minDistance = Infinity, maxDistance = -Infinity;
  let minElevation = Infinity, maxElevation = -Infinity;
  
  trajectoryPoints.forEach(point => {
    minDistance = Math.min(minDistance, point.distance);
    maxDistance = Math.max(maxDistance, point.distance);
    minElevation = Math.min(minElevation, point.elevation);
    maxElevation = Math.max(maxElevation, point.elevation);
  });
  
  // 计算坐标转换参数
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const padding = 30;
  
  // 计算缩放比例
  const distanceRange = maxDistance - minDistance;
  const elevationRange = maxElevation - minElevation;
  const scale = Math.min(
    (canvasWidth - 2 * padding) / (distanceRange || 1),
    (canvasHeight - 2 * padding) / (elevationRange || 1)
  );
  
  // 计算偏移量（居中显示）
  const centerDistance = (minDistance + maxDistance) / 2;
  const centerElevation = (minElevation + maxElevation) / 2;
  const vOffsetX = canvasWidth / 2 - centerDistance * scale;
  const vOffsetY = canvasHeight / 2 + centerElevation * scale; // Y轴翻转
  
  // 绘制网格背景
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);
  
  // 绘制水平网格线
  for (let y = padding; y < canvasHeight - padding; y += 20) {
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.stroke();
  }
  
  // 绘制垂直网格线
  for (let x = padding; x < canvasWidth - padding; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, canvasHeight - padding);
    ctx.stroke();
  }
  
  // 重置线条样式
  ctx.setLineDash([]);
  
  // 绘制轨道路线
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#333333';
  ctx.beginPath();
  
  trajectoryPoints.forEach((point, index) => {
    const canvasX = vOffsetX + point.distance * scale;
    const canvasY = vOffsetY - point.elevation * scale; // Y轴翻转
    
    if (index === 0) {
      ctx.moveTo(canvasX, canvasY);
    } else {
      ctx.lineTo(canvasX, canvasY);
    }
  });
  ctx.stroke();
  
  // 绘制坐标轴
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1;
  
  // X轴 - 距离
  ctx.beginPath();
  ctx.moveTo(padding, canvasHeight / 2);
  ctx.lineTo(canvasWidth - padding, canvasHeight / 2);
  ctx.stroke();
  
  // Y轴 - 高程
  ctx.beginPath();
  ctx.moveTo(canvasWidth / 2, padding);
  ctx.lineTo(canvasWidth / 2, canvasHeight - padding);
  ctx.stroke();
  
  // 绘制坐标轴标签
  ctx.font = '10px Arial';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';
  ctx.fillText('距离 (m)', canvasWidth - 15, canvasHeight / 2 - 5);
  ctx.save();
  ctx.translate(padding + 5, canvasHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('高程 (m)', 0, 0);
  ctx.restore();
}

// 导出GLTF模型
function exportGLTF() {
  const exporter = new GLTFExporter();
  const gltfOptions = {
    trs: false,
    onlyVisible: true,
    truncateDrawRange: true,
    binary: true,
    maxTextureSize: 4096
  };
  
  // 创建包含所有钢轨的组
  const railGroup = new THREE.Group();
  if (rail1) railGroup.add(rail1);
  if (rail2) railGroup.add(rail2);
  
  exporter.parse(railGroup, (gltf) => {
    if (gltf instanceof ArrayBuffer) {
      const blob = new Blob([gltf], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'rail_track.glb';
      link.click();
      URL.revokeObjectURL(url);
    }
  }, (error) => {
    console.error('导出错误:', error);
  }, gltfOptions);
}

// 更新轨道函数
function updateTrack() {
  if (!scene) {
    console.log('Scene not initialized, skipping track update');
    return;
  }
  
  // 调试：检查trackStore中的轨道参数
  console.log('Update track called, segments from store:', trackStore.trackParams.horizontalSegments);
  
  // 移除现有轨道和路径
  if (rail1) {
    scene.remove(rail1);
    rail1.geometry.dispose();
    rail1.material.dispose();
    rail1 = null;
  }
  
  if (rail2) {
    scene.remove(rail2);
    rail2.geometry.dispose();
    rail2.material.dispose();
    rail2 = null;
  }
  
  if (basePathLine) {
    scene.remove(basePathLine);
    basePathLine.geometry.dispose();
    basePathLine.material.dispose();
    basePathLine = null;
  }
  
  // 从store获取轨道段数据（转换角度为弧度）
  console.log('Store segments raw data:', trackStore.trackParams.horizontalSegments);
  const trackSegments = trackStore.trackParams.horizontalSegments.map(seg => {
    const newSeg = { ...seg };
    // 如果是圆曲线，将角度转换为弧度
    if (newSeg.type === 'arc') {
      console.log(`Arc segment ${newSeg.id}: angle in degrees ${newSeg.angle}, converting to radians`);
      newSeg.angle = newSeg.angle * Math.PI / 180;
    }
    return newSeg;
  });
  console.log('Processed track segments for path creation:', trackSegments);
  
  // 创建新的基准轨道路径（中心线）
  const baseTrackPath = createTrackPath({
    startPosition: new THREE.Vector3(0, 0, 0),
    segments: trackSegments,
    railName: "基准轨道（中心线）"
  });
  
  // 创建左右轨道的偏移路径
  const leftTrackPath = offsetTrackPath(baseTrackPath, -0.7175); // 左轨偏移-0.7175米
  const rightTrackPath = offsetTrackPath(baseTrackPath, 0.7175); // 右轨偏移+0.7175米
  
  // 创建第一条钢轨（左轨）
  rail1 = createRail({
    color: 0x333333,
    trackPath: leftTrackPath,
    railName: "第一条轨道"
  });
  scene.add(rail1);
  
  // 创建第二条钢轨（右轨）
  rail2 = createRail({
    color: 0x444444,
    trackPath: rightTrackPath,
    railName: "第二条轨道"
  });
  scene.add(rail2);
  
  // 在主场景中添加基准轨道路径（中心线）的线可视化
  const baseScenePathGeometry = new THREE.BufferGeometry();
  const baseScenePathPoints = [];
  
  // 生成基准路径上的点
  for (let t = 0; t <= 1; t += 0.002) {
    const point = baseTrackPath.getPoint(t) || new THREE.Vector3(0, 0, 0);
    baseScenePathPoints.push(point.x, point.y, point.z + 0.3); // 稍微高出轨道，确保可见
  }
  
  baseScenePathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(baseScenePathPoints, 3));
  
  const baseScenePathMaterial = new THREE.LineBasicMaterial({
    color: 0xffff00, // 黄色
    linewidth: 3
  });
  
  basePathLine = new THREE.Line(baseScenePathGeometry, baseScenePathMaterial);
  scene.add(basePathLine);
  
  // 更新轨迹显示
  drawRailTrajectory(baseTrackPath, leftTrackPath, rightTrackPath);
  drawVerticalRailTrajectory();
}

// 初始化Three.js场景
function initThreeJS() {
  if (!canvasContainer.value) return;
  
  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);
  
  // 创建相机
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
  camera.position.set(0, 100, 200); // 调整相机位置，从上方俯视轨道
  camera.lookAt(0, 0, 0); // 相机看向原点
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  canvasContainer.value.appendChild(renderer.domElement);
  
  // 添加坐标轴辅助
  const axesHelper = new THREE.AxesHelper(50);
  scene.add(axesHelper);
  
  // 添加原点标记
  const originGeometry = new THREE.SphereGeometry(0.5, 16, 16);
  const originMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const originMarker = new THREE.Mesh(originGeometry, originMaterial);
  scene.add(originMarker);
  
  // 添加轨道控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2; // 限制相机最大极角，防止向下倾斜超过水平
  controls.minPolarAngle = Math.PI / 2; // 限制相机最小极角，防止向上倾斜超过水平
  controls.enablePan = true; // 允许平移
  controls.enableZoom = true; // 允许缩放
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(15, 30, 15);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);
  
  // 添加XOY平面地面
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.position.z = -0.5;
  ground.receiveShadow = true;
  scene.add(ground);
  
  // 绘制2D廓形
  drawRailProfile();
  
  // 动画循环
  function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
  
  // 窗口大小调整事件
  function handleResize() {
    if (!canvasContainer.value) return;
    
    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
  }
  
  window.addEventListener('resize', handleResize);
  
  // 清理函数
  return () => {
    window.removeEventListener('resize', handleResize);
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (renderer && canvasContainer.value && renderer.domElement) {
      canvasContainer.value.removeChild(renderer.domElement);
      renderer.dispose();
    }
  };
}

let cleanup

onMounted(() => {
  console.log('TrackView.vue mounted');
  console.log('Initial segments from trackStore:', trackStore.trackParams.segments);
  cleanup = initThreeJS();
  // 添加一个小延迟确保Three.js场景初始化完成后再更新轨道
  setTimeout(() => {
    console.log('Updating track after scene initialization...');
    updateTrack();
  }, 300); // 增加延迟确保数据已准备好
});

// 路由变化时强制更新轨道
import { onBeforeRouteUpdate } from 'vue-router';
onBeforeRouteUpdate((to, from) => {
  console.log('Route updating, checking segments:', trackStore.trackParams.segments);
  setTimeout(() => {
    updateTrack();
  }, 100);
});

onUnmounted(() => {
  if (cleanup) {
    cleanup();
  }
});

// 监听轨道参数变化，自动更新轨道
watch(
  () => trackStore.trackParams.segments,
  (newSegments) => {
    // 调试：检查参数变化
    console.log('Track segments changed:', newSegments);
    // 参数变化时更新轨道
    updateTrack();
  },
  { deep: true } // 深度监听数组和对象的变化
);
</script>

<style scoped>
.track-view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
}

.viewer-container {
  flex: 1;
  position: relative;
  height: 100%;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.controls-container {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
}

#exportBtn {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

#exportBtn:hover {
  background: #45a049;
}

.side-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-left: 1px solid #ddd;
  overflow-y: auto;
}

.profile-container {
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.profile-info {
  text-align: center;
}

.profile-info h4 {
  margin: 5px 0;
  font-size: 14px;
  color: #333;
}

#profileCanvas {
  border: 1px solid #eee;
}

.trajectory-container {
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.trajectory-info {
  text-align: center;
  width: 100%;
}

.trajectory-info h4 {
  margin: 5px 0;
  font-size: 14px;
  color: #333;
}

#trajectoryCanvas {
  border: 1px solid #eee;
  width: 100%;
  max-width: 300px;
  height: auto;
}
</style>