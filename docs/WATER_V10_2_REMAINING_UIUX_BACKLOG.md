# Water as Spectrum — V10.2 后续未完成改造清单

> **维护母本 / Outstanding UI–UX Backlog**  
> 更新日期：2026-10-09  
> 开发范围：`GeoGeekLab/GeoGeekLab.github.io`，`site/water/workbench-v10-2/`  
> 本单用于 V10.2 Stage 1–4 部署后的连续开发。**“未完成”不表示缺陷已修复，也不表示已经科学验证。**

## 0. 交付范围与不能误用的声明

- **本批拟完成并发布（Stage 1–4）**：V10.2 布局与单滚动体系、分组导航、语义化状态栏、Tools 和参数组件、WATER RT 专项科学图表重构（深度、方向、模型差异）、离散数据表、内外部模型局限声明、科学结果零漂移及 CI。
- **保持不变**：V10.1 RT 离线解 `rt-reference-v1.json`，半解析模型、IOP、SRF、Fisher 数值引擎和历史实验 schema v8。正式站点将 V10.2 作为**界面版本**，不是新科学模型版本。
- **未完成科学验证**：自生成的标量、方位平均 DOM 尚未与 HydroLight/DISORT、其他独立求解器或实测数据交叉验证；当前图表不构成业务级误差评估。
- **回退**：`?instrument=water&waterVersion=v101#l13` 强制打开完整 V10.1；V10.0/V9 的入口保持可用。
- **每项完成定义（DoD）**：代码提交、科学命名核对、桌面/移动可用性、无障碍检查、回归测试、对应 README/母本状态更新。**未经过验证不得将 checkbox 勾选。**

## 1. 仍未完成的版本开发任务

| 编号 | 阶段 | 优先级 | 工作区/系统 | 待完成的改造 | 主要影响文件 | 验收标准 |
|---|---|---|---|---|---|---|
| UX-501 | Stage 5 | P0 | UNCERTAINTY | 将 Information/Jacobian/Correlation 统一为“结论—证据—假设”结构；不把局部 Fisher 形式 1σ 称为实测反演精度 | `app/index.html` (`workspaces/uncertainty.js`)、`v102-components.css`、新 `v102-uncertainty.css` | 报告已选择参数、假设噪声、最弱特征向量及退化模式，均有明确数量与单位 |
| UX-502 | Stage 5 | P0 | UNCERTAINTY | Jacobian 灵敏度表/热图、参数列相似度和**协方差相关矩阵**分开可视化，绝不混称 correlation | `workspaces/uncertainty.js`、`analysis/uncertainty-engine.js` **只读**、单元/浏览器测试 | 矩阵标头、对称性、数值范围、色标与定义可核对；使用原有同一计算输出 |
| UX-503 | Stage 5 | P1 | UNCERTAINTY | 假设噪声、传感器/SRF、反演参数选择设计为循序渐进的实验配置器 | `workspaces/uncertainty.js`、parameter-controls、CSS | 预设、恢复、噪声和差分步长不串状态；手机端不产生嵌套纵向滚动 |
| UX-601 | Stage 6 | P0 | RADIATIVE PATH | 将概念光路、物理量与使用限制对齐，明确**示意光线不是 RTE 数值光场** | `workspaces/path.js`、相关布局样式 | 图例、示意标识与交互因果说明完整；不得冒称真实角度辐亮度 |
| UX-602 | Stage 6 | P0 | WATER OPTICS | IOP `a, b_b, b` 的物理定义、单位与谱线层级重构；减少色彩装饰 | `workspaces/iop.js`、科学图表层 | 不混淆总散射、后向散射及体散射函数；更新后显示的数值与 V10.1 相同 |
| UX-603 | Stage 6 | P1 | ATMOSPHERE | 直达透过、气溶胶、分子散射等量分组，明确当前单次/近似处理与适用域 | `workspaces/atm.js`、CSS | 大气-水体信号条目含定义、量纲、限制和警示 |
| UX-604 | Stage 6 | P1 | SENSOR | SRF 积分、公开实测 SRF 与合成 bandpass 的来源差异、带宽与指标显性化 | `workspaces/sensor.js`、SRF metadata 展示层 | 不能把合成响应标为实测；保持原始光谱积分数据不变 |
| UX-701 | Stage 7 | P0 | ATM. CORRECTION | 将“理想闭环”和“大气假设失配”显示分离，暴露当前 V10.1 物理限制，不暗示已做真正独立 AC 验证 | `workspaces/ac.js`、`workspaces/atm.js` | 界面明确说明 same-model inverse crime 风险及实际可用实验 |
| UX-702 | Stage 7 | P1 | A/B COMPARISON | 参数差异、模型响应与光谱差异采用一组共享单位/范围基准 | `workspaces/compare.js`、图表层 | 双模型条件可回溯；A/B 差异零点、正负号及对比范围准确 |
| UX-703 | Stage 7 | P1 | SENSITIVITY | 用“输入扰动→响应→局部有效域”组织灵敏度图与解释，明确有限差分步长 | `workspaces/sensitivity.js`、图表层 | 参数值、扰动方式、单位和曲线图例完整；不把局部梯度当全局规律 |
| UX-704 | Stage 7 | P1 | 所有九个工作区 | 统一空态/异常态/运行中/无匹配数据状态、科学图表表格替代内容 | 各 workspaces、shared shell | 每个工作区在数据缺失时 fail-closed；错误文本给出重试路径 |
| UX-801 | Stage 8 | P0 | 全站响应式 | 审计 320/390/768/1024/1440px 宽度，包含 iframe 宿主与应用内部 | `v102-layout.css`、`v102-components.css`、各工作区样式 | 文字不裁切、无文档级横向溢出、仅局部大型表格水平滚动；触控目标可用 |
| UX-802 | Stage 8 | P0 | WCAG/键盘 | Tab 流程、分组导航、dialog、Tools 菜单、滑块与 table caption 全面检查 | shell、`tests/browser/` | Focus 可见且顺序正确；图表具标题/说明及数据表；无键盘陷阱 |
| UX-803 | Stage 8 | P1 | 信息展示/视觉 | 建立统一样式 token、浅色/深色对比度量化、字体尺度及错误/成功配色语义 | 独立 token/style 模块、工作区 CSS | 正文、状态及坐标数字满足对比度目标；不要只凭颜色区分 |
| UX-804 | Stage 8 | P1 | 教学引导 | 模块内“研究问题—调节参数—观察—解释”短引导；不强制弹窗 | 各工作区、教学说明资源 | 不覆盖主图；学习者可跳过并随时恢复 |
| UX-805 | Stage 8 | P2 | 导出 | 实验报告增加当前图状态、离散样本、科学假设与版本信息；CSV/JSON 逻辑严守 schema | `app/export.js`、schema/新报告模板 | 旧版 schema v3–v8 兼容；导出不暗示外部验证；可复现 |
| UX-901 | Stage 9 | P0 | 全部九模块 | 独立截图回归、已有科学数值逐值一致、键盘+移动回归、故障注入 | `.github/workflows/quality.yml`、`tests/browser/`、workbench tests | 整站 CI、实验 schema、RT 45 场景、旧版 V9/V10/V10.1 测试均通过 |
| UX-902 | Stage 9 | P1 | 性能 | 长波段谱线/矩阵图重绘性能、首次渲染大小和内存消耗量化 | Build/performance tests、chart adapters | 与 V10.1 基线比较；异常降级而非遮挡科学输出 |
| UX-1001 | Stage 10 | P0 | 发布/维护 | 完成产品/科学审阅、版本范围变更审批、正式文档与回滚演练 | `docs/`、release workflows、`site/core/modules.js` | 审批记录可查、生产冒烟通过、V10.1 明确可回退 |

## 2. 属于“科学功能开发”，**不能算在纯 UI 改版完成度中**

| 编号 | 优先级 | 科学积压项 | 为什么独立 |
|---|---|---|---|
| SCI-01 | P0 | 独立 RT 求解器对照、角度/深度/相函数收敛性与能量闭合 | V10.1 数值解是内部参考，未完成外部科学验证 |
| SCI-02 | P1 | 实际海气界面 Fresnel、Snell 折射、方位分辨方向场、非 HG 体散射函数 | 需要新物理求解器/数据，不是新增一张漂亮角度图 |
| SCI-03 | P1 | 独立大气前向/反演失配实验与误差传播（原 F06） | V10.2 原功能路线图尚未获批重新排期 |
| SCI-04 | P1 | 以科学假设为中心的课程实验与自动判据（原 F07） | 需要教学目标、实验设计与验证规则 |
| SCI-05 | P2 | 实测 matchup、气溶胶关联误差、非线性多参反演与有效域研究 | 必须遵守观测来源、测量条件与不确定度定义 |

## 3. 建议的下次对话与交付划分

**下一轮（Stage 5）：** 同时完成 `UX-501` 至 `UX-503`：UNCERTAINTY 结果解释、Jacobian/矩阵科学呈现和实验配置器；附单元测试与 Playwright 验收。

**再下两轮（Stage 6–7）：** 先重构 Radiative Path / Water Optics / Atmosphere / Sensor，再重构 Atmospheric Correction / A-B / Sensitivity；`UX-704` 穿插完成。

**后续两至三轮（Stage 8–10）：** 无障碍与响应式全量检查、全站性能/科学回归、设计评审和正式版本验收。若已经提前部署本批 Stage 1–4，后续各批只能在绿灯 CI 后逐项合并。

## 4. 每次开发后必须追加的记录

| 记录字段 | 例子 |
|---|---|
| 日期、执行人、对应 PR | 2026-10-09 / PR #… |
| 需求编号与状态 | `UX-501` — 待开发 / 开发中 / 已提交 / 已验收 / 已上线 |
| 科学模型改变？ | 默认应为 **否**；若是则另开科学审查 |
| 测试证据 | 单元测试、浏览器测试、完整 CI URL、正式部署 URL |
| 遗留问题与下一步 | 不遮蔽故障；写可重现条件 |

## 5. 版本标识及真实性

本文件是**待办清单**，并不是已完成工作的验收证明。只有 GitHub Pages 部署及公开资源检查成功后才能把本批 V10.2 Stage 1–4 标为“已上线”。代码通过内部计算/交互测试也不构成海洋 RT 物理验证。
