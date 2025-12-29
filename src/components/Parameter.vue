<template>
  <div class="track-params-container">
    <div class="params-header">
      <h1>参数设置</h1>
    </div>
    
    <div class="params-tabs">
      <!-- 车辆参数Tabs -->
      <template v-if="activeParamType === 'vehicle'">
        <div 
          class="tab-item" 
          :class="{ 'active': activeTab === 'vehicle-basic' }" 
          @click="activeTab = 'vehicle-basic'"
        >
          基本参数
        </div>
        <div 
          class="tab-item" 
          :class="{ 'active': activeTab === 'vehicle-power' }" 
          @click="activeTab = 'vehicle-power'"
        >
          动力参数
        </div>
      </template>
      
      <!-- 轨道参数Tabs -->
      <template v-else-if="activeParamType === 'track'">
        <div 
          class="tab-item" 
          :class="{ 'active': activeTab === 'horizontal' }" 
          @click="activeTab = 'horizontal'"
        >
          平断面
        </div>
        <div 
          class="tab-item" 
          :class="{ 'active': activeTab === 'vertical' }" 
          @click="activeTab = 'vertical'"
        >
          纵断面
        </div>
      </template>
      
      <!-- 运行参数Tabs -->
      <template v-else-if="activeParamType === 'operation'">
        <div 
          class="tab-item" 
          :class="{ 'active': activeTab === 'operation-mode' }" 
          @click="activeTab = 'operation-mode'"
        >
          运行模式
        </div>
        <div 
          class="tab-item" 
          :class="{ 'active': activeTab === 'safety-params' }" 
          @click="activeTab = 'safety-params'"
        >
          安全参数
        </div>
      </template>
    </div>
    
    <div class="params-main">
      <!-- 侧边栏 -->
      <div class="sidebar">
        <div class="sidebar-content">
          <h3>参数设置</h3>
          <div class="sidebar-menu">
            <div 
              class="sidebar-menu-item" 
              :class="{ 'active': activeParamType === 'vehicle' }"
              @click="activeParamType = 'vehicle'"
            >
              车辆参数
            </div>
            <div 
              class="sidebar-menu-item" 
              :class="{ 'active': activeParamType === 'track' }"
              @click="activeParamType = 'track'"
            >
              轨道参数
            </div>
            <div 
              class="sidebar-menu-item" 
              :class="{ 'active': activeParamType === 'operation' }"
              @click="activeParamType = 'operation'"
            >
              运行参数
            </div>
          </div>
          
          <!-- 轨道参数统计信息 -->
          <div v-if="activeParamType === 'track'" class="sidebar-stats">
            <div class="sidebar-section">
              <h4>平断面</h4>
              <p>轨道段总数: {{ trackParams.horizontalSegments.length }}</p>
              <p>总长度: {{ totalLength.toFixed(2) }} m</p>
            </div>
            <div class="sidebar-section">
              <h4>纵断面</h4>
              <p>轨道段总数: {{ trackParams.verticalSegments.length }}</p>
              <p>总长度: {{ verticalTotalLength.toFixed(2) }} m</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 拖拽把手 -->
      <div class="sidebar-resizer" ref="sidebarResizer"></div>
      
      <!-- 主内容区域 -->
      <div class="main-content">
        <!-- 车辆参数内容 -->
        <div v-if="activeParamType === 'vehicle'">
          <!-- 基本参数 -->
          <div v-if="activeTab === 'vehicle-basic'">
            <h2>车辆基本参数</h2>
            <div class="params-form">
              <div class="form-group">
                <label>车辆名称</label>
                <input type="text" v-model="vehicleParams.name" placeholder="输入车辆名称" />
              </div>
              <div class="form-group">
                <label>车辆类型</label>
                <select v-model="vehicleParams.type">
                  <option value="train">列车</option>
                  <option value="locomotive">机车</option>
                  <option value="car">车厢</option>
                </select>
              </div>
              <div class="form-group">
                <label>车辆重量 (t)</label>
                <input type="number" v-model.number="vehicleParams.weight" min="1" step="0.1" />
              </div>
              <div class="form-group">
                <label>最大速度 (km/h)</label>
                <input type="number" v-model.number="vehicleParams.maxSpeed" min="1" step="1" />
              </div>
              <div class="form-group">
                <label>轴数</label>
                <input type="number" v-model.number="vehicleParams.axles" min="2" step="2" />
              </div>
            </div>
          </div>
          
          <!-- 动力参数 -->
          <div v-if="activeTab === 'vehicle-power'">
            <h2>车辆动力参数</h2>
            <div class="params-form">
              <div class="form-group">
                <label>动力类型</label>
                <select v-model="vehicleParams.powerType">
                  <option value="electric">电力</option>
                  <option value="diesel">柴油</option>
                  <option value="hybrid">混合动力</option>
                </select>
              </div>
              <div class="form-group">
                <label>最大功率 (kW)</label>
                <input type="number" v-model.number="vehicleParams.maxPower" min="1" step="1" />
              </div>
              <div class="form-group">
                <label>牵引力 (kN)</label>
                <input type="number" v-model.number="vehicleParams.traction" min="1" step="0.1" />
              </div>
              <div class="form-group">
                <label>制动功率 (kW)</label>
                <input type="number" v-model.number="vehicleParams.brakePower" min="1" step="1" />
              </div>
              <div class="form-group">
                <label>燃油/电量容量</label>
                <input type="number" v-model.number="vehicleParams.capacity" min="1" step="1" />
              </div>
            </div>
          </div>
        </div>
        
        <!-- 轨道参数内容 -->
        <div v-if="activeParamType === 'track'">
          <!-- 平断面参数设置 -->
          <div v-if="activeTab === 'horizontal'">
        <!-- 轨道段列表 -->
        <div class="segments-list">
          <div class="segment-item header">
            <div class="segment-id">ID</div>
            <div class="segment-type">类型</div>
            <div class="segment-length">长度 (m)</div>
            <div class="segment-radius" v-if="showRadiusColumn">半径 (m)</div>
            <div class="segment-angle" v-if="showAngleColumn">角度 (°)</div>
            <div class="segment-actions">
              操作
              <button class="btn btn-add-icon" @click="addSegment" title="添加轨道段">+</button>
            </div>
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
                type="number" 
                v-model.number="segment.length" 
                min="0.1"
                step="0.1"
                @input="handleLengthChange(segment.id)"
              />
            </div>
            <div class="segment-radius" v-if="segment.type === 'arc'">
              <input 
                type="number" 
                v-model.number="segment.radius" 
                min="1"
                step="1"
                @input="handleRadiusChange(segment.id)"
              />
            </div>
            <div class="segment-angle" v-if="segment.type === 'arc'">
              <input 
                type="number" 
                v-model.number="segment.angle" 
                :min="segment.type === 'arc' ? -179 : 0"
                :max="segment.type === 'arc' ? 179 : 360"
                step="1"
                @input="handleAngleChange(segment.id)"
              />
            </div>
            <div class="segment-actions">
              <button class="btn btn-delete" @click="deleteSegment(segment.id)">删除</button>
            </div>
          </div>
        </div>
        
        
        
        <!-- 当前配置预览 -->
        <div class="params-preview">
          <h3>当前轨道配置预览</h3>
          <div class="preview-content">
            <div class="preview-item">
              <span class="label">轨道段总数：</span>
              <span class="value">{{ trackParams.horizontalSegments.length }}</span>
            </div>
            <div class="preview-item">
              <span class="label">直线段数量：</span>
              <span class="value">{{ trackParams.horizontalSegments.filter(s => s.type === 'line').length }}</span>
            </div>
            <div class="preview-item">
              <span class="label">圆曲线段数量：</span>
              <span class="value">{{ trackParams.horizontalSegments.filter(s => s.type === 'arc').length }}</span>
            </div>
            <div class="preview-item">
              <span class="label">总长度：</span>
              <span class="value">{{ totalLength.toFixed(2) }} m</span>
            </div>
          </div>
          <!-- 二维轨道曲线预览 -->
          <div class="preview-canvas">
            <canvas ref="trackPreviewCanvas" width="400" height="300"></canvas>
          </div>
        </div>
      </div>
      
      <!-- 纵断面参数设置 -->
      <div v-if="activeTab === 'vertical'">
        <!-- 轨道段列表 -->
        <div class="segments-list">
          <div class="segment-item header">
            <div class="segment-id">ID</div>
            <div class="segment-type">类型</div>
            <div class="segment-length">长度 (m)</div>
            <div class="segment-grade">坡度 (%)</div>
            <div class="segment-start-elevation">起点高程 (m)</div>
            <div class="segment-actions">
              操作
              <button class="btn btn-add-icon" @click="addSegment" title="添加轨道段">+</button>
            </div>
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
                type="number" 
                v-model.number="segment.length" 
                min="0.1"
                step="0.1"
                @input="handleVerticalLengthChange(segment.id)"
              />
            </div>
            <div class="segment-grade" v-if="segment.type === 'grade'">
              <input 
                type="number" 
                v-model.number="segment.grade" 
                min="-5"
                max="5"
                step="0.1"
                @input="handleGradeChange(segment.id)"
              />
            </div>
            <div class="segment-radius" v-if="segment.type === 'vertical-curve'">
              <input 
                type="number" 
                v-model.number="segment.radius" 
                min="1000"
                step="100"
                @input="handleVerticalCurveRadiusChange(segment.id)"
              />
            </div>
            <div class="segment-start-elevation">
              <input 
                type="number" 
                v-model.number="segment.startElevation" 
                step="0.01"
                @input="handleStartElevationChange(segment.id)"
              />
            </div>
            <div class="segment-actions">
              <button class="btn btn-delete" @click="deleteVerticalSegment(segment.id)">删除</button>
            </div>
          </div>
        </div>
        
        <!-- 当前配置预览 -->
        <div class="params-preview">
          <h3>当前纵断面配置预览</h3>
          <div class="preview-content">
            <div class="preview-item">
              <span class="label">轨道段总数：</span>
              <span class="value">{{ trackParams.verticalSegments.length }}</span>
            </div>
            <div class="preview-item">
              <span class="label">坡道数量：</span>
              <span class="value">{{ trackParams.verticalSegments.filter(s => s.type === 'grade').length }}</span>
            </div>
            <div class="preview-item">
              <span class="label">竖曲线数量：</span>
              <span class="value">{{ trackParams.verticalSegments.filter(s => s.type === 'vertical-curve').length }}</span>
            </div>
            <div class="preview-item">
              <span class="label">总长度：</span>
              <span class="value">{{ verticalTotalLength.toFixed(2) }} m</span>
            </div>
          </div>
          <!-- 二维纵断面轨道曲线预览 -->
          <div class="preview-canvas">
            <canvas ref="verticalTrackPreviewCanvas" width="400" height="300"></canvas>
          </div>
        </div>
      </div>
    </div> <!-- 关闭轨道参数内容 -->
      
      <!-- 运行参数内容 -->
      <div v-if="activeParamType === 'operation'">
          <!-- 运行模式 -->
          <div v-if="activeTab === 'operation-mode'">
            <h2>运行模式参数</h2>
            <div class="params-form">
              <div class="form-group">
                <label>运行模式</label>
                <select v-model="operationParams.mode">
                  <option value="manual">手动</option>
                  <option value="automatic">自动</option>
                  <option value="semi-automatic">半自动</option>
                </select>
              </div>
              <div class="form-group">
                <label>运行速度 (km/h)</label>
                <input type="number" v-model.number="operationParams.speed" min="1" step="1" />
              </div>
              <div class="form-group">
                <label>加速度 (m/s²)</label>
                <input type="number" v-model.number="operationParams.acceleration" min="0.1" step="0.1" />
              </div>
              <div class="form-group">
                <label>减速度 (m/s²)</label>
                <input type="number" v-model.number="operationParams.deceleration" min="0.1" step="0.1" />
              </div>
              <div class="form-group">
                <label>停靠时间 (s)</label>
                <input type="number" v-model.number="operationParams.stopTime" min="0" step="1" />
              </div>
            </div>
          </div>
          
          <!-- 安全参数 -->
          <div v-if="activeTab === 'safety-params'">
            <h2>安全参数</h2>
            <div class="params-form">
              <div class="form-group">
                <label>安全距离 (m)</label>
                <input type="number" v-model.number="operationParams.safetyDistance" min="1" step="1" />
              </div>
              <div class="form-group">
                <label>最大允许坡度 (%)</label>
                <input type="number" v-model.number="operationParams.maxGrade" min="0" max="5" step="0.1" />
              </div>
              <div class="form-group">
                <label>曲线限速系数</label>
                <input type="number" v-model.number="operationParams.curveSpeedFactor" min="0.5" max="1" step="0.01" />
              </div>
              <div class="form-group">
                <label>紧急制动触发阈值</label>
                <select v-model="operationParams.emergencyBrakeThreshold">
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div> <!-- 关闭main-content -->
      
      <!-- 右下角提交按钮 -->
      <div class="floating-submit">
        <button class="btn btn-submit" @click="saveAndNavigate">提交</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { trackStore } from '../store/trackStore';

const router = useRouter();
// 轨道预览canvas引用
const trackPreviewCanvas = ref(null);
// 纵断面轨道预览canvas引用
const verticalTrackPreviewCanvas = ref(null);
// 侧边栏拖拽相关引用
const sidebarResizer = ref(null);
const sidebar = ref(null);
const isResizing = ref(false);
const sidebarWidth = ref(250); // 初始宽度

// 侧边栏拖拽功能
const initSidebarResize = () => {
  if (!sidebarResizer.value) return;
  
  sidebar.value = document.querySelector('.sidebar');
  
  const onMouseDown = (e) => {
    isResizing.value = true;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // 隐藏选择文本的光标样式
    document.body.style.userSelect = 'none';
  };
  
  const onMouseMove = (e) => {
    if (!isResizing.value) return;
    
    // 获取侧边栏的位置
    const sidebarRect = sidebar.value.getBoundingClientRect();
    const containerRect = document.querySelector('.track-params-container').getBoundingClientRect();
    
    // 计算新的侧边栏宽度（考虑容器边界）
    let newWidth = e.clientX - containerRect.left;
    
    // 设置最小和最大宽度限制
    newWidth = Math.max(200, Math.min(500, newWidth));
    
    // 更新侧边栏宽度
    sidebarWidth.value = newWidth;
    sidebar.value.style.width = `${newWidth}px`;
  };
  
  const onMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // 恢复选择文本的光标样式
    document.body.style.userSelect = '';
  };
  
  // 添加鼠标按下事件监听
  sidebarResizer.value.addEventListener('mousedown', onMouseDown);
};

// 参数类型切换状态
const activeParamType = ref('track');

// Tab切换状态
const activeTab = ref('horizontal');

// 本地轨道参数状态，与store保持同步
const trackParams = reactive({
  horizontalSegments: [],
  verticalSegments: []
});

// 车辆参数状态
const vehicleParams = reactive({
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
});

// 运行参数状态
const operationParams = reactive({
  mode: 'automatic',
  speed: 80,
  acceleration: 0.5,
  deceleration: 0.8,
  stopTime: 30,
  safetyDistance: 50,
  maxGrade: 3,
  curveSpeedFactor: 0.8,
  emergencyBrakeThreshold: 'medium'
});

// 监听参数类型变化，自动切换到对应默认Tab
watch(activeParamType, (newType) => {
  switch (newType) {
    case 'vehicle':
      activeTab.value = 'vehicle-basic';
      break;
    case 'track':
      activeTab.value = 'horizontal';
      break;
    case 'operation':
      activeTab.value = 'operation-mode';
      break;
  }
});

// 纵断面参数
const verticalParams = reactive({
  startElevation: 0,  // 起点高程 (m)
  grade: 0,          // 坡度 (%)
  elevationLength: 100,  // 坡段长度 (m)
  curveRadius: 3000   // 竖曲线半径 (m)
});

// 纵断面轨道段列表
const verticalSegmentsList = computed(() => {
  return trackParams.verticalSegments;
});

// 计算终点高程
const endElevation = computed(() => {
  return verticalParams.startElevation + (verticalParams.grade / 100) * verticalParams.elevationLength;
});

// 计算坡段高差
const elevationDifference = computed(() => {
  return (verticalParams.grade / 100) * verticalParams.elevationLength;
});

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

// 添加轨道段
const addSegment = () => {
  if (activeTab.value === 'horizontal') {
    // 添加平断面轨道段
    // 生成唯一ID
    const maxId = trackParams.horizontalSegments.length > 0 
      ? Math.max(...trackParams.horizontalSegments.map(s => s.id)) 
      : 0;
    
    // 默认添加直线段
    const newSegment = {
      id: maxId + 1,
      type: 'line',
      length: 100
    };
    
    // 添加到本地状态
    trackParams.horizontalSegments.push(newSegment);
    
    // 同步到store
    trackStore.setHorizontalSegments(trackParams.horizontalSegments);
    
    console.log('添加平断面轨道段:', newSegment);
  } else {
    // 添加纵断面轨道段
    // 生成唯一ID
    const maxId = trackParams.verticalSegments.length > 0 
      ? Math.max(...trackParams.verticalSegments.map(s => s.id)) 
      : 0;
    
    // 计算新轨道段的起点高程（如果有前一个轨道段，则使用前一个的终点高程）
    let startElevation = 0;
    if (trackParams.verticalSegments.length > 0) {
      const lastSegment = trackParams.verticalSegments[trackParams.verticalSegments.length - 1];
      // 计算上一个轨道段的终点高程
      if (lastSegment.type === 'grade') {
        startElevation = lastSegment.startElevation + (lastSegment.grade / 100) * lastSegment.length;
      } else {
        // 竖曲线的终点高程计算比较复杂，这里简化处理
        startElevation = lastSegment.startElevation;
      }
    }
    
    // 默认添加坡道段
    const newSegment = {
      id: maxId + 1,
      type: 'grade',
      length: 200,
      grade: 0,
      startElevation: startElevation
    };
    
    // 添加到本地状态
    trackParams.verticalSegments.push(newSegment);
    
    // 同步到store
    trackStore.setVerticalSegments(trackParams.verticalSegments);
    
    console.log('添加纵断面轨道段:', newSegment);
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
    const deletedSegment = trackParams.horizontalSegments.splice(index, 1)[0];
    console.log('删除轨道段:', deletedSegment);
    
    // 同步到store
    trackStore.setHorizontalSegments(trackParams.horizontalSegments);
  }
}

// 处理轨道段类型变化
const handleSegmentTypeChange = (id) => {
  const segment = trackParams.horizontalSegments.find(s => s.id === id);
  if (!segment) return;
  
  if (segment.type === 'line') {
    // 切换到直线，移除圆曲线属性
    delete segment.radius;
    delete segment.angle;
  } else {
    // 切换到圆曲线，添加默认值
    if (!segment.radius) segment.radius = 200;
    if (!segment.angle) segment.angle = 90;
    // 自动计算长度：L = R * θ (θ为弧度)
    updateArcLength(segment);
  }
  
  // 同步到store
  trackStore.setHorizontalSegments(trackParams.horizontalSegments);
  console.log('修改轨道段类型:', segment);
};

// 处理长度变化
const handleLengthChange = (id) => {
  const segment = trackParams.horizontalSegments.find(s => s.id === id);
  if (!segment) return;
  
  // 确保长度为正数
  segment.length = Math.max(0.1, segment.length);
  
  // 同步到store
  trackStore.setHorizontalSegments(trackParams.horizontalSegments);
  console.log('修改轨道段长度:', segment);
};

// 处理半径变化
const handleRadiusChange = (id) => {
  const segment = trackParams.horizontalSegments.find(s => s.id === id);
  if (!segment || segment.type !== 'arc') return;
  
  // 确保半径为正数
  segment.radius = Math.max(1, segment.radius);
  
  // 自动更新角度
  updateArcAngle(segment);
  
  // 同步到store
  trackStore.setHorizontalSegments(trackParams.horizontalSegments);
  console.log('修改轨道段半径:', segment);
};

// 处理角度变化
const handleAngleChange = (id) => {
  const segment = trackParams.horizontalSegments.find(s => s.id === id);
  if (!segment || segment.type !== 'arc') return;
  
  // 确保角度在有效范围内
  segment.angle = Math.max(-179, Math.min(179, segment.angle));
  
  // 自动更新长度
  updateArcLength(segment);
  
  // 同步到store
  trackStore.setHorizontalSegments(trackParams.horizontalSegments);
  console.log('修改轨道段角度:', segment);
};

// 更新圆曲线长度（根据半径和角度计算）
const updateArcLength = (segment) => {
  if (segment.type !== 'arc') return;
  
  // L = R * θ (θ为弧度)
  const angleRad = segment.angle * Math.PI / 180;
  segment.length = segment.radius * Math.abs(angleRad);
};

// 更新圆曲线角度（根据半径和长度计算）
const updateArcAngle = (segment) => {
  if (segment.type !== 'arc') return;
  
  // θ = L / R (结果为弧度，转换为角度)
  const angleRad = segment.length / segment.radius;
  segment.angle = angleRad * 180 / Math.PI;
};

// 处理纵断面轨道段类型变化
const handleVerticalSegmentTypeChange = (id) => {
  const segment = trackParams.verticalSegments.find(s => s.id === id);
  if (!segment) return;
  
  if (segment.type === 'grade') {
    // 切换到坡道，移除竖曲线属性
    delete segment.radius;
  } else {
    // 切换到竖曲线，添加默认值
    if (!segment.radius) segment.radius = 3000;
  }
  
  // 同步到store
  trackStore.setVerticalSegments(trackParams.verticalSegments);
  console.log('修改纵断面轨道段类型:', segment);
};

// 处理纵断面长度变化
const handleVerticalLengthChange = (id) => {
  const segment = trackParams.verticalSegments.find(s => s.id === id);
  if (!segment) return;
  
  // 确保长度为正数
  segment.length = Math.max(0.1, segment.length);
  
  // 同步到store
  trackStore.setVerticalSegments(trackParams.verticalSegments);
  console.log('修改纵断面轨道段长度:', segment);
};

// 处理坡度变化
const handleGradeChange = (id) => {
  const segment = trackParams.verticalSegments.find(s => s.id === id);
  if (!segment || segment.type !== 'grade') return;
  
  // 确保坡度在有效范围内
  segment.grade = Math.max(-5, Math.min(5, segment.grade));
  
  // 同步到store
  trackStore.setVerticalSegments(trackParams.verticalSegments);
  console.log('修改纵断面轨道段坡度:', segment);
};

// 处理竖曲线半径变化
const handleVerticalCurveRadiusChange = (id) => {
  const segment = trackParams.verticalSegments.find(s => s.id === id);
  if (!segment || segment.type !== 'vertical-curve') return;
  
  // 确保半径为正数
  segment.radius = Math.max(1000, segment.radius);
  
  // 同步到store
  trackStore.setVerticalSegments(trackParams.verticalSegments);
  console.log('修改纵断面轨道段竖曲线半径:', segment);
};

// 处理起点高程变化
const handleStartElevationChange = (id) => {
  const segment = trackParams.verticalSegments.find(s => s.id === id);
  if (!segment) return;
  
  // 同步到store
  trackStore.setVerticalSegments(trackParams.verticalSegments);
  console.log('修改纵断面轨道段起点高程:', segment);
};

// 删除纵断面轨道段
const deleteVerticalSegment = (id) => {
  if (trackParams.verticalSegments.length <= 1) {
    alert('至少需要保留一个轨道段！');
    return;
  }
  
  const index = trackParams.verticalSegments.findIndex(s => s.id === id);
  if (index !== -1) {
    const deletedSegment = trackParams.verticalSegments.splice(index, 1)[0];
    console.log('删除纵断面轨道段:', deletedSegment);
    
    // 同步到store
    trackStore.setVerticalSegments(trackParams.verticalSegments);
  }
};

// 绘制二维纵断面轨道曲线预览
const drawVerticalTrackPreview = () => {
  const canvas = verticalTrackPreviewCanvas.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 获取轨道段数据
  const segments = trackParams.verticalSegments;
  if (segments.length === 0) return;
  
  // 计算每个轨道段的坐标点
  const points = [];
  let currentX = 0;
  let currentY = 0;
  
  segments.forEach((segment, index) => {
    if (segment.type === 'grade') {
      // 坡道段
      const startElevation = segment.startElevation;
      const endElevation = startElevation + (segment.grade / 100) * segment.length;
      const endX = currentX + segment.length;
      
      points.push({ x: endX, y: endElevation });
      
      currentX = endX;
      currentY = endElevation;
    } else if (segment.type === 'vertical-curve') {
      // 竖曲线段 - 简化处理，绘制为直线
      const startElevation = segment.startElevation;
      // 假设竖曲线连接前后坡道，这里简化为直线
      const endX = currentX + segment.length;
      
      points.push({ x: endX, y: startElevation });
      
      currentX = endX;
      currentY = startElevation;
    }
  });
  
  // 计算坐标转换参数
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const padding = 30;
  
  // 找出点的最小和最大坐标
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  // 添加起点
  points.unshift({ x: 0, y: segments[0].startElevation });
  
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
    (canvasWidth - 2 * padding) / (widthRange || 1),
    (canvasHeight - 2 * padding) / (heightRange || 1)
  ) * 0.9; // 留一些余量
  
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
  
  // 绘制轨道曲线
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#333333';
  ctx.beginPath();
  
  // 起点
  const startX = offsetX + points[0].x * scale;
  const startY = offsetY - points[0].y * scale;
  ctx.moveTo(startX, startY);
  
  // 绘制其他点
  for (let i = 1; i < points.length; i++) {
    const canvasX = offsetX + points[i].x * scale;
    const canvasY = offsetY - points[i].y * scale; // Y轴翻转
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
  ctx.fillText('长度 (m)', canvasWidth - 15, canvasHeight / 2 - 5);
  ctx.save();
  ctx.translate(padding + 5, canvasHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('高程 (m)', 0, 0);
  ctx.restore();
};

// 绘制二维轨道曲线预览
const drawTrackPreview = () => {
  const canvas = trackPreviewCanvas.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 获取轨道段数据
  const segments = trackParams.horizontalSegments;
  if (segments.length === 0) return;
  
  // 计算每个轨道段的坐标点
  const points = [];
  let currentX = 0;
  let currentY = 0;
  let currentAngle = 0; // 弧度
  
  segments.forEach((segment, index) => {
    if (segment.type === 'line') {
      // 直线段
      const endX = currentX + segment.length * Math.cos(currentAngle);
      const endY = currentY + segment.length * Math.sin(currentAngle);
      
      points.push({ x: endX, y: endY });
      
      currentX = endX;
      currentY = endY;
    } else if (segment.type === 'arc') {
      // 圆曲线段
      const radius = segment.radius;
      const angleRad = segment.angle * Math.PI / 180;
      const sign = angleRad > 0 ? 1 : -1;
      
      // 计算圆心
      const centerX = currentX - sign * radius * Math.sin(currentAngle);
      const centerY = currentY + sign * radius * Math.cos(currentAngle);
      
      // 生成曲线上的点
      const steps = Math.max(10, Math.abs(Math.round(angleRad * 10)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const theta = currentAngle + angleRad * t;
        
        const x = centerX + sign * radius * Math.sin(theta);
        const y = centerY - sign * radius * Math.cos(theta);
        
        points.push({ x, y });
      }
      
      currentX = points[points.length - 1].x;
      currentY = points[points.length - 1].y;
      currentAngle += angleRad;
    }
  });
  
  // 计算坐标转换参数
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const padding = 30;
  
  // 找出点的最小和最大坐标
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  
  // 添加起点
  minX = Math.min(minX, 0);
  maxX = Math.max(maxX, 0);
  minY = Math.min(minY, 0);
  maxY = Math.max(maxY, 0);
  
  // 计算缩放比例
  const widthRange = maxX - minX;
  const heightRange = maxY - minY;
  const scale = Math.min(
    (canvasWidth - 2 * padding) / (widthRange || 1),
    (canvasHeight - 2 * padding) / (heightRange || 1)
  ) * 0.9; // 留一些余量
  
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
  
  // 绘制轨道曲线
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#333333';
  ctx.beginPath();
  
  // 起点
  const startX = offsetX + 0 * scale;
  const startY = offsetY - 0 * scale;
  ctx.moveTo(startX, startY);
  
  // 绘制其他点
  points.forEach(point => {
    const canvasX = offsetX + point.x * scale;
    const canvasY = offsetY - point.y * scale; // Y轴翻转
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
};

// 保存并跳转到轨道视图
const saveAndNavigate = async () => {
  console.log('保存并跳转到轨道视图');
  console.log('当前平断面轨道段参数:', trackParams.horizontalSegments);
  console.log('当前纵断面轨道段参数:', trackParams.verticalSegments);
  console.log('当前车辆参数:', vehicleParams);
  console.log('当前运行参数:', operationParams);
  
  // 同步到store
  trackStore.setHorizontalSegments(trackParams.horizontalSegments);
  trackStore.setVerticalSegments(trackParams.verticalSegments);
  trackStore.setVehicleParams(vehicleParams);
  trackStore.setOperationParams(operationParams);
  console.log('保存到trackStore - 平断面:', trackStore.trackParams.horizontalSegments);
  console.log('保存到trackStore - 纵断面:', trackStore.trackParams.verticalSegments);
  console.log('保存到trackStore - 车辆参数:', trackStore.trackParams.vehicleParams);
  console.log('保存到trackStore - 运行参数:', trackStore.trackParams.operationParams);
  
  // 确保数据已更新
  await nextTick();
  
  // 根据当前标签页决定导航目标
  if (activeTab.value === 'horizontal') {
    // 跳转到纵断面标签页
    activeTab.value = 'vertical';
    console.log('已跳转至纵断面标签页');
  } else {
    // 跳转到轨道视图页面
    router.push('/track').then(() => {
      console.log('已跳转至轨道视图页面');
    }).catch(err => {
      console.error('跳转失败:', err);
    });
  }
};

// 组件挂载时，从store加载数据
onMounted(() => {
  console.log('Parameter.vue mounted');
  
  // 从store获取初始数据
  const storeHorizontalSegments = trackStore.getHorizontalSegments();
  const storeVerticalSegments = trackStore.getVerticalSegments();
  console.log('从trackStore获取的初始平断面轨道段:', storeHorizontalSegments);
  console.log('从trackStore获取的初始纵断面轨道段:', storeVerticalSegments);
  
  // 确保trackStore中的平断面轨道段数组不为空（在初始化时检查）
  if (storeHorizontalSegments.length === 0) {
    console.log('trackStore平断面为空，使用默认轨道段');
    const defaultHorizontalSegments = [
      { id: 1, type: 'line', length: 200 },
      { id: 2, type: 'arc', radius: 200, length: 157.08, angle: 90 }, // 长度=半径*π/2，对应90度
      { id: 3, type: 'line', length: 200 }
    ];
    // 设置到store
    trackStore.setHorizontalSegments(defaultHorizontalSegments);
    console.log('已设置默认平断面轨道段到trackStore');
  }
  
  // 确保trackStore中的纵断面轨道段数组不为空（在初始化时检查）
  if (storeVerticalSegments.length === 0) {
    console.log('trackStore纵断面为空，使用默认轨道段');
    const defaultVerticalSegments = [
      { id: 1, type: 'grade', length: 200, grade: 0, startElevation: 0 }
    ];
    // 设置到store
    trackStore.setVerticalSegments(defaultVerticalSegments);
    console.log('已设置默认纵断面轨道段到trackStore');
  }
  
  // 将store数据复制到本地
  trackParams.horizontalSegments = JSON.parse(JSON.stringify(trackStore.getHorizontalSegments()));
  trackParams.verticalSegments = JSON.parse(JSON.stringify(trackStore.getVerticalSegments()));
  console.log('本地平断面轨道段数据初始化完成:', trackParams.horizontalSegments);
  console.log('本地纵断面轨道段数据初始化完成:', trackParams.verticalSegments);
  
  // 延迟绘制和初始化拖拽功能，确保DOM已渲染
  nextTick(() => {
    drawTrackPreview();
    drawVerticalTrackPreview();
    initSidebarResize();
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
</script>

<style scoped>
.track-params-container {
  width: 100%;
  height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Tabs样式 */
.params-tabs {
  display: flex;
  background-color: #ffffff;
  border-bottom: 2px solid #e1e8ed;
  padding: 0 3rem;
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

.params-header {
  background-color: #ffffff;
  padding: 1.5rem 3rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.params-header h1 {
  margin: 0;
  font-size: 2rem;
  color: #333333;
}

.params-main {
  flex: 1;
  padding: 0;
  display: flex;
  flex-direction: row;
  gap: 0;
  overflow: hidden;
  height: 100%;
}

.segments-list {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
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

.btn-submit {
  background-color: #007bff;
  color: #ffffff;
}

.btn-submit:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
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

/* 添加轨道段图标按钮样式 */
.btn-add-icon {
  background-color: #28a745;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  width: 10px;
  height: 10px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.5rem;
  transition: all 0.2s;
}

.btn-add-icon:hover {
  background-color: #218838;
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
}

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

/* 侧边栏样式 */
.params-main {
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 0;
}

.sidebar {
  width: 250px;
  background-color: #f8f9fa;
  border-right: 1px solid #dee2e6;
  padding: 1.5rem;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
  overflow-y: auto;
  transition: width 0.3s ease;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar h3 {
  margin-top: 0;
  color: #333333;
  font-size: 1.2rem;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 0.5rem;
}

.sidebar-section {
  background-color: #ffffff;
  border-radius: 6px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sidebar-section h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #007bff;
  font-size: 1rem;
}

.sidebar-section p {
  margin: 0.25rem 0;
  color: #666666;
  font-size: 0.9rem;
}

/* 侧边栏菜单样式 */
.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.sidebar-menu-item {
  padding: 0.8rem 1rem;
  background-color: #ffffff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #dee2e6;
  color: #333333;
  font-weight: 500;
  border-left: 3px solid transparent;
}

.sidebar-menu-item:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: #007bff;
}

.sidebar-menu-item.active {
  background-color: #007bff;
  color: #ffffff;
  border-color: #007bff;
  border-left-color: #0056b3;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
}

.sidebar-menu-item.active:hover {
  background-color: #0056b3;
  border-color: #0056b3;
}

/* 参数表单样式 */
.params-form {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: 2rem 0;
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 300px;
}

.form-group label {
  font-weight: 500;
  color: #333333;
  font-size: 0.95rem;
}

.form-group input,
.form-group select {
  padding: 0.8rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s ease;
  width: 100%;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-group input[type="number"] {
  text-align: right;
}

/* 拖拽把手样式 */
.sidebar-resizer {
  width: 6px;
  background-color: #dee2e6;
  cursor: col-resize;
  transition: background-color 0.2s;
}

/* 浮动提交按钮样式 */
.floating-submit {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
}

.floating-submit .btn-submit {
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
}

.sidebar-resizer:hover {
  background-color: #adb5bd;
}

.sidebar-resizer:active {
  background-color: #6c757d;
}

/* 主内容区域样式 */
.main-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem 3rem;
  height: 100%;
  min-height: 0;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #007bff #f5f5f5;
}

/* Webkit浏览器滚动条样式 */
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background-color: #007bff;
  border-radius: 4px;
  border: 2px solid #f5f5f5;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background-color: #0056b3;
}

/* 二维轨道曲线预览样式 */
.preview-canvas {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.preview-canvas canvas {
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 纵断面参数设置样式 */
.vertical-section {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 2rem;
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
  gap: 2rem;
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
  .params-header {
    padding: 1rem;
  }
  
  .params-main {
    padding: 1rem;
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
  
  .params-actions {
    flex-direction: column;
  }
  
  .preview-content {
    flex-direction: column;
    gap: 1rem;
  }
}





/* 参数类型切换时的过渡效果 */
.main-content > div {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

/* 确保所有参数内容都有一致的内边距 */
.vehicle-params,
.operation-params {
  padding: 1rem 0;
}

/* 缩小添加按钮的尺寸 */
.btn-add-icon {
  padding: 0.4rem 0.8rem;
  font-size: 1.2rem;
  line-height: 1;
  width: auto;
  min-width: auto;
  height: auto;
}
</style>