from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import random
import asyncio
from pydantic import BaseModel

app = FastAPI(
    title="轨道检查数据分析API",
    description="提供轨道检查数据分析系统的后端API接口",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "ws://localhost:5173"],  # 添加WebSocket origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # 暴露所有头部
)

# 生成模拟数据的函数
def generate_mock_data(start_mileage=0, end_mileage=10000, step=100, base_value=0, variance=0.5):
    data = []
    current_value = base_value
    
    for mileage in range(start_mileage, end_mileage + 1, step):
        # 添加一些随机波动
        current_value += random.uniform(-variance, variance)
        # 确保值在合理范围内
        current_value = max(0, current_value)
        
        data.append({
            "mileage": mileage,
            "value": round(current_value, 2)
        })
    
    return data

# 生成双侧数据的函数（轮重减载率和脱轨系数）
def generate_mock_data_double(start_mileage=0, end_mileage=10000, step=100, base_left=0, base_right=0, variance=0.1):
    data = []
    current_left = base_left
    current_right = base_right
    
    for mileage in range(start_mileage, end_mileage + 1, step):
        # 添加一些随机波动
        current_left += random.uniform(-variance, variance)
        current_right += random.uniform(-variance, variance)
        # 确保值在合理范围内
        current_left = max(0, current_left)
        current_right = max(0, current_right)
        
        data.append({
            "mileage": mileage,
            "left": round(current_left, 3),
            "right": round(current_right, 3)
        })
    
    return data

# 生成单个实时数据点的函数（适用于双侧数据）
def generate_realtime_data_point(last_mileage, last_left, last_right, variance=0.1, step=100):
    # 里程标增加
    mileage = last_mileage + step
    
    # 添加一些随机波动
    current_left = last_left + random.uniform(-variance, variance)
    current_right = last_right + random.uniform(-variance, variance)
    
    # 确保值在合理范围内
    current_left = max(0, current_left)
    current_right = max(0, current_right)
    
    return {
        "mileage": mileage,
        "left": round(current_left, 3),
        "right": round(current_right, 3)
    }

# 生成单个实时数据点的函数（适用于单值数据）
def generate_realtime_data_point_single(last_mileage, last_value, variance=0.1, step=100):
    # 里程标增加
    mileage = last_mileage + step
    
    # 添加一些随机波动
    current_value = last_value + random.uniform(-variance, variance)
    
    # 确保值在合理范围内
    current_value = max(0, current_value)
    
    return {
        "mileage": mileage,
        "value": round(current_value, 3)
    }

# WebSocket连接管理类
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.data_states = {}
    
    async def connect(self, websocket: WebSocket, data_type: str):
        await websocket.accept()
        self.active_connections.append({
            "websocket": websocket,
            "data_type": data_type
        })
        
        # 初始化数据状态
        if data_type not in self.data_states:
            if data_type == "wheel_load_reduction":
                self.data_states[data_type] = {
                    "last_mileage": 0,
                    "last_left": 0.15,
                    "last_right": 0.17
                }
            elif data_type == "derailment_coefficient":
                self.data_states[data_type] = {
                    "last_mileage": 0,
                    "last_left": 0.25,
                    "last_right": 0.28
                }
            elif data_type == "speed":
                self.data_states[data_type] = {
                    "last_mileage": 0,
                    "last_value": 100
                }
            elif data_type == "frame_acceleration":
                self.data_states[data_type] = {
                    "last_mileage": 0,
                    "last_value": 0.5
                }
            elif data_type == "axial_acceleration":
                self.data_states[data_type] = {
                    "last_mileage": 0,
                    "last_value": 0.2
                }
    
    def disconnect(self, websocket: WebSocket):
        for connection in self.active_connections:
            if connection["websocket"] == websocket:
                self.active_connections.remove(connection)
                break
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast(self, message: dict, data_type: str):
        for connection in self.active_connections:
            if connection["websocket"] == websocket:
                continue
            if connection["data_type"] == data_type:
                try:
                    await connection["websocket"].send_json(message)
                except:
                    # 如果发送失败，移除连接
                    self.disconnect(connection["websocket"])

manager = ConnectionManager()

# 数据分析相关API
@app.get("/api/data-analysis/speed", tags=["数据分析"])
def get_speed_data():
    """获取速度-里程标曲线数据"""
    return generate_mock_data(base_value=100, variance=20, step=200)

@app.get("/api/data-analysis/frame-acceleration", tags=["数据分析"])
def get_frame_acceleration_data():
    """获取构架加速度-里程标曲线数据"""
    return generate_mock_data(base_value=0.5, variance=0.3, step=100)

@app.get("/api/data-analysis/axial-acceleration", tags=["数据分析"])
def get_axial_acceleration_data():
    """获取轴箱加速度-里程标曲线数据"""
    return generate_mock_data(base_value=0.2, variance=0.15, step=100)

# 评估结果相关API
@app.get("/api/evaluation-results/wheel-load-reduction", tags=["评估结果"])
def get_wheel_load_reduction_data():
    """获取轮重减载率-里程标曲线数据"""
    return generate_mock_data_double(base_left=0.15, base_right=0.17, variance=0.05, step=100)

@app.get("/api/evaluation-results/derailment-coefficient", tags=["评估结果"])
def get_derailment_coefficient_data():
    """获取脱轨系数-里程标曲线数据"""
    return generate_mock_data_double(base_left=0.25, base_right=0.28, variance=0.08, step=100)

# WebSocket相关API
@app.websocket("/ws/evaluation-results/wheel-load-reduction")
async def websocket_wheel_load_reduction(websocket: WebSocket):
    """轮重减载率实时数据WebSocket"""
    await manager.connect(websocket, "wheel_load_reduction")
    
    try:
        # 发送历史数据
        historical_data = generate_mock_data_double(
            base_left=0.15, 
            base_right=0.17, 
            variance=0.05, 
            step=100
        )
        await manager.send_personal_message({
            "type": "historical_data",
            "data": historical_data
        }, websocket)
        
        # 持续发送实时数据
        while True:
            # 生成实时数据点
            data_point = generate_realtime_data_point(
                last_mileage=manager.data_states["wheel_load_reduction"]["last_mileage"],
                last_left=manager.data_states["wheel_load_reduction"]["last_left"],
                last_right=manager.data_states["wheel_load_reduction"]["last_right"],
                variance=0.05,
                step=100
            )
            
            # 更新数据状态
            manager.data_states["wheel_load_reduction"]["last_mileage"] = data_point["mileage"]
            manager.data_states["wheel_load_reduction"]["last_left"] = data_point["left"]
            manager.data_states["wheel_load_reduction"]["last_right"] = data_point["right"]
            
            # 发送实时数据
            await manager.send_personal_message({
                "type": "realtime_data",
                "data": data_point
            }, websocket)
            
            # 等待一定时间再发送下一个数据点
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.websocket("/ws/evaluation-results/derailment-coefficient")
async def websocket_derailment_coefficient(websocket: WebSocket):
    """脱轨系数实时数据WebSocket"""
    await manager.connect(websocket, "derailment_coefficient")
    
    try:
        # 发送历史数据
        historical_data = generate_mock_data_double(
            base_left=0.25, 
            base_right=0.28, 
            variance=0.08, 
            step=100
        )
        await manager.send_personal_message({
            "type": "historical_data",
            "data": historical_data
        }, websocket)
        
        # 持续发送实时数据
        while True:
            # 生成实时数据点
            data_point = generate_realtime_data_point(
                last_mileage=manager.data_states["derailment_coefficient"]["last_mileage"],
                last_left=manager.data_states["derailment_coefficient"]["last_left"],
                last_right=manager.data_states["derailment_coefficient"]["last_right"],
                variance=0.08,
                step=100
            )
            
            # 更新数据状态
            manager.data_states["derailment_coefficient"]["last_mileage"] = data_point["mileage"]
            manager.data_states["derailment_coefficient"]["last_left"] = data_point["left"]
            manager.data_states["derailment_coefficient"]["last_right"] = data_point["right"]
            
            # 发送实时数据
            await manager.send_personal_message({
                "type": "realtime_data",
                "data": data_point
            }, websocket)
            
            # 等待一定时间再发送下一个数据点
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# 数据分析WebSocket端点
@app.websocket("/ws/data-analysis/speed")
async def websocket_speed(websocket: WebSocket):
    """速度实时数据WebSocket"""
    await manager.connect(websocket, "speed")
    
    try:
        # 发送历史数据
        historical_data = generate_mock_data(base_value=100, variance=20, step=200)
        await manager.send_personal_message({
            "type": "historical_data",
            "data": historical_data
        }, websocket)
        
        # 持续发送实时数据
        while True:
            # 生成实时数据点
            data_point = generate_realtime_data_point_single(
                last_mileage=manager.data_states["speed"]["last_mileage"],
                last_value=manager.data_states["speed"]["last_value"],
                variance=20,
                step=200
            )
            
            # 更新数据状态
            manager.data_states["speed"]["last_mileage"] = data_point["mileage"]
            manager.data_states["speed"]["last_value"] = data_point["value"]
            
            # 发送实时数据
            await manager.send_personal_message({
                "type": "realtime_data",
                "data": data_point
            }, websocket)
            
            # 等待一定时间再发送下一个数据点
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.websocket("/ws/data-analysis/frame-acceleration")
async def websocket_frame_acceleration(websocket: WebSocket):
    """构架加速度实时数据WebSocket"""
    await manager.connect(websocket, "frame_acceleration")
    
    try:
        # 发送历史数据
        historical_data = generate_mock_data(base_value=0.5, variance=0.3, step=100)
        await manager.send_personal_message({
            "type": "historical_data",
            "data": historical_data
        }, websocket)
        
        # 持续发送实时数据
        while True:
            # 生成实时数据点
            data_point = generate_realtime_data_point_single(
                last_mileage=manager.data_states["frame_acceleration"]["last_mileage"],
                last_value=manager.data_states["frame_acceleration"]["last_value"],
                variance=0.3,
                step=100
            )
            
            # 更新数据状态
            manager.data_states["frame_acceleration"]["last_mileage"] = data_point["mileage"]
            manager.data_states["frame_acceleration"]["last_value"] = data_point["value"]
            
            # 发送实时数据
            await manager.send_personal_message({
                "type": "realtime_data",
                "data": data_point
            }, websocket)
            
            # 等待一定时间再发送下一个数据点
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.websocket("/ws/data-analysis/axial-acceleration")
async def websocket_axial_acceleration(websocket: WebSocket):
    """轴箱加速度实时数据WebSocket"""
    await manager.connect(websocket, "axial_acceleration")
    
    try:
        # 发送历史数据
        historical_data = generate_mock_data(base_value=0.2, variance=0.15, step=100)
        await manager.send_personal_message({
            "type": "historical_data",
            "data": historical_data
        }, websocket)
        
        # 持续发送实时数据
        while True:
            # 生成实时数据点
            data_point = generate_realtime_data_point_single(
                last_mileage=manager.data_states["axial_acceleration"]["last_mileage"],
                last_value=manager.data_states["axial_acceleration"]["last_value"],
                variance=0.15,
                step=100
            )
            
            # 更新数据状态
            manager.data_states["axial_acceleration"]["last_mileage"] = data_point["mileage"]
            manager.data_states["axial_acceleration"]["last_value"] = data_point["value"]
            
            # 发送实时数据
            await manager.send_personal_message({
                "type": "realtime_data",
                "data": data_point
            }, websocket)
            
            # 等待一定时间再发送下一个数据点
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
