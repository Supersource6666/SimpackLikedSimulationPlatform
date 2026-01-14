import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

/**
 * 导出3D模型为GLB文件
 * @param {THREE.Object3D[]} objects - 要导出的对象数组
 * @param {string} fileName - 导出文件的名称（默认：model.glb）
 * @param {Object} options - 导出选项
 */
export function exportToGLB(objects, fileName = 'model.glb', options = {}) {
  const exporter = new GLTFExporter()
  const gltfOptions = {
    trs: false,
    onlyVisible: true,
    truncateDrawRange: true,
    binary: true,
    maxTextureSize: 4096,
    ...options
  }
  
  // 创建包含所有对象的组
  const exportGroup = new THREE.Group()
  objects.forEach(obj => {
    if (obj) exportGroup.add(obj)
  })
  
  exporter.parse(exportGroup, (gltf) => {
    if (gltf instanceof ArrayBuffer) {
      const blob = new Blob([gltf], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
    }
  }, (error) => {
    console.error('导出错误:', error)
  }, gltfOptions)
}

/**
 * 导出钢轨模型
 * @param {THREE.Mesh} rail1 - 第一条钢轨
 * @param {THREE.Mesh} rail2 - 第二条钢轨
 * @param {string} fileName - 导出文件的名称（默认：rail_track.glb）
 */
export function exportRailTrack(rail1, rail2, fileName = 'rail_track.glb') {
  exportToGLB([rail1, rail2], fileName)
}