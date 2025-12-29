<template>
  <div class="vehicle-params">
    <h2>车辆参数设置</h2>
    
    <!-- Tab切换组件 -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>
    
    <!-- Tab内容区域 -->
    <div class="tab-content">
      <!-- 车体参数Tab -->
      <div v-if="activeTab === 'body'" class="tab-pane">
        <div class="params-form">
          <div class="form-group">
            <label for="vehicle-name">车辆名称</label>
            <input 
              id="vehicle-name"
              v-model="vehicleParams.name" 
              type="text" 
              placeholder="请输入车辆名称"
            />
          </div>
          
          <div class="form-group">
            <label for="vehicle-type">车辆类型</label>
            <select id="vehicle-type" v-model="vehicleParams.type">
              <option value="train">列车</option>
              <option value="car">汽车</option>
              <option value="other">其他</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="vehicle-weight">车辆重量 (t)</label>
            <input 
              id="vehicle-weight"
              v-model.number="vehicleParams.weight" 
              type="number" 
              min="0.1"
              step="0.1"
            />
          </div>
          
          <div class="form-group">
            <label for="vehicle-length">车体长度 (m)</label>
            <input 
              id="vehicle-length"
              v-model.number="vehicleParams.length" 
              type="number" 
              min="0.1"
              step="0.1"
            />
          </div>
          
          <div class="form-group">
            <label for="vehicle-width">车体宽度 (m)</label>
            <input 
              id="vehicle-width"
              v-model.number="vehicleParams.width" 
              type="number" 
              min="0.1"
              step="0.1"
            />
          </div>
          
          <div class="form-group">
            <label for="vehicle-height">车体高度 (m)</label>
            <input 
              id="vehicle-height"
              v-model.number="vehicleParams.height" 
              type="number" 
              min="0.1"
              step="0.1"
            />
          </div>
          
          <div class="form-group">
            <label for="vehicle-capacity">容量 (人/吨)</label>
            <input 
              id="vehicle-capacity"
              v-model.number="vehicleParams.capacity" 
              type="number" 
              min="1"
              step="1"
            />
          </div>
        </div>
      </div>
      
      <!-- 转向架参数Tab -->
      <div v-if="activeTab === 'bogie'" class="tab-pane">
        <div class="params-form">
          <div class="form-group">
            <label for="vehicle-axles">轴数</label>
            <input 
              id="vehicle-axles"
              v-model.number="vehicleParams.axles" 
              type="number" 
              min="2"
              step="1"
            />
          </div>
          
          <div class="form-group">
            <label for="bogie-count">转向架数量</label>
            <input 
              id="bogie-count"
              v-model.number="vehicleParams.bogieCount" 
              type="number" 
              min="1"
              step="1"
            />
          </div>
          
          <div class="form-group">
            <label for="wheelbase">轴距 (m)</label>
            <input 
              id="wheelbase"
              v-model.number="vehicleParams.wheelbase" 
              type="number" 
              min="0.5"
              step="0.1"
            />
          </div>
          
          <div class="form-group">
            <label for="bogie-wheelbase">转向架轴距 (m)</label>
            <input 
              id="bogie-wheelbase"
              v-model.number="vehicleParams.bogieWheelbase" 
              type="number" 
              min="0.5"
              step="0.1"
            />
          </div>
        </div>
      </div>
      
      <!-- 车轮与踏面配置Tab -->
      <div v-if="activeTab === 'wheel'" class="tab-pane">
        <div class="params-form">
          <div class="form-group">
            <label for="wheel-diameter">车轮直径 (mm)</label>
            <input 
              id="wheel-diameter"
              v-model.number="vehicleParams.wheelDiameter" 
              type="number" 
              min="500"
              step="10"
            />
          </div>
          
          <div class="form-group">
            <label for="wheel-tread-type">踏面类型</label>
            <select id="wheel-tread-type" v-model="vehicleParams.wheelTreadType">
              <option value="LM">LM型</option>
              <option value="LMA">LMA型</option>
              <option value="S1002">S1002型</option>
              <option value="other">其他</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="wheel-flange-thickness">轮缘厚度 (mm)</label>
            <input 
              id="wheel-flange-thickness"
              v-model.number="vehicleParams.wheelFlangeThickness" 
              type="number" 
              min="20"
              step="0.5"
            />
          </div>
          
          <div class="form-group">
            <label for="wheel-flange-height">轮缘高度 (mm)</label>
            <input 
              id="wheel-flange-height"
              v-model.number="vehicleParams.wheelFlangeHeight" 
              type="number" 
              min="25"
              step="0.5"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { trackStore } from '../store/trackStore.js';

// Tab配置
const tabs = [
  { id: 'body', name: '车体参数' },
  { id: 'bogie', name: '转向架参数' },
  { id: 'wheel', name: '车轮与踏面配置' }
];

// 当前激活的Tab
const activeTab = ref('body');

// 车辆参数状态
const vehicleParams = reactive({
  // 车体参数
  name: '',
  type: 'train',
  weight: 100,
  length: 25.0,
  width: 3.1,
  height: 3.8,
  capacity: 1000,
  
  // 转向架参数
  axles: 8,
  bogieCount: 2,
  wheelbase: 20.0,
  bogieWheelbase: 2.5,
  
  // 车轮与踏面配置
  wheelDiameter: 915,
  wheelTreadType: 'LM',
  wheelFlangeThickness: 32,
  wheelFlangeHeight: 28
});

// 从父组件接收初始化数据的函数
const initData = (data) => {
  if (data && typeof data === 'object') {
    Object.assign(vehicleParams, data);
  }
};

// 获取当前车辆参数的函数，供父组件调用
const getVehicleParams = () => {
  return { ...vehicleParams };
};

// 暴露方法给父组件
defineExpose({
  initData,
  getVehicleParams
});
</script>

<style scoped>
.vehicle-params {
  padding: 1rem 0;
}

.vehicle-params h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333333;
  font-size: 1.5rem;
}

/* Tab样式 */
.tabs {
  display: flex;
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 1.5rem;
}

.tab-button {
  padding: 0.8rem 1.5rem;
  border: none;
  background-color: transparent;
  color: #6c757d;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
  margin-right: 0.5rem;
}

.tab-button:hover {
  color: #007bff;
  background-color: #f8f9fa;
}

.tab-button.active {
  color: #007bff;
  border-bottom-color: #007bff;
  background-color: #ffffff;
}

/* Tab内容样式 */
.tab-content {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tab-pane {
  padding: 1.5rem;
}

.params-form {
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

/* 响应式设计 */
@media (max-width: 768px) {
  .tabs {
    overflow-x: auto;
    white-space: nowrap;
  }
  
  .tab-button {
    margin-right: 0;
    flex-shrink: 0;
  }
  
  .tab-pane {
    padding: 1rem;
  }
  
  .params-form {
    gap: 1rem;
  }
  
  .form-group {
    width: 100%;
  }
}
</style>