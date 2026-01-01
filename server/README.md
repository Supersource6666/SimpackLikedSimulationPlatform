# 轨道检查数据分析系统后端服务

## 项目介绍

本项目使用Python FastAPI框架实现了轨道检查数据分析系统的后端API服务，为前端提供所需的图表数据。

## API接口列表

### 数据分析相关接口

1. **获取速度-里程标曲线数据**
   - 路径: `/api/data-analysis/speed`
   - 方法: GET
   - 描述: 返回列车运行速度随里程变化的曲线数据

2. **获取构架加速度-里程标曲线数据**
   - 路径: `/api/data-analysis/frame-acceleration`
   - 方法: GET
   - 描述: 返回列车构架加速度随里程变化的曲线数据

3. **获取轴箱加速度-里程标曲线数据**
   - 路径: `/api/data-analysis/axial-acceleration`
   - 方法: GET
   - 描述: 返回列车轴箱加速度随里程变化的曲线数据

### 评估结果相关接口

4. **获取轮重减载率-里程标曲线数据**
   - 路径: `/api/evaluation-results/wheel-load-reduction`
   - 方法: GET
   - 描述: 返回轮重减载率随里程变化的曲线数据（包含左右两侧）

5. **获取脱轨系数-里程标曲线数据**
   - 路径: `/api/evaluation-results/derailment-coefficient`
   - 方法: GET
   - 描述: 返回脱轨系数随里程变化的曲线数据（包含左右两侧）

## 快速开始

### 方法一：使用批处理脚本启动（推荐）

1. 双击运行 `start_server.bat`
2. 脚本会自动安装依赖并启动服务器

### 方法二：手动启动

1. 安装依赖
   ```bash
   pip install -r requirements.txt
   ```

2. 启动服务器
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## 访问方式

服务器启动后，可以通过以下方式访问：

- API文档: http://localhost:8000/docs
- API接口: http://localhost:8000/api/...
- 健康检查: http://localhost:8000/

## 技术栈

- Python 3.8+
- FastAPI
- Uvicorn

## 数据说明

目前系统使用模拟数据进行测试，实际部署时可以替换为真实的数据库查询或数据文件读取逻辑。
