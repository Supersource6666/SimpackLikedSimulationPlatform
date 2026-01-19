UI更新 车体参数移除车辆名称选项
npm run build
 scp -r ./dist/* root@8.137.79.166:/www/vue-crh-visualization
scp -o StrictHostKeyChecking=no -r dist/* root@8.137.79.166:/www/vue-crh-visualization

```bash
(base) PS D:\TeamsFiles\PlayCanvasWeb3DProject> git branch -a                           
* feature/cars_on_board
  keep/20260118-cars-wip 增加视窗后的状态
  keep/20260118-icp-bar 原有未移除图窗
  main
  remotes/origin/keep/20260118-cars-wip
  remotes/origin/keep/20260118-icp-bar
  remotes/origin/laptop
  remotes/origin/main
(base) PS D:\TeamsFiles\PlayCanvasWeb3DProject> 
```


列车实时运行

1. 轮轨力反演与分析页面 主视角下拉框后方放置“运行轨迹”和”车辆信息“两个视窗显示和关闭的控制按钮；
2. “运行轨迹”和”车辆信息“两个视窗右上角增加叉号允许点击擦掉视窗；
3. Top bar在”孪生数据可视化“后放置“数据处理与结果评估”，点击后跳转”数据处理与结果评估“-“数据处理”页面；

地面颜色设置为#4c525a

轮轨力反演与分析场景中数据曲线窗口接入模拟数据；
轮轨力反演与分析界面中表征轮轨垂向力、横向力和纵向力的箭头也接入模拟数据；