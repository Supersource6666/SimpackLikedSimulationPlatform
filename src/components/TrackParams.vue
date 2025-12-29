<template>
  <div class="track-params">
    <!-- Tab切换 -->
    <div class="params-tabs">
      <div 
        :class="['tab-item', { active: activeTab === 'horizontal' }]"
        @click="activeTab = 'horizontal'"
      >平断面参数</div>
      <div 
        :class="['tab-item', { active: activeTab === 'vertical' }]"
        @click="activeTab = 'vertical'"
      >纵断面参数</div>
    </div>
    
    <!-- 平断面参数内容 -->
    <div v-if="activeTab === 'horizontal'" class="tab-content">
      <div class="segments-section">
        <h3>轨道段列表</h3>
        <div class="segments-list">
          <div class="segment-item header">
            <div class="segment-id">ID</div>
            <div class="segment-type">类型</div>
            <div class="segment-length">长度 (m)</div>
            <div v-if="showRadiusColumn" class="segment-radius">半径 (m)</div>
            <div v-if="showAngleColumn" class="segment-angle">角度 (°)</div>
            <div class="segment-actions">操作</div>
          </div>
          <div 
            v-for="segment in trackParams.horizontalSegments" 
            :key="segment.id" 
            class="segment-item"
          >
            <div class="segment-id">{{ segment.id }}</div>
            <div class="segment-type">
              <select v-model="segment.type" @change="handleSegmentTypeChange(segment.id)">
                <option value="line">直线</option>
                <option value="arc">圆曲线</option>
              </select>
            </div>
            <div class="segment-length">
              <input 
                v-model.number="segment.length" 
                type="number" 
                min="0.1" 
                @change="handleLengthChange(segment.id)"
              />
            </div>
            <div v-if="segment.type === 'arc'" class="segment-radius">
              <input 
                v-model.number="segment.radius" 
                type="number" 
                min="-10000" 
                @change="handleRadiusChange(segment.id)"
              />
            </div>
            <div v-if="segment.type === 'arc'" class="segment-angle">
              <input 
                v-model.number="segment.angle" 
                type="number" 
                min="-179" 
                max="179" 
                @change="handleAngleChange(segment.id)"
              />
            </div>
            <div class="segment-actions">
              <button 
                class="btn btn-delete"
                @click="deleteSegment(segment.id)"
                :disabled="trackParams.horizontalSegments.length <= 1"
              >删除</button>
            </div>
          </div>
        </div>
        <div class="params-actions">
          <button class="btn btn-add" @click="addSegment">添加轨道段</button>
        </div>
      </div>
      
      <!-- 平断面预览 -->
      <div class="preview-canvas">
        <h3>平断面预览</h3>
        <canvas 
          ref="trackPreviewCanvas"
          width="600" 
          height="400"
        ></canvas>
      </div>
      
      <div class="params-preview">
        <h3>参数预览</h3>
        <div class="preview-content">
          <div class="preview-item">
            <span class="label">总长度：</span>
            <span class="value">{{ totalLength.toFixed(2) }} m</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 纵断面参数内容 -->
    <div v-if="activeTab === 'vertical'" class="tab-content">
      <div class="vertical-section">
        <h3>纵断面参数设置</h3>
        <div class="vertical-params">
          <div class="vertical-params-group">
            <div class="param-item">
              <label for="start-elevation">起点高程 (m)</label>
              <input 
                id="start-elevation"
                v-model.number="verticalParams.startElevation" 
                type="number" 
                step="0.1"
              />
            </div>
            <div class="param-item">
              <label for="grade">坡度 (%)</label>
              <input 
                id="grade"
                v-model.number="verticalParams.grade" 
                type="number" 
                min="-5" 
                max="5" 
                step="0.1"
              />
            </div>
            <div class="param-item">
              <label for="elevation-length">坡段长度 (m)</label>
              <input 
                id="elevation-length"
                v-model.number="verticalParams.elevationLength" 
                type="number" 
                min="0.1" 
                step="1"
              />
            </div>
            <div class="param-item">
              <label for="curve-radius">竖曲线半径 (m)</label>
              <input 
                id="curve-radius"
                v-model.number="verticalParams.curveRadius" 
                type="number" 
                min="1000" 
                step="100"
              />
            </div>
          </div>
          
          <div class="vertical-preview">
            <h4>计算结果</h4>
            <div class="preview-info">
              <div class="info-item">
                <span class="label">终点高程</span>
                <span class="value">{{ endElevation.toFixed(2) }} m</span>
              </div>
              <div class="info-item">
                <span class="label">坡段高差</span>
                <span class="value">{{ elevationDifference.toFixed(2) }} m</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="segments-section">
        <h3>纵断面轨道段列表</h3>
        <div class="segments-list">
          <div class="segment-item header">
            <div class="segment-id">ID</div>
            <div class="segment-type">类型</div>
            <div class="segment-length">长度 (m)</div>
            <div class="segment-radius">坡度 (%)/半径 (m)</div>
            <div class="segment-angle">起点高程 (m)</div>
            <div class="segment-actions">操作</div>
          </div>
          <div 
            v-for="segment in trackParams.verticalSegments" 
            :key="segment.id" 
            class="segment-item"
          >
            <div class="segment-id">{{ segment.id }}</div>
            <div class="segment-type">
              <select v-model="segment.type" @change="handleVerticalSegmentTypeChange(segment.id)">
                <option value="grade">坡道</option>
                <option value="vertical-curve">竖曲线</option>
              </select>
            </div>
            <div class="segment-length">
              <input 
                v-model.number="segment.length" 
                type="number" 
                min="0.1" 
                @change="handleVerticalLengthChange(segment.id)"
              />
            </div>
            <div class="segment-radius">
              <input 
                v-if="segment.type === 'grade'"
                v-model.number="segment.grade" 
                type="number" 
                min="-5" 
                max="5" 
                step="0.1"
                @change="handleGradeChange(segment.id)"
              />
              <input 
                v-else
                v-model.number="segment.radius" 
                type="number" 
                min="1000" 
                step="100"
                @change="handleVerticalCurveRadiusChange(segment.id)"
              />
            </div>
            <div class="segment-angle">
              <input 
                v-model.number="segment.startElevation" 
                type="number" 
                step="0.1"
                @change="handleStartElevationChange(segment.id)"
              />
            </div>
            <div class="segment-actions">
              <button 
                class="btn btn-delete"
                @click="deleteVerticalSegment(segment.id)"
                :disabled="trackParams.verticalSegments.length <= 1"
              >删除</button>
            </div>
          </div>
        </div>
        <div class="params-actions">
          <button class="btn btn-add" @click="addSegment">添加纵断面轨道段</button>
        </div>
      </div>
      
      <!-- 纵断面预览 -->
      <div class="preview-canvas">
        <h3>纵断面预览</h3>
        <canvas 
          ref="verticalTrackPreviewCanvas"
          width="600" 
          height="400"
        ></canvas>
      </div>
      
      <div class="params-preview">
        <h3>参数预览</h3>
        <div class="preview-content">
          <div class="preview-item">
            <span class="label">纵断面总长度：</span>
            <span class="value">{{ verticalTotalLength.toFixed(2) }} m</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { trackStore } from '../store/trackStore.js';

// Tab切换状态
const activeTab = ref('horizontal');

// 本地轨道参数状态，与store保持同步
const trackParams = reactive({
  horizontalSegments: [],
  verticalSegments: []
});

// 纵断面参数
const verticalParams = reactive({
  startElevation: 0,  // 起点高程 (m)
  grade: 0,          // 坡度 (%)
  elevationLength: 100,  // 坡段长度 (m)
  curveRadius: 3000   // 竖曲线半径 (m)
});

// Canvas引用
const trackPreviewCanvas = ref(null);
const verticalTrackPreviewCanvas = ref(null);

// 计算属性：平断面总长度
const totalLength = computed(() => {
  return trackParams.horizontalSegments.reduce((sum, segment) => sum + segment.length, 0);
});

// 计算属性：纵断面总长度
const verticalTotalLength = computed(() => {
  return trackParams.verticalSegments.reduce((sum, segment) => sum + segment.length, 0);
});

// 计算属性：是否显示半径列
const showRadiusColumn = computed(() => {
  return trackParams.horizontalSegments.some(s => s.type === 'arc');
});

// 计算属性：是否显示角度列
const showAngleColumn = computed(() => {
  return trackParams.horizontalSegments.some(s => s.type === 'arc');
});

// 计算终点高程
const endElevation = computed(() => {
  return verticalParams.startElevation + (verticalParams.grade / 100) * verticalParams.elevationLength;
});

// 计算坡段高差
const elevationDifference = computed(() => {
  return (verticalParams.grade / 100) * verticalParams.elevationLength;
});

// 添加轨道段
const addSegment = () => {
  if (activeTab.value === 'horizontal') {
    // 添加平断面轨道段
    const maxId = trackParams.horizontalSegments.length > 0 
      ? Math.max(...trackParams.horizontalSegments.map(s => s.id)) 
      : 0;
    
    const newSegment = {
      id: maxId + 1,
      type: 'line',
      length: 100
    };
    
    trackParams.horizontalSegments.push(newSegment);
    trackStore.setHorizontalSegments(trackParams.horizontalSegments);
  } else {
    // 添加纵断面轨道段
    const maxId = trackParams.verticalSegments.length > 0 
      ? Math.max(...trackParams.verticalSegments.map(s => s.id)) 
      : 0;
    
    let startElevation = 0;
    if (trackParams.verticalSegments.length > 0) {
      const lastSegment = trackParams.verticalSegments[trackParams.verticalSegments.length - 1];
      if (lastSegment.type === 'grade') {
        startElevation = lastSegment.startElevation + (lastSegment.grade / 100) * lastSegment.length;
      } else {
        startElevation = lastSegment.startElevation;
      }
    }
    
    const newSegment = {
      id: maxId + 1,
      type: 'grade',
      length: 200,
      grade: 0,
      startElevation: startElevation
    };
    
    trackParams.verticalSegments.push(newSegment);
    trackStore.setVerticalSegments(trackParams.verticalSegments);
  }
};

// 删除轨道段
const deleteSegment = (id) => {
  if (trackParams.horizontalSegments.length <= 1) {
    alert('至少需要保留一个轨道段！');
    return;
  }
  
  const index = trackParams.horizontalSegments.findIndex(s => s.id === id);
  if (index !== -1) {
    trackParams.horizontalSegments.splice(index, 1);
    trackStore.setHorizontalSegments(trackParams.horizontalSegments);
  }
};

// 删除纵断面轨道段
const deleteVerticalSegment = (id) => {
  if (trackParams.verticalSegments.length <= 1) {
    alert('至少需要保留一个轨道段！');
    return;
  }
  
  const index = trackParams.verticalSegments.findIndex(s => s.id === id);
  if (index !== -1) {
    trackParams.verticalSegments.splice(index, 1);
    trackStore.setVerticalSegments(trackParams.verticalSegments);
  }
};

// 处理轨道段类型变化
const handleSegmentTypeChange = (id) => {
  const segment = trackParams.horizontalSegments.find(s => s.id === id);
  if (!segment) return;
  
  if (segment.type === 'line') {
    delete segment.radius;
    delete segment.angle;
  } else {
    if (!segment.radius) segment.radius = 200;
    if (!segment.angle) segment.angle = 90;
    updateArcLength(segment);
  }
  
  trackStore.setHorizontalSegments(trackParams.horizontalSegments);
};

// 处理长度变化
const handleLengthChange = (id) => {
  const segment = trackParams.horizontalSegments.find(s => s.id === id);
  if (!segment) return;
  
  segment.length = Math.max(0.1, segment.length);
  trackStore.setHorizontalSegments(trackParams.horizontalSegments);
};

// 处理半径变化
const handleRadiusChange = (id) => {
  const segment = trackParams.horizontalSegments.find(s => s.id === id);
  if (!segment || segment.type !== 'arc') return;
  
  segment.radius = Math.max(1, segment.radius);
  updateArcAngle(segment);
  trackStore.setHorizontalSegments(trackParams.horizontalSegments);
};

// 处理角度变化
const handleAngleChange = (id) => {
  const segment = trackParams.horizontalSegments.find(s => s.id === id);
  if (!segment || segment.type !== 'arc') return;
  
  segment.angle = Math.max(-179, Math.min(179, segment.angle));
  updateArcLength(segment);
  trackStore.setHorizontalSegments(trackParams.horizontalSegments);
};

// 处理纵断面轨道段类型变化
const handleVerticalSegmentTypeChange = (id) => {
  const segment = trackParams.verticalSegments.find(s => s.id === id);
  if (!segment) return;
  
  if (segment.type === 'grade') {
    delete segment.radius;
  } else {
    if (!segment.radius) segment.radius = 3000;
  }
  
  trackStore.setVerticalSegments(trackParams.verticalSegments);
};

// 处理纵断面长度变化
const handleVerticalLengthChange = (id) => {
  const segment = trackParams.verticalSegments.find(s => s.id === id);
  if (!segment) return;
  
  segment.length = Math.max(0.1, segment.length);
  trackStore.setVerticalSegments(trackParams.verticalSegments);
};

// 处理坡度变化
const handleGradeChange = (id) => {
  const segment = trackParams.verticalSegments.find(s => s.id === id);
  if (!segment || segment.type !== 'grade') return;
  
  segment.grade = Math.max(-5, Math.min(5, segment.grade));
  trackStore.setVerticalSegments(trackParams.verticalSegments);
};

// 处理竖曲线半径变化
const handleVerticalCurveRadiusChange = (id) => {
  const segment = trackParams.verticalSegments.find(s => s.id === id);
  if (!segment || segment.type !== 'vertical-curve') return;
  
  segment.radius = Math.max(1000, segment.radius);
  trackStore.setVerticalSegments(trackParams.verticalSegments);
};

// 处理起点高程变化
const handleStartElevationChange = (id) => {
  const segment = trackParams.verticalSegments.find(s => s.id === id);
  if (!segment) return;
  
  trackStore.setVerticalSegments(trackParams.verticalSegments);
};

// 更新圆曲线长度（根据半径和角度计算）
const updateArcLength = (segment) => {
  if (segment.type !== 'arc') return;
  
  const angleRad = segment.angle * Math.PI / 180;
  segment.length = segment.radius * Math.abs(angleRad);
};

// 更新圆曲线角度（根据半径和长度计算）
const updateArcAngle = (segment) => {
  if (segment.type !== 'arc') return;
  
  const angleRad = segment.length / segment.radius;
  segment.angle = angleRad * 180 / Math.PI;
};

// 绘制二维轨道曲线预览
const drawTrackPreview = () => {
  const canvas = trackPreviewCanvas.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const segments = trackParams.horizontalSegments;
  if (segments.length === 0) return;
  
  const points = [];
  let currentX = 0;
  let currentY = 0;
  let currentAngle = 0; // 弧度
  
  segments.forEach((segment) => {
    if (segment.type === 'line') {
      const endX = currentX + segment.length * Math.cos(currentAngle);
      const endY = currentY + segment.length * Math.sin(currentAngle);
      
      points.push({ x: endX, y: endY });
      
      currentX = endX;
      currentY = endY;
    } else if (segment.type === 'arc') {
      const radius = segment.radius;
      const angleRad = segment.angle * Math.PI / 180;
      // 半径的符号直接决定轨道弯曲方向
      const sign = radius > 0 ? 1 : -1;
      
      const centerX = currentX - sign * Math.abs(radius) * Math.sin(currentAngle);
      const centerY = currentY + sign * Math.abs(radius) * Math.cos(currentAngle);
      
      const steps = Math.max(10, Math.abs(Math.round(angleRad * 10)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const theta = currentAngle + angleRad * t;
        
        const x = centerX + sign * Math.abs(radius) * Math.sin(theta);
        const y = centerY - sign * Math.abs(radius) * Math.cos(theta);
        
        points.push({ x, y });
      }
      
      currentX = points[points.length - 1].x;
      currentY = points[points.length - 1].y;
      currentAngle += angleRad;
    }
  });
  
  // 坐标转换和绘制代码
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const padding = 30;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  
  minX = Math.min(minX, 0);
  maxX = Math.max(maxX, 0);
  minY = Math.min(minY, 0);
  maxY = Math.max(maxY, 0);
  
  const widthRange = maxX - minX;
  const heightRange = maxY - minY;
  const scale = Math.min(
    (canvasWidth - 2 * padding) / (widthRange || 1),
    (canvasHeight - 2 * padding) / (heightRange || 1)
  ) * 0.9;
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const offsetX = canvasWidth / 2 - centerX * scale;
  const offsetY = canvasHeight / 2 + centerY * scale;
  
  // 绘制网格背景
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);
  
  for (let y = padding; y < canvasHeight - padding; y += 20) {
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.stroke();
  }
  
  for (let x = padding; x < canvasWidth - padding; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, canvasHeight - padding);
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
  
  // 绘制轨道曲线
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#333333';
  ctx.beginPath();
  
  const startX = offsetX + 0 * scale;
  const startY = offsetY - 0 * scale;
  ctx.moveTo(startX, startY);
  
  points.forEach(point => {
    const canvasX = offsetX + point.x * scale;
    const canvasY = offsetY - point.y * scale;
    ctx.lineTo(canvasX, canvasY);
  });
  
  ctx.stroke();
  
  // 绘制起点标记
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(startX, startY, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // 绘制坐标轴
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  ctx.moveTo(padding, canvasHeight / 2);
  ctx.lineTo(canvasWidth - padding, canvasHeight / 2);
  ctx.stroke();
  
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
};

// 绘制二维纵断面轨道曲线预览
const drawVerticalTrackPreview = () => {
  const canvas = verticalTrackPreviewCanvas.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const segments = trackParams.verticalSegments;
  if (segments.length === 0) return;
  
  const points = [];
  let currentX = 0;
  let currentY = 0;
  
  segments.forEach((segment) => {
    if (segment.type === 'grade') {
      const startElevation = segment.startElevation;
      const endElevation = startElevation + (segment.grade / 100) * segment.length;
      const endX = currentX + segment.length;
      
      points.push({ x: endX, y: endElevation });
      
      currentX = endX;
      currentY = endElevation;
    } else if (segment.type === 'vertical-curve') {
      const startElevation = segment.startElevation;
      const endX = currentX + segment.length;
      
      points.push({ x: endX, y: startElevation });
      
      currentX = endX;
      currentY = startElevation;
    }
  });
  
  // 坐标转换和绘制代码
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const padding = 30;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  points.unshift({ x: 0, y: segments[0].startElevation });
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  
  const widthRange = maxX - minX;
  const heightRange = maxY - minY;
  const scale = Math.min(
    (canvasWidth - 2 * padding) / (widthRange || 1),
    (canvasHeight - 2 * padding) / (heightRange || 1)
  ) * 0.9;
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const offsetX = canvasWidth / 2 - centerX * scale;
  const offsetY = canvasHeight / 2 + centerY * scale;
  
  // 绘制网格背景
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);
  
  for (let y = padding; y < canvasHeight - padding; y += 20) {
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.stroke();
  }
  
  for (let x = padding; x < canvasWidth - padding; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, canvasHeight - padding);
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
  
  // 绘制轨道曲线
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#333333';
  ctx.beginPath();
  
  const startX = offsetX + points[0].x * scale;
  const startY = offsetY - points[0].y * scale;
  ctx.moveTo(startX, startY);
  
  for (let i = 1; i < points.length; i++) {
    const canvasX = offsetX + points[i].x * scale;
    const canvasY = offsetY - points[i].y * scale;
    ctx.lineTo(canvasX, canvasY);
  }
  
  ctx.stroke();
  
  // 绘制起点标记
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(startX, startY, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // 绘制坐标轴
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  ctx.moveTo(padding, canvasHeight / 2);
  ctx.lineTo(canvasWidth - padding, canvasHeight / 2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(canvasWidth / 2, padding);
  ctx.lineTo(canvasWidth / 2, canvasHeight - padding);
  ctx.stroke();
  
  // 绘制坐标轴标签
  ctx.font = '10px Arial';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';
  ctx.fillText('长度 (m)', canvasWidth - 15, canvasHeight / 2 - 5);
  ctx.save();
  ctx.translate(padding + 5, canvasHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('高程 (m)', 0, 0);
  ctx.restore();
};

// 从父组件接收初始化数据的函数
const initData = (data) => {
  if (data && typeof data === 'object') {
    if (data.horizontalSegments) {
      trackParams.horizontalSegments = JSON.parse(JSON.stringify(data.horizontalSegments));
    }
    if (data.verticalSegments) {
      trackParams.verticalSegments = JSON.parse(JSON.stringify(data.verticalSegments));
    }
  }
};

// 获取当前轨道参数的函数，供父组件调用
const getTrackParams = () => {
  return {
    horizontalSegments: JSON.parse(JSON.stringify(trackParams.horizontalSegments)),
    verticalSegments: JSON.parse(JSON.stringify(trackParams.verticalSegments))
  };
};

// 组件挂载时，从store加载数据
onMounted(() => {
  // 从store获取初始数据
  const storeHorizontalSegments = trackStore.getHorizontalSegments();
  const storeVerticalSegments = trackStore.getVerticalSegments();
  
  // 确保数据不为空
  if (storeHorizontalSegments.length === 0) {
    const defaultHorizontalSegments = [
      { id: 1, type: 'line', length: 200 },
      { id: 2, type: 'arc', radius: 200, length: 157.08, angle: 90 },
      { id: 3, type: 'line', length: 200 }
    ];
    trackStore.setHorizontalSegments(defaultHorizontalSegments);
  }
  
  if (storeVerticalSegments.length === 0) {
    const defaultVerticalSegments = [
      { id: 1, type: 'grade', length: 200, grade: 0, startElevation: 0 }
    ];
    trackStore.setVerticalSegments(defaultVerticalSegments);
  }
  
  // 将store数据复制到本地
  trackParams.horizontalSegments = JSON.parse(JSON.stringify(trackStore.getHorizontalSegments()));
  trackParams.verticalSegments = JSON.parse(JSON.stringify(trackStore.getVerticalSegments()));
  
  // 延迟绘制
  nextTick(() => {
    drawTrackPreview();
    drawVerticalTrackPreview();
  });
});

// 监听平断面轨道段变化，自动重绘预览
watch(
  () => [...trackParams.horizontalSegments],
  () => {
    drawTrackPreview();
  },
  { deep: true }
);

// 监听纵断面轨道段变化，自动重绘预览
watch(
  () => [...trackParams.verticalSegments],
  () => {
    drawVerticalTrackPreview();
  },
  { deep: true }
);

// 暴露方法给父组件
defineExpose({
  initData,
  getTrackParams,
  activeTab
});
</script>

<style scoped>
.track-params {
  width: 100%;
}

/* Tabs样式 */
.params-tabs {
  display: flex;
  background-color: #ffffff;
  border-bottom: 2px solid #e1e8ed;
  margin-bottom: 1.5rem;
}

.tab-item {
  padding: 1rem 2rem;
  cursor: pointer;
  font-weight: 500;
  color: #666666;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  margin-right: 1rem;
}

.tab-item:hover {
  color: #007bff;
  background-color: #f5f8fa;
}

.tab-item.active {
  color: #007bff;
  border-bottom-color: #007bff;
  background-color: #ffffff;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 轨道段列表样式 */
.segments-section {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.segments-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333333;
  font-size: 1.2rem;
}

.segments-list {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 1rem;
}

.segment-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e1e8ed;
  transition: background-color 0.2s;
}

.segment-item:hover {
  background-color: #f5f8fa;
}

.segment-item.header {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #333333;
  border-bottom: 2px solid #dee2e6;
}

.segment-id {
  width: 50px;
  text-align: center;
  font-weight: bold;
}

.segment-type {
  width: 100px;
}

.segment-type select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: #ffffff;
}

.segment-length {
  width: 120px;
}

.segment-radius {
  width: 120px;
}

.segment-angle {
  width: 120px;
}

.segment-actions {
  width: 80px;
  text-align: center;
}

.segment-length input,
.segment-radius input,
.segment-angle input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
}

.params-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.8rem 2rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-add {
  background-color: #28a745;
  color: #ffffff;
}

.btn-add:hover {
  background-color: #218838;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
}

.btn-delete {
  background-color: #dc3545;
  color: #ffffff;
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

.btn-delete:hover {
  background-color: #c82333;
  transform: translateY(-1px);
}

.btn-delete:disabled {
  background-color: #dc3545;
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 预览画布样式 */
.preview-canvas {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.preview-canvas h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333333;
  font-size: 1.2rem;
}

.preview-canvas canvas {
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 参数预览样式 */
.params-preview {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.params-preview h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333333;
  font-size: 1.2rem;
}

.preview-content {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-item .label {
  color: #666666;
  font-weight: 500;
}

.preview-item .value {
  color: #007bff;
  font-weight: bold;
}

/* 纵断面参数设置样式 */
.vertical-section {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.vertical-section h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333333;
  font-size: 1.3rem;
}

.vertical-params {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.vertical-params-group {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  align-items: flex-end;
}

.vertical-params .param-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 200px;
}

.vertical-params .param-item label {
  font-weight: 500;
  color: #333333;
}

.vertical-params .param-item input {
  padding: 0.8rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.vertical-preview {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 1.5rem;
  border-left: 4px solid #007bff;
}

.vertical-preview h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333333;
  font-size: 1.1rem;
}

.vertical-preview .preview-info {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.vertical-preview .info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.vertical-preview .info-item .label {
  color: #666666;
  font-size: 0.9rem;
}

.vertical-preview .info-item .value {
  color: #007bff;
  font-weight: bold;
  font-size: 1.2rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .params-tabs {
    flex-direction: column;
  }
  
  .tab-item {
    margin-right: 0;
    border-bottom: 1px solid #e1e8ed;
  }
  
  .segment-item {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .segment-id,
  .segment-type,
  .segment-length,
  .segment-radius,
  .segment-angle,
  .segment-actions {
    width: auto;
    flex: 1;
  }
  
  .vertical-params-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .vertical-params .param-item {
    width: 100%;
  }
  
  .preview-content {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>