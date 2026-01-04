<template>
  <div class="parameter-container">
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
        <DataAnalysis 
          v-if="activeTab === 'dataAnalysis'" 
        />
        <EvaluationResults 
          v-if="activeTab === 'evaluationResults'" 
        />
        
        <!-- 系统功能部分占位符 -->
        <div v-if="activeTab === 'settings'" class="placeholder-content">
          <h2>系统设置</h2>
          <p>此处将显示系统设置内容</p>
        </div>
        <div v-if="activeTab === 'about'" class="placeholder-content">
          <h2>关于系统</h2>
          <p>此处将显示系统信息</p>
        </div>
        <div v-if="activeTab === 'help'" class="placeholder-content">
          <h2>帮助文档</h2>
          <p>此处将显示帮助文档内容</p>
        </div>
      </div>
      
      <!-- 提交按钮 -->
      <div class="submit-container">
        <button class="submit-btn" @click="saveAllParams" v-if="['vehicle', 'track', 'operation'].includes(activeTab)">
          保存参数并进入轮轨接触分析
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { trackStore } from '../store/trackStore.js';
import VehicleParams from './VehicleParams.vue';
import TrackParams from './TrackParams.vue';
import OperationParams from './OperationParams.vue';
import DataAnalysis from './DataAnalysis.vue';
import EvaluationResults from './EvaluationResults.vue';

const router = useRouter();
const route = useRoute();
const store = trackStore;

const vehicleParamsRef = ref(null);
const trackParamsRef = ref(null);
const operationParamsRef = ref(null);

const activeTab = ref(route.query.tab || 'vehicle');

watch(() => route.query.tab, (newTab) => {
  if (newTab) {
    activeTab.value = newTab;
  }
});

// 保存所有参数并导航到轮轨接触分析
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
      // 运行参数页面：保存运行参数，然后跳转到列车编组展示
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
});
</script>

<style scoped>
.parameter-container {
  width: 100%;
  height: 100%;
  display: flex;
  background-color: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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

/* 响应式设计 */
@media (max-width: 768px) {
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