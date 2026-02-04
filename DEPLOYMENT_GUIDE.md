# NVIDIA Jetson Xavier Nginx 部署指南

## 项目概述

- **项目名称**: Simulation Platform
- **部署目标**: NVIDIA Jetson Xavier (192.168.200.17)
- **部署目录**: `/var/www/carsvisualization`
- **前端框架**: Vue.js (Vite)

---

## 准备工作

### 1. 构建前端项目：


构建完成后，会在项目根目录生成 `dist/` 文件夹。
解压dist.zip
---

## 部署步骤

### 步骤 1: 将构建文件传输到远程服务器

使用 `scp` 命令将本地 `dist/` 文件夹传输到 NVIDIA Jetson Xavier：

```bash
# 传输 dist 文件夹到远程服务器的 ~/dist/ 目录 * 确保远程有dist目*录*
scp -r dist/* rlsx@192.168.200.17:~/dist/
```

**参数说明**:
- `-r`: 递归传输整个文件夹
- `dist/*`: 本地构建后的文件
- `username@192.168.200.17`: 远程服务器的用户名和IP地址
- `~/dist/`: 远程服务器的目标目录

---

### 步骤 2: 登录到远程服务器

```bash
ssh rlsx@192.168.200.17
```

---

### 步骤 3: 创建部署目录

在远程服务器上执行：

```bash
# 创建网站根目录
sudo mkdir -p /var/www/carsvisualization

# 设置目录权限
sudo chown -R rlsx:rlsx /var/www/carsvisualization
```

---

### 步骤 4: 复制文件到部署目录

```bash
# 将 dist 文件夹中的文件复制到网站根目录
cp -r ~/dist/* /var/www/carsvisualization/

# 验证文件已复制
ls -la /var/www/carsvisualization/
```

---

### 步骤 5: 安装 Nginx

```bash
# 更新软件包列表
sudo apt update

# 安装 Nginx
sudo apt install nginx -y

# 检查 Nginx 是否运行
sudo systemctl status nginx
```

---

### 步骤 6: 配置 Nginx

#### 创建网站配置文件

```bash
sudo nano /etc/nginx/sites-available/carsvisualization
```

#### 粘贴以下配置内容

```nginx
server {
    listen 8888;
    server_name 192.168.200.17;

    root /var/www/carsvisualization;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # WebSocket 配置（如果需要）
    <!-- location /ws {
        proxy_pass http://127.0.0.1:8777;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    } -->

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**配置说明**:
- `listen 8888`: 监听 8888 端口
- `server_name 192.168.200.17`: 服务器IP地址
- `root /var/www/carsvisualization`: 网站根目录
- `try_files $uri $uri/ /index.html`: 支持 Vue.js 的 SPA 路由
- `/ws`: WebSocket 代理配置（转发到 8777 端口）

---

### 步骤 7: 启用网站配置

```bash
# 创建符号链接到 sites-enabled
sudo ln -s /etc/nginx/sites-available/carsvisualization /etc/nginx/sites-enabled/

# 移除默认配置
sudo rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
sudo nginx -t
```

如果测试通过，会显示：
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

### 步骤 8: 重新加载 Nginx

```bash
# 重新加载 Nginx 配置
sudo systemctl reload nginx

# 验证 Nginx 是否正常运行
sudo systemctl status nginx
```

---

## 验证部署

### 方法 1: 本地验证

在远程服务器上执行：

```bash
# 使用 curl 测试
curl http://localhost
```

如果返回 HTML 内容，说明部署成功。

---

### 方法 2: 浏览器访问

在本地浏览器中访问：

```
http://192.168.200.17:8888
```

如果能看到前端界面，说明部署成功。

---

## 常见问题排查

### 问题 1: 403 Forbidden

**原因**: 权限不足

**解决方法**:
```bash
# 检查目录权限
ls -ld /var/www/carsvisualization

# 设置正确的权限
sudo chmod -R 755 /var/www/carsvisualization
```

---

### 问题 2: 502 Bad Gateway

**原因**: Nginx 配置错误或后端服务未启动

**解决方法**:
```bash
# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 检查后端服务是否运行
ps aux | grep node
```

---

### 问题 3: WebSocket 连接失败

**原因**: 防火墙或 Nginx 配置问题

**解决方法**:
```bash
# 检查防火墙状态
sudo ufw status

# 如果防火墙已启用，允许 8888 和 8777 端口
sudo ufw allow 8888/tcp
sudo ufw allow 8777/tcp
```

---

## 更新部署

### 1. 重新构建本地项目

```bash
npm run build
```

### 2. 传输新的构建文件

```bash
scp -r dist/* rlsx@192.168.200.17:~/dist/
```

### 3. 更新远程服务器文件

```bash
ssh rlsx@192.168.200.17

# 备份旧文件（可选）
sudo cp -r /var/www/carsvisualization /var/www/carsvisualization.backup

# 复制新文件
cp -r ~/dist/* /var/www/carsvisualization/

# 重新加载 Nginx
sudo systemctl reload nginx
```

---

## 附录

### Nginx 常用命令

```bash
# 启动 Nginx
sudo systemctl start nginx

# 停止 Nginx
sudo systemctl stop nginx

# 重启 Nginx
sudo systemctl restart nginx

# 重新加载配置
sudo systemctl reload nginx

# 查看状态
sudo systemctl status nginx
```

---

### 日志文件位置

```bash
# Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

---

## 技术支持

如果遇到问题，可以通过以下方式获取帮助：
1. 检查 Nginx 错误日志：`/var/log/nginx/error.log`
2. 查看系统日志：`/var/log/syslog`
3. 联系系统管理员或开发团队

---

**文档版本**: 1.0  
**更新日期**: 2026-01-30  
**适用环境**: NVIDIA Jetson Xavier + Nginx 部署
