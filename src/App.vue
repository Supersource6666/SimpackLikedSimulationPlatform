<template>
  <div class="app-container">
    <!-- 导航栏 -->
    <nav class="app-nav">
      <div class="nav-title">可视化分析平台</div>
      <div class="nav-links">
        <router-link to="/" class="nav-link">动力学参数</router-link>
        <router-link to="/wheel-rail-contact" class="nav-link">轮轨接触分析</router-link>
      </div>
    </nav>
    
    <!-- 主内容区域 -->
    <div class="app-content">
      <!-- 侧边栏 -->
      <Sidebar />
      
      <!-- 路由视图 -->
      <main class="app-main">
        <router-view></router-view>
      </main>
    </div>
    
    <!-- 页脚备案信息 -->
    <footer class="app-footer">
      <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer" class="beian-link">
        蜀ICP备2025168305号
      </a>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background-color: #000;
}

.app-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background-color: #333;
  color: white;
  height: 60px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-title {
  font-size: 18px;
  font-weight: bold;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: #555;
}

.app-main {
  flex: 1;
  overflow: hidden;
}

.app-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-footer {
  height: 40px;
  background-color: #333;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 14px;
}

.beian-link {
  color: white;
  text-decoration: none;
  transition: color 0.3s;
}

.beian-link:hover {
  color: #aaa;
  text-decoration: underline;
}
</style>