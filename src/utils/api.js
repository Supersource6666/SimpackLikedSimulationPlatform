// 数据API服务层，用于处理与后端的通信

// 基础URL配置
const BASE_URL = 'http://localhost:8000/api';
const WS_BASE_URL = 'ws://localhost:8000/ws';

// 通用请求函数
async function request(url, options = {}) {
  try {
    // 处理params参数
    let fullUrl = `${BASE_URL}${url}`;
    if (options.params && Object.keys(options.params).length > 0) {
      const params = new URLSearchParams(options.params);
      fullUrl += `?${params.toString()}`;
    }
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      // 移除params属性，避免fetch API错误
      params: undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
}

// 数据分析相关API
export const dataAnalysisAPI = {
  // 获取速度-里程标曲线数据
  getSpeedData(params = {}) {
    return request('/data-analysis/speed', {
      method: 'GET',
      params
    });
  },

  // 获取构架加速度-里程标曲线数据
  getFrameAccelerationData(params = {}) {
    return request('/data-analysis/frame-acceleration', {
      method: 'GET',
      params
    });
  },

  // 获取轴箱加速度-里程标曲线数据
  getAxialAccelerationData(params = {}) {
    return request('/data-analysis/axial-acceleration', {
      method: 'GET',
      params
    });
  }
};

// 评估结果相关API
export const evaluationResultsAPI = {
  // 获取轮重减载率-里程标曲线数据
  getWheelLoadReductionData(params = {}) {
    return request('/evaluation-results/wheel-load-reduction', {
      method: 'GET',
      params
    });
  },

  // 获取脱轨系数-里程标曲线数据
  getDerailmentCoefficientData(params = {}) {
    return request('/evaluation-results/derailment-coefficient', {
      method: 'GET',
      params
    });
  }
};

// WebSocket相关API
export const webSocketAPI = {
  // 建立轮重减载率WebSocket连接
  connectWheelLoadReduction(onMessage, onError, onClose) {
    const ws = new WebSocket(`${WS_BASE_URL}/evaluation-results/wheel-load-reduction`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket消息解析错误:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket连接关闭:', event);
      if (onClose) onClose(event);
    };
    
    return ws;
  },
  
  // 建立脱轨系数WebSocket连接
  connectDerailmentCoefficient(onMessage, onError, onClose) {
    const ws = new WebSocket(`${WS_BASE_URL}/evaluation-results/derailment-coefficient`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket消息解析错误:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket连接关闭:', event);
      if (onClose) onClose(event);
    };
    
    return ws;
  },
  
  // 建立速度实时数据WebSocket连接
  connectSpeed(onMessage, onError, onClose) {
    const ws = new WebSocket(`${WS_BASE_URL}/data-analysis/speed`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket消息解析错误:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket连接关闭:', event);
      if (onClose) onClose(event);
    };
    
    return ws;
  },
  
  // 建立构架加速度实时数据WebSocket连接
  connectFrameAcceleration(onMessage, onError, onClose) {
    const ws = new WebSocket(`${WS_BASE_URL}/data-analysis/frame-acceleration`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket消息解析错误:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket连接关闭:', event);
      if (onClose) onClose(event);
    };
    
    return ws;
  },
  
  // 建立轴箱加速度实时数据WebSocket连接
  connectAxialAcceleration(onMessage, onError, onClose) {
    const ws = new WebSocket(`${WS_BASE_URL}/data-analysis/axial-acceleration`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket消息解析错误:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket连接关闭:', event);
      if (onClose) onClose(event);
    };
    
    return ws;
  },
  
  // 关闭WebSocket连接
  disconnect(ws) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }
};

// 导出所有API
export default {
  dataAnalysis: dataAnalysisAPI,
  evaluationResults: evaluationResultsAPI,
  webSocket: webSocketAPI
};