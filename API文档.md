# 轨道检查数据分析API文档

## 1. 概述
本API文档描述了轨道检查数据分析系统中用于获取图表数据的接口，包含数据结构和使用示例。

## 2. API服务模块

### 2.1 数据分析API服务 (dataAnalysisAPI)

**文件路径**: `src/services/dataAnalysisAPI.js`

#### 2.1.1 获取速度数据
```javascript
dataAnalysisAPI.getSpeedData()
```

**请求说明**:
- 方法: GET
- 路径: `/api/data-analysis/speed`
- 参数: 无

**响应数据结构**:
```javascript
[
  {
    "mileage": Number,    // 里程位置
    "value": Number      // 速度值
  }
]
```

**示例响应**:
```javascript
[
  { "mileage": 0, "value": 100 },
  { "mileage": 100, "value": 120 },
  // ...
]
```

#### 2.1.2 获取加速度数据
```javascript
dataAnalysisAPI.getAccelerationData()
```

**请求说明**:
- 方法: GET
- 路径: `/api/data-analysis/acceleration`
- 参数: 无

**响应数据结构**:
```javascript
[
  {
    "mileage": Number,    // 里程位置
    "value": Number      // 加速度值
  }
]
```

**示例响应**:
```javascript
[
  { "mileage": 0, "value": 0.5 },
  { "mileage": 100, "value": 0.3 },
  // ...
]
```

### 2.2 评估结果API服务 (evaluationResultsAPI)

**文件路径**: `src/services/evaluationResultsAPI.js`

#### 2.2.1 获取轮重减载率数据
```javascript
evaluationResultsAPI.getWheelLoadReductionData()
```

**请求说明**:
- 方法: GET
- 路径: `/api/evaluation-results/wheel-load-reduction`
- 参数: 无

**响应数据结构**:
```javascript
[
  {
    "mileage": Number,    // 里程位置
    "left": Number,      // 左侧轮重减载率
    "right": Number      // 右侧轮重减载率
  }
]
```

**示例响应**:
```javascript
[
  { "mileage": 0, "left": 0.12, "right": 0.15 },
  { "mileage": 100, "left": 0.18, "right": 0.16 },
  // ...
]
```

#### 2.2.2 获取脱轨系数数据
```javascript
evaluationResultsAPI.getDerailmentCoefficientData()
```

**请求说明**:
- 方法: GET
- 路径: `/api/evaluation-results/derailment-coefficient`
- 参数: 无

**响应数据结构**:
```javascript
[
  {
    "mileage": Number,    // 里程位置
    "left": Number,      // 左侧脱轨系数
    "right": Number      // 右侧脱轨系数
  }
]
```

**示例响应**:
```javascript
[
  { "mileage": 0, "left": 0.25, "right": 0.30 },
  { "mileage": 100, "left": 0.28, "right": 0.32 },
  // ...
]
```

## 3. 错误处理

所有API方法都包含错误处理机制，当API请求失败时，会返回预定义的模拟数据作为回退方案。模拟数据与API响应数据结构完全一致。

## 4. 使用示例

### 4.1 在Vue组件中使用

```javascript
import { ref, onMounted } from 'vue';
import dataAnalysisAPI from '@/services/dataAnalysisAPI';

const speedData = ref([]);

onMounted(async () => {
  try {
    const data = await dataAnalysisAPI.getSpeedData();
    speedData.value = data;
  } catch (error) {
    console.error('获取速度数据失败:', error);
    // 使用模拟数据，无需额外处理
  }
});
```

## 5. 数据更新说明

API接口设计支持实时数据更新，前端组件可以通过定时调用API方法或使用WebSocket连接来获取最新数据。

## 6. 性能优化建议

1. 对于大数据量，可以考虑实现分页或分段加载
2. 建议在前端实现数据缓存机制，减少不必要的API调用
3. 考虑使用WebSocket进行实时数据推送，减少轮询开销
