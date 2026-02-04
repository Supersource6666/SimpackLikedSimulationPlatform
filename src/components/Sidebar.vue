<template>
  <div class="sidebar">
    <div class="menu-items">
      <!-- 孪生子系统部分 -->
      <div class="menu-group">
        <div class="menu-group-title collapsible" @click="toggleGroup('projectFunctions')">
          <span>孪生子系统</span>
          <span class="collapse-icon">{{ collapsedGroups.projectFunctions ? '▶️' : '▼️' }}</span>
        </div>
        <div v-if="!collapsedGroups.projectFunctions" class="menu-group-content">
          <!-- 车辆动力学参数部分 -->
          <div class="menu-subgroup">
            <div class="menu-group-title collapsible" @click="toggleGroup('dynamicsParams')">
              <span>车辆动力学参数</span>
              <span class="collapse-icon">{{ collapsedGroups.dynamicsParams ? '▶️' : '▼️' }}</span>
            </div>
            <div v-if="!collapsedGroups.dynamicsParams" class="menu-group-content">
              <div 
                class="menu-item sub-menu-item" 
                :class="{ active: currentRoute === '/' && currentTab === 'vehicle' }" 
                @click="navigate('/', 'vehicle')"
              >
                <div class="menu-icon">🚆</div>
                <div class="menu-text">车辆参数</div>
              </div>
              <div 
                class="menu-item sub-menu-item" 
                :class="{ active: currentRoute === '/' && currentTab === 'track' }" 
                @click="navigate('/', 'track')"
              >
                <div class="menu-icon">🛤️</div>
                <div class="menu-text">轨道参数</div>
              </div>
              <div 
                class="menu-item sub-menu-item" 
                :class="{ active: currentRoute === '/' && currentTab === 'operation' }" 
                @click="navigate('/', 'operation')"
              >
                <div class="menu-icon">⚙️</div>
                <div class="menu-text">运行参数</div>
              </div>
            </div>
          </div>
          
          <!-- 孪生数据可视化部分 -->
          <div class="menu-subgroup">
            <div class="menu-group-title collapsible" @click="toggleGroup('3dScene')">
              <span>孪生数据可视化</span>
              <span class="collapse-icon">{{ collapsedGroups['3dScene'] ? '▶️' : '▼️' }}</span>
            </div>
            <div v-if="!collapsedGroups['3dScene']" class="menu-group-content">
              <div 
                class="menu-item sub-menu-item" 
                :class="{ active: currentRoute === '/wheel-rail-contact' }" 
                @click="navigate('/wheel-rail-contact')"
              >
                <div class="menu-icon">🔍</div>
                <div class="menu-text">轮轨力反演与分析</div>
              </div>
            </div>
          </div>
          
          <!-- 数据处理与结果评估部分 -->
          <div class="menu-subgroup">
            <div class="menu-group-title collapsible" @click="toggleGroup('safetyAssessment')">
              <span>数据处理与结果评估</span>
              <span class="collapse-icon">{{ collapsedGroups.safetyAssessment ? '▶️' : '▼️' }}</span>
            </div>
            <div v-if="!collapsedGroups.safetyAssessment" class="menu-group-content">
              <div 
                class="menu-item sub-menu-item" 
                :class="{ active: currentRoute === '/' && currentTab === 'dataAnalysis' }" 
                @click="navigate('/', 'dataAnalysis')"
              >
                <div class="menu-icon">📊</div>
                <div class="menu-text">数据处理</div>
              </div>
              <div 
                class="menu-item sub-menu-item" 
                :class="{ active: currentRoute === '/' && currentTab === 'evaluationResults' }" 
                @click="navigate('/', 'evaluationResults')"
              >
                <div class="menu-icon">✅</div>
                <div class="menu-text">结果评估</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 系统简介部分 -->
      <div class="menu-group">
        <div class="menu-group-title collapsible" @click="toggleGroup('systemFunctions')">
          <span>系统简介</span>
          <span class="collapse-icon">{{ collapsedGroups.systemFunctions ? '▶️' : '▼️' }}</span>
        </div>
        <div v-if="!collapsedGroups.systemFunctions" class="menu-group-content">
          <!-- 基础信息子分组 -->
          <div class="menu-subgroup">
            <div class="menu-group-title collapsible" @click="toggleGroup('baseInfo')">
              <span>基础信息</span>
              <span class="collapse-icon">{{ collapsedGroups.baseInfo ? '▶️' : '▼️' }}</span>
            </div>
            <div v-if="!collapsedGroups.baseInfo" class="menu-group-content">
              <div 
                class="menu-item sub-menu-item" 
                :class="{ active: currentRoute === '/' && currentTab === 'settings' }" 
                @click="navigate('/', 'settings')"
              >
                <div class="menu-icon">⚙️</div>
                <div class="menu-text">系统设置</div>
              </div>
              <div 
                class="menu-item sub-menu-item" 
                :class="{ active: currentRoute === '/' && currentTab === 'about' }" 
                @click="navigate('/', 'about')"
              >
                <div class="menu-icon">ℹ️</div>
                <div class="menu-text">关于系统</div>
              </div>
              <div 
                class="menu-item sub-menu-item" 
                :class="{ active: currentRoute === '/' && currentTab === 'help' }" 
                @click="navigate('/', 'help')"
              >
                <div class="menu-icon">❓</div>
                <div class="menu-text">帮助文档</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 侧边栏拖拽调整大小 -->
    <div 
      class="sidebar-resizer" 
      @mousedown="startResize"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const currentRoute = computed(() => route.path);
const currentTab = computed(() => route.query.tab || 'vehicle');

const sidebarWidth = ref(240);
const isResizing = ref(false);

const collapsedGroups = ref({
  projectFunctions: false,
  systemFunctions: false,
  dynamicsParams: false,
  '3dScene': false,
  safetyAssessment: false,
  baseInfo: false
});

const toggleGroup = (group) => {
  collapsedGroups.value[group] = !collapsedGroups.value[group];
};

const navigate = (path, tab) => {
  if (path === currentRoute.value) {
    // 当点击的是当前路径时，添加时间戳作为查询参数强制重新加载
    if (tab) {
      router.push({ path, query: { tab, t: Date.now() } });
    } else {
      router.push({ path, query: { t: Date.now() } });
    }
  } else {
    if (tab) {
      router.push({ path, query: { tab } });
    } else {
      router.push(path);
    }
  }
};

const startResize = (e) => {
  isResizing.value = true;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  e.preventDefault();
};

const handleResize = (e) => {
  if (isResizing.value) {
    let newWidth = e.clientX;
    if (newWidth < 200) newWidth = 200;
    if (newWidth > 400) newWidth = 400;
    sidebarWidth.value = newWidth;
  }
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
};

onMounted(() => {
  const savedWidth = localStorage.getItem('sidebarWidth');
  if (savedWidth) {
    sidebarWidth.value = parseInt(savedWidth, 10);
  }
});

onUnmounted(() => {
  localStorage.setItem('sidebarWidth', sidebarWidth.value.toString());
  if (isResizing.value) {
    stopResize();
  }
});
</script>

<style scoped>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: default;
}

.menu-group-title.collapsible {
  cursor: pointer;
}

.menu-group-title.collapsible:hover {
  background-color: #e9ecef;
}

.collapse-icon {
  font-size: 0.8rem;
  transition: transform 0.2s ease;
}

.menu-group-content {
  overflow: hidden;
  transition: all 0.3s ease;
}

.menu-subgroup {
  margin-bottom: 1.5rem;
}

.menu-subgroup .menu-group-title {
  font-size: 1rem;
  padding: 0.5rem 1.5rem;
  margin-bottom: 0.25rem;
  border-left-color: #6c757d;
  background-color: #f1f3f5;
  padding-left: 2rem;
}

.menu-subgroup .menu-group-content {
  padding-left: 0.5rem;
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
  font-size: 0.95rem;
  padding-left: 2.5rem;
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

@media (max-width: 768px) {
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
}

.menu-item {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
</style>
