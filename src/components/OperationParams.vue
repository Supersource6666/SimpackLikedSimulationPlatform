<template>
  <div class="operation-params">
    <h2>运行参数设置</h2>
    <p>设置车辆的运行参数</p>
    <div class="params-grid">
      <div class="param-card">
        <h3>速度参数</h3>
        <div class="param-group">
          <label for="initialSpeed">初始速度 (m/s)</label>
          <input 
            id="initialSpeed"
            v-model.number="params.initialSpeed"
            type="number" 
            min="0" 
            step="0.1"
          />
        </div>
        <div class="param-group">
          <label for="maxSpeed">最大速度 (m/s)</label>
          <input 
            id="maxSpeed"
            v-model.number="params.maxSpeed"
            type="number" 
            min="0" 
            step="0.1"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const params = ref({
  initialSpeed: 0,
  maxSpeed: 10
})

// 获取当前运行参数的函数，供父组件调用
const getOperationParams = () => {
  return { ...params.value };
};

// 暴露方法给父组件
defineExpose({
  getOperationParams
});
</script>

<style scoped>
.operation-params {
  padding: 20px;
}

.operation-params h2 {
  color: #000000;
}

.operation-params p {
  color: #000000;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.param-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.param-group {
  margin-bottom: 15px;
}

.param-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.param-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>