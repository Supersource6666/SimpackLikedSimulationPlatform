<template>
  <div class="parameter-container">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="menu-title">动力学参数</div>
      <div class="menu-items">
        <!-- 动力学参数部分 -->
        <div class="menu-group">
          <div 
            class="menu-item" 
            :class="{ active: activeTab === 'vehicle' }" 
            @click="activeTab = 'vehicle'"
          >
            <div class="menu-icon">🚆</div>
            <div class="menu-text">车辆参数</div>
          </div>
          <div 
            class="menu-item" 
            :class="{ active: activeTab === 'track' }" 
            @click="activeTab = 'track'"
          >
            <div class="menu-icon">🛤️</div>
            <div class="menu-text">轨道参数</div>
          </div>
          <div 
            class="menu-item" 
            :class="{ active: activeTab === 'operation' }" 
            @click="activeTab = 'operation'"
          >
            <div class="menu-icon">⚙️</div>
            <div class="menu-text">运行参数</div>
          </div>
        </div>
        
        <!-- 三维场景展示部分 -->
        <div class="menu-group">
          <div class="menu-group-title">三维场景展示</div>
          <div 
            class="menu-item sub-menu-item" 
            :class="{ active: activeTab === 'trainVisualization' }" 
            @click="activeTab = 'trainVisualization'"
          >
            <div class="menu-icon">🔄</div>
            <div class="menu-text">列车编组可视化</div>
          </div>
          <div 
            class="menu-item sub-menu-item" 
            :class="{ active: activeTab === 'wheelRailAnalysis' }" 
            @click="activeTab = 'wheelRailAnalysis'"
          >
            <div class="menu-icon">🔍</div>
            <div class="menu-text">轮轨接触分析</div>
          </div>
        </div>
        
        <!-- 动力学安全评估部分 -->
        <div class="menu-group">
          <div class="menu-group-title">动力学安全评估</div>
          <div 
            class="menu-item sub-menu-item" 
            :class="{ active: activeTab === 'dataAnalysis' }" 
            @click="activeTab = 'dataAnalysis'"
          >
            <div class="menu-icon">📊</div>
            <div class="menu-text">数据分析</div>
          </div>
          <div 
            class="menu-item sub-menu-item" 
            :class="{ active: activeTab === 'evaluationResults' }" 
            @click="activeTab = 'evaluationResults'"
          >
            <div class="menu-icon">✅</div>
            <div class="menu-text">评估结果</div>
          </div>
        </div>
      </div>
      
      <!-- 侧边栏拖拽调整大小 -->
      <div 
        class="sidebar-resizer" 
        @mousedown="startResize"
      ></div>
    </div>
    
    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 标签页内容 -->
      <div class="tab-content">
        <VehicleParams 
          v-if="activeTab === 'vehicle'" 
          ref="vehicleParamsRef"
        />
        <TrackParams 
          v-if="activeTab === 'track'" 
          ref="trackParamsRef"
        />
        <OperationParams 
          v-if="activeTab === 'operation'" 
          ref="operationParamsRef"
        />
        <!-- 新增内容占位符 -->
        <div v-if="activeTab === 'trainVisualization'" class="placeholder-content">
          <h2>列车编组可视化</h2>
          <p>此处将显示列车编组的三维可视化内容</p>
        </div>
        <div v-if="activeTab === 'wheelRailAnalysis'" class="placeholder-content">
          <h2>轮轨接触分析</h2>
          <p>此处将显示轮轨接触分析的三维可视化内容</p>
        </div>
        <div v-if="activeTab === 'dataAnalysis'" class="placeholder-content">
          <h2>数据分析</h2>
          <p>此处将显示动力学数据分析内容</p>
        </div>
        <div v-if="activeTab === 'evaluationResults'" class="placeholder-content">
          <h2>评估结果</h2>
          <p>此处将显示动力学安全评估结果</p>
        </div>
      </div>
      
      <!-- 提交按钮 -->
      <div class="submit-container">
        <button class="submit-btn" @click="saveAllParams" v-if="['vehicle', 'track', 'operation'].includes(activeTab)">
          保存参数并进入轨道视图
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { trackStore } from '../store/trackStore.js';
import VehicleParams from './VehicleParams.vue';
import TrackParams from './TrackParams.vue';
import OperationParams from './OperationParams.vue';

// 路由
const router = useRouter();
const store = trackStore;

// 组件引用
const vehicleParamsRef = ref(null);
const trackParamsRef = ref(null);
const operationParamsRef = ref(null);

// 标签页状态
const activeTab = ref('vehicle');

// 侧边栏宽度
const sidebarWidth = ref(240);
const isResizing = ref(false);

// 开始调整侧边栏大小
const startResize = (e) => {
  isResizing.value = true;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  e.preventDefault();
};

// 调整侧边栏大小
const handleResize = (e) => {
  if (isResizing.value) {
    let newWidth = e.clientX;
    // 限制最小宽度和最大宽度
    if (newWidth < 200) newWidth = 200;
    if (newWidth > 400) newWidth = 400;
    sidebarWidth.value = newWidth;
  }
};

// 停止调整侧边栏大小
const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
};

// 保存所有参数并导航到轨道视图
const saveAllParams = async () => {
  try {
    console.log('开始保存参数...');
    
    // 根据当前激活的标签页执行相应的保存和导航逻辑
    if (activeTab.value === 'vehicle') {
      // 车辆参数页面：保存车辆参数，然后跳转到轨道参数的平断面
      if (vehicleParamsRef.value?.getVehicleParams) {
        const vehicleParams = vehicleParamsRef.value.getVehicleParams();
        
        // 简单校验车辆参数
        if (!vehicleParams || !vehicleParams.name || !vehicleParams.type) {
          alert('请先填写车辆名称和类型');
          return;
        }
        
        trackStore.setVehicleParams(vehicleParams);
        console.log('车辆参数保存成功');
        
        // 跳转到轨道参数标签
        activeTab.value = 'track';
        
        // 延迟设置轨道参数的平断面标签为激活状态
        setTimeout(() => {
          if (trackParamsRef.value?.activeTab) {
            trackParamsRef.value.activeTab = 'horizontal';
          }
        }, 100);
      }
    } 
    else if (activeTab.value === 'track') {
      // 轨道参数页面：根据当前子标签决定行为
      if (trackParamsRef.value?.activeTab === 'horizontal') {
        // 平断面：跳转到纵断面
        trackParamsRef.value.activeTab = 'vertical';
      } else if (trackParamsRef.value?.activeTab === 'vertical') {
        // 纵断面：保存轨道参数，然后跳转到运行参数
        if (trackParamsRef.value?.getTrackParams) {
          const trackParams = trackParamsRef.value.getTrackParams();
          
          // 简单校验轨道参数
          if (!trackParams || !trackParams.horizontalSegments || trackParams.horizontalSegments.length === 0 ||
              !trackParams.verticalSegments || trackParams.verticalSegments.length === 0) {
            alert('请确保轨道平断面和纵断面参数都已设置');
            return;
          }
          
          trackStore.setHorizontalSegments(trackParams.horizontalSegments);
          trackStore.setVerticalSegments(trackParams.verticalSegments);
          console.log('轨道参数保存成功');
          
          // 跳转到运行参数标签
          activeTab.value = 'operation';
        }
      }
    } 
    else if (activeTab.value === 'operation') {
      // 运行参数页面：保存运行参数，然后跳转到轨检列车视图
      if (operationParamsRef.value?.getOperationParams) {
        const operationParams = operationParamsRef.value.getOperationParams();
        
        // 简单校验运行参数
        if (!operationParams || !operationParams.initialSpeed || !operationParams.maxSpeed) {
          alert('请先设置初始速度和最大速度');
          return;
        }
        
        trackStore.setOperationParams(operationParams);
        console.log('运行参数保存成功');
        
        // 导航到编组可视化视图
        console.log('所有参数保存成功，导航到编组可视化视图...');
        router.push('/marshalling-visualization');
      }
    }
  } catch (error) {
    console.error('保存参数时发生错误:', error);
    alert('保存参数时发生错误，请重试');
  }
};

// 组件挂载
onMounted(() => {
  console.log('参数设置页面已加载');
  
  // 从localStorage加载侧边栏宽度
  const savedWidth = localStorage.getItem('sidebarWidth');
  if (savedWidth) {
    sidebarWidth.value = parseInt(savedWidth, 10);
  }
});

// 组件卸载
onUnmounted(() => {
  // 保存侧边栏宽度到localStorage
  localStorage.setItem('sidebarWidth', sidebarWidth.value.toString());
  
  // 确保清理事件监听器
  if (isResizing.value) {
    stopResize();
  }
});
</script>

<style scoped>
.parameter-container {
  width: 100%;
  height: 100vh;
  display: flex;
  background-color: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 侧边栏样式 */
.sidebar {
  width: v-bind('sidebarWidth + "px"');
  background-color: #ffffff;
  border-right: 1px solid #e1e8ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
  min-width: 200px;
  max-width: 400px;
}

.menu-title {
  padding: 1.5rem 1rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 1px solid #ecf0f1;
  background-color: #f8f9fa;
}

.menu-items {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
}

.menu-group {
  margin-bottom: 1.5rem;
}

.menu-group-title {
  padding: 0.75rem 1.5rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  background-color: #f8f9fa;
  border-left: 3px solid #3498db;
  margin-bottom: 0.5rem;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666666;
  border-left: 3px solid transparent;
  margin-bottom: 0.25rem;
}

.sub-menu-item {
  padding-left: 3rem;
  font-size: 0.95rem;
}

.menu-item:hover {
  background-color: #f8f9fa;
  color: #3498db;
}

.menu-item.active {
  background-color: #ebf5fb;
  color: #3498db;
  border-left-color: #3498db;
  font-weight: 500;
}

.menu-icon {
  font-size: 1.25rem;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.menu-text {
  font-size: 1rem;
}

/* 占位内容样式 */
.placeholder-content {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.placeholder-content h2 {
  color: #3498db;
  margin-bottom: 1rem;
}

/* 侧边栏拖拽调整器 */
.sidebar-resizer {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s ease;
}

.sidebar-resizer:hover {
  background-color: #3498db;
  opacity: 0.3;
}

.sidebar-resizer:active {
  background-color: #3498db;
  opacity: 0.6;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* 提交按钮容器 */
.submit-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
}

.submit-btn {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 30px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
  transition: all 0.3s ease;
  min-width: 200px;
}

.submit-btn:hover {
  background: linear-gradient(135deg, #2980b9, #1f6dad);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
}

.submit-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(52, 152, 219, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .parameter-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100% !important;
    height: auto;
    min-width: auto;
    max-width: none;
    border-right: none;
    border-bottom: 1px solid #e1e8ed;
  }
  
  .menu-items {
    display: flex;
    justify-content: space-around;
    padding: 0;
  }
  
  .menu-item {
    flex-direction: column;
    padding: 0.75rem 0.5rem;
    border-left: none;
    border-bottom: 3px solid transparent;
    margin-bottom: 0;
    width: 33%;
  }
  
  .menu-item.active {
    border-left: none;
    border-bottom-color: #3498db;
  }
  
  .menu-icon {
    margin-right: 0;
    margin-bottom: 0.25rem;
    font-size: 1.5rem;
  }
  
  .sidebar-resizer {
    display: none;
  }
  
  .tab-content {
    padding: 1rem;
  }
  
  .submit-container {
    position: static;
    margin-top: 1rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: center;
  }
  
  .submit-btn {
    width: 100%;
    max-width: 300px;
  }
}

/* 动画效果 */
.menu-item {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.submit-btn {
  transition: background 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}

/* 滚动条样式 */
.tab-content::-webkit-scrollbar {
  width: 8px;
}

.tab-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.tab-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 全局样式重置 */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>