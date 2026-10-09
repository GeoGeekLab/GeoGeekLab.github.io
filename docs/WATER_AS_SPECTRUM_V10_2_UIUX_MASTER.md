---
doc_id: WAS-UX-V10.2-SPEC
project: Water as Spectrum / GeoGeek Lab L13
title: V10.2 UI/UX 全面改版方案
version: 1.0.0
status: PROPOSED
created: 2026-10-09
baseline: V10.1 / 9 workspaces / experiment schema v8
scope: interface and interaction refactoring; scientific models unchanged by default
source_of_truth: WATER_AS_SPECTRUM_REQUIREMENTS_MASTER.md after approved change control
owners:
  product: TBD
  ux: TBD
  frontend: TBD
  science: TBD
  qa: TBD
review_required: [product, ux, frontend, water-color-science, qa]
---

# Water as Spectrum V10.2：UI/UX 全面改版方案

> **文件定位**：可供产品设计、科学审稿、前端开发、测试和发布直接使用的 **UI/UX 版本需求规格 + 设计系统 + 九工作区改版规范 + 研发任务清单 + 验收方案**，不是单纯的视觉提案。
>
> **科学底线**：V10.2 默认只改变表达与交互，不修改 V10.1 半解析公式、DOM 自建参考数据、假定噪声模型或实验 schema v8 的含义。UI 验收不能代替独立科学模型验证。
>
> **版本范围提醒**：现有需求母本第 10.3 节规定 **V10.2 = F06 大气误差 + F07 引导实验**。本次用户指定 **V10.2 = UI/UX 全面改版**，属于正式范围变更，必须经 `RFC-UX-0102` 批准并为原有功能重新排期；不能悄悄将 F06/F07 标为已完成、取消或已自动顺延。

## 0. 执行摘要与产品目标

### 0.1 总体判断

现有界面具有可识别的 GeoGeek 深色实验室气质，也包含科学模型限制声明，但在实际操作中呈现**信息密集、主图滞后、任务流程不明确、嵌套滚动、右侧设置与结果割裂**的问题。界面更像一次性功能仪表盘，而不是能重复开展课程实验的科学工作台。

V10.2 的目标不是换肤，而是将产品升级为：

1. **结果优先**：主图、单位、当前条件必须在首屏可见。
2. **任务驱动**：使用者知道先选什么、如何读图、下一步如何核对实验。
3. **科学真实**：一眼能分辨半解析模拟、内部生成的 RT 参考、名义传感器响应、形式 Fisher 不确定度与实际观测。
4. **一次滚动**：科学工作台使用一个清楚的主纵向滚动上下文，避免容器互相抢夺触控或鼠标滚轮。
5. **跨模块一致**：九个工作区共享同一导航、状态提示、控件、图表、来源和导出规则。
6. **可验证与可维护**：每个变更都有明确的文件影响范围、测试、数值零漂移约束及回退方案。

### 0.2 四条决策原则

| ID | 决策 | 关键条件 |
|---|---|---|
| IA-01 | 九个工作区保留原稳定 ID，改为**分组式导航** | 不破坏实验状态与深链接 |
| LAYOUT-01 | **单主纵向滚动** + 可折叠设置栏 | 不允许靠隐藏滚动条伪装修复 |
| SCI-01 | 图表先呈现量、单位、样本、来源与有效域 | 不混淆 `rrs/Rrs`、`b/bb`、数值参考与实测 |
| RELEASE-01 | 科学数据**零漂移**；独立科学更新另开 ADR | V10.1 固定模型输出、RT 数据和 schema 可追踪 |

### 0.3 成功指标（拟定验收目标，非当前实测）

| ID | 指标 | 目标 | 评估 |
|---|---|---|---|
| K-01 | 找到 WATER RT 模块 | 常用布局下 ≤2次明确导航操作 | 用户任务测试 |
| K-02 | 理解 RT 当前水体、太阳角、波长、深度与来源 | ≥90% 测试参与者 10 秒内答对至少 3 项 | 限时任务 |
| K-03 | 独立理解并处理 RT `Current controls differ` | ≥85% 无指导完成匹配操作 | 任务观察 |
| K-04 | 分清 Fisher 形式不确定度与实证准确率 | ≥90% 给出正确理解 | 概念问答 |
| K-05 | 页面/图表/设置的相互竞争纵向滚动 | **0** | DOM 测量+手机滚动检查 |
| K-06 | 旧模型输出、RT 45 个离线场景、schema v8 | **零科学数据漂移** | 跨版本回归 |
| K-07 | 适用的 WCAG 2.2 AA | 无阻断性问题 | axe + 键盘/读屏 |
| K-08 | 390px 宽的核心 RT/U08 工作流 | 100% 可达、整页不横向溢出 | 真机/E2E |
| K-09 | 半解析参数更改反馈 | 提议 p95 ≤250ms，待定设备测量后批准 | RUM/实验室性能基线 |

所有百分比和响应预算是**目标提案**，未完成样本测试与设备基准前禁止宣传成已有成果。

---

## 1. 证据基线与问题清单

### 1.1 用户截图与当前代码

| 编号 | 来源 | 观察事实与科学风险 |
|---|---|---|
| S1 | 用户截图 `image(20261008-234218).png`（1895×864） | WATER RT 主图容器内部滚动，首屏首先看到长状态文案和指标卡，科学曲线被压低；顶层九标签、右侧条件按钮墙密集。 |
| S2 | 用户截图 `image(20261008-234241).png`（1919×871） | UNCERTAINTY 在主内容内部滚动，右侧独立控制栏；形式 1σ、敏感度列 cosine 和最弱模态缺少通俗但准确的解释。 |
| CODE-01 | `site/water/workbench-v10-1/app/index.html` | `.shell` 常驻 `100dvh`、`.chart-main{overflow:auto}`、`.rt-shell{overflow-y:auto}`、`.u9-container{overflow:auto}`、`.control-scroll{overflow:auto}`；布局问题有明确 CSS 根因。 |
| CODE-02 | 同上 | `.topbar` 最小高度 99px、`.appnav` 58px、`.workspace-head` ≥108px，外层还有宿主标题；首屏高度持续被非结果区域消耗。 |
| CODE-03 | `site/water/workbench-v10-1/instrument.js`、`instrument.css` | 产品经由 same-origin iframe 嵌入全屏宿主；解决滚动必须明确宿主/iframe 两级责任。 |
| CODE-04 | `site/core/modules.js` | 默认使用 V10.1；`waterVersion=v10` 与 `waterVersion=v9` 仍用于历史回退。 |
| SCI-01 | `site/water/workbench-v10-1/README.md` | WATER RT 为自建的标量、方位平均 DOM 数值参考，非 HydroLight 实测或已外部 benchmark 的研究级解。 |
| PRD-01 | `docs/WATER_AS_SPECTRUM_REQUIREMENTS_MASTER.md` | 对科学数据、单位、可复现性、无障碍有既定契约，并且 V10.2 的原定科学功能需要变更审批。 |

**证据边界**：截图仅覆盖 09 WATER RT 与 08 UNCERTAINTY；其他七个工作区需结合共用代码检查并做逐屏测试，不应声称已全部在截图中观察到一样的问题。

### 1.2 缺陷矩阵

| ID | 缺陷 | 严重性 | 直接设计后果 |
|---|---|---|---|
| D-01 | 宿主大标题、内导航、模块头部、次级 tab 堆叠 | P0 | 首屏主图被推到看不见 |
| D-02 | 主图/卡片/参数区独立纵向滚动 | P0 | 鼠标、触屏、焦点滚动混乱 |
| D-03 | 九标签无任务分组、末项被挤压 | P0 | 导航扫描负担大，当前任务关系弱 |
| D-04 | 参考匹配状态和“Load matched”动作分离 | P0 | 易误以为数据错误或无法恢复 |
| D-05 | 全局“SEMI_ANALYTICAL”盖住 RT 独立来源身份 | P0 | 参考求解/半解析结果可能被混同 |
| D-06 | U08 cosine、correlation、1σ 缺少科学语义分离 | P0 | 误导参数相关和误差理解 |
| D-07 | 小字/大写/monospace 过量 | P1 | 阅读疲劳、视觉主次不明 |
| D-08 | 导出、锁轴、隐藏栏、模型说明按钮同权 | P1 | 最重要操作不突出 |
| D-09 | 按钮墙式参数栏，不按实验步骤组织 | P1 | 用户不会设计可解释的实验 |
| D-10 | 图表的单位、来源、有效域散落在说明中 | P1 | 离开长文字就无法正确读图 |
| D-11 | 全局状态栏重复但状态字段缺少统一所有者 | P1 | 状态条像装饰，且可能更新不同步 |
| D-12 | 控件交互语义不一致、触达面积偏小 | P1 | 键盘与手机可用性受损 |

### 1.3 不推翻的优秀基础

保留：暗色科研风格、GeoGeek 标识、适量 serif 标题、橙色活跃强调、科学适用域披露、九模块结构及已有数值函数。**重构的是任务顺序、层级、控件和可视化语义，而不是科学模型本身。**

---

## 2. 用户、核心任务与科学真实性

### 2.1 用户画像与优先需求

| 用户 | 研究或教学目标 | 首要界面能力 |
|---|---|---|
| 教师/助教 | 快速组织参数实验，并解释物理结果 | 可复现预设、主结论、可投屏图表 |
| 海洋光学学生 | 理解 IOP/AOP、角度场、条件误差 | 浅层解释、可逐层展开的专业定义 |
| 研究人员/科学评审 | 校验变量、量纲、边界条件和对照有效性 | 来源/方法、数值表格、研究限制 |
| 交互科学软件开发者 | 维护状态、图表、数据版本、回退 | 组件化、可测试契约、稳定 schema |

### 2.2 标准的六步实验循环

**Identify**（研究对象是什么）→ **Configure**（当前物理条件）→ **Observe**（主图/数值）→ **Interpret**（趋势及假设）→ **Validate scope**（数据来源与有效域）→ **Save/reproduce**（导出状态和结果）。

布局要支持这条线性路径，但不强制专家逐步操作；专家可以直接进入结果或展开方法细节。

### 2.3 不可妥协的科学表达规则

- 区分水下 `r_rs` 和水上 `Rrs`；两者虽都以 `sr⁻¹` 标识，但几何与接口不同。
- 区分总体散射 `b` 与后向散射 `bb`，尤其 RT 中假定 HG 相函数并由 `bb` 推算 `b`。
- RT 当前为方位平均 `L_u(z,μ)`，不能宣称求得全方位 `L(z,θ,φ)`。
- `WATER RT` 的 45 个固定案例是内部生成的离散 RTE 解；**不是**有实测验证的连续水体场。
- Fisher 中 `sqrt(diag(F⁻¹))` 是在指定噪声/局部线性/可辨识条件下的形式不确定性，不等于现场观测准确度。
- Jacobian 两列的余弦相似度不是后验参数相关系数；不能用“高度相关”含混代替数学定义。
- SRF nominal 与有来源的 measured SRF 必须在图例和控件中区分；模型超域的 OLCI Oa11 不得显示伪造反射率。
- 如提供线连接/色阶插值，应标示仅用于视觉连接，不增添新的科学样本点。
- 图像内任何光线路径动画都要有 `schematic` 标签，不冒充数值 RT。

---

## 3. 信息架构：九模块，一个工作台

### 3.1 三级任务分组

现有 tab ID `path/iop/atm/sensor/ac/compare/sensitivity/uncertainty/rt` **必须保留**。

| 分组 | 工作区 | 目的 |
|---|---|---|
| **Mechanisms / 物理过程** | Radiative Path / Water Optics / Atmosphere / Sensor / Atmospheric Correction | 建立过程、分量和观测量 |
| **Experiments / 实验对照** | A/B Comparison / Sensitivity | 观察输入扰动和光谱响应 |
| **Diagnostics / 模型诊断** | Uncertainty / WATER RT | 判断局部可辨识性、比较数值 RTE 与半解析近似 |

保留母本将来 `LEARN/EXPLORE/VALIDATE` 三顶层任务模式的长期意图，但 V10.2 **不**借 UX 改版直接实现完整课程引擎。

### 3.2 桌面目标骨架

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Water as Spectrum   /   WATER RT            [model identity]    [⋯ Tools] │
├──────────────┬─────────────────────────────────────────┬───────────────────┤
│ Mechanisms   │ Underwater Light Field                  │ Experiment Setup  │
│ • Path       │ 学术问题 + 当前条件摘要                 │ Reference water   │
│ • IOP        │ [Depth] [Angular] [Model comparison]    │ In-water sun zenith│
│ • Atmosphere │ ┌─────────────────────────────────────┐ │ Wavelength        │
│ • Sensor     │ │ PRIMARY FIGURE  axes / units / legend│ │ Depth             │
│ • AC         │ │                                     │ │ [Match inputs]    │
│ Experiments  │ │                                     │ │ Advanced details  │
│ • A/B        │ └─────────────────────────────────────┘ │                   │
│ • Sensitivity│ 3 key readings / scientifically precise │                   │
│ Diagnostics  │ explanation / source data table         │                   │
│ • U08        │                                         │                   │
│ • RT ◀       │                                         │                   │
└──────────────┴─────────────────────────────────────────┴───────────────────┘
                 一个工作区滚动上下文；设置栏不单独滚动
```

≥1440px 时左侧导航目标 196–216px、右侧参数 288–328px，中间结果区至少约 760px；左导航可收为 56px。低于足够宽度时要主动折叠辅助栏，而非把图表压碎。

### 3.3 平板和手机

| 可用宽度 | 结构 | 控制行为 |
|---|---|---|
| ≥1440px | 左分组导航 + 主结果 + 右参数区 | 参数区可折叠，sticky 但不独立滚动 |
| 1200–1439px | 收窄/折叠左导航 + 主结果 + 参数栏 | 保证主图可读 |
| 768–1199px | 顶部当前模块选择 + 主结果 + 参数抽屉 | 无九标签裁切 |
| 320–767px | 单列：条件 → 主图 → 解释 → 可展开控件 | 保持单主纵向滚动，不让按钮墙横向溢出 |

### 3.4 状态模型

统一展示：模型身份、来源状态、采样域、情景参数、条件匹配状态。`SEMI_ANALYTICAL` 与 `SELF_GENERATED_RT_REFERENCE` 是**不同科学来源标签**，不能仅靠一个顶部折叠字符串表达。`LOCAL / GEOGEEK`、`STATUS / DECLARED` 等泛状态可以删减，真正有用的信息只保留一份。

---

## 4. 统一页面骨架与滚动策略

### 4.1 固定骨架

```text
WorkspaceShell
 ├─ GlobalWorkHeader          紧凑品牌 / 当前模块 / 工具 / 关闭
 ├─ WorkspaceContext          任务问题 / 模型身份 / 限制摘要
 ├─ ScenarioSummary           当前重要条件（3–4 项）
 ├─ ViewTabs                  用户懂得的图表/分析视角
 ├─ PrimaryScientificFigure   结果优先、单位/来源可就地查阅
 ├─ ResultSummary             对研究问题直接有用的 2–4 项指标
 ├─ Interpretation            解释 + 模型边界，可展开公式
 ├─ DataTableAndExport        原始样本与复现
 └─ ExperimentControls        同一滚动上下文的辅助参数
```

结构在全部九页复用，允许各模块有不同图形，但控件/状态/解释的位置规律必须一致。

### 4.2 信息逐级展开

| 层级 | 默认展示 | 展开后展示 |
|---|---|---|
| 立即可见 | 研究问题、场景、主图、关键结论、重要不匹配提示 | 无需展开 |
| 二级 | 次级图、参数差异、导数说明、数据表 | 由 `Details / Show data` 打开 |
| 三级 | 数学推导、离散策略、相函数、数据来源、许可证 | `Model & data provenance` |

“未验证”“当前参数不匹配”“仅为假设噪声”不是次要细节，必须至少在结果和来源层就地出现。

### 4.3 按钮和操作层级

- **Primary**：本模块完成核心任务的动作，例如 `Use this reference case in Water Optics`。主区或配置区显著位置只设置一个主要动作。
- **Secondary**：`Reset / Hide setup / Lock Y axis`，靠近受其影响的内容。
- **Utilities**：`Export experiment JSON / Export chart CSV / Import JSON / Model scope` 收至右上 `Experiment tools` 菜单，减少首屏占用。
- **Danger**：清空实验、覆盖已存快照等操作必须明确风险和恢复选项。

禁用按钮说明为什么禁用；避免只降低 opacity。

### 4.4 单一主纵向滚动 P0

当前是**宿主全屏 dialog + same-origin iframe**，不能只把 `.rt-shell` 的滚动条隐藏。明确以下交互契约：

1. 桌面全屏仪器：宿主负责关闭/焦点边界，iframe 工作台是**唯一纵向主滚动**；父页面背景锁定。
2. `.chart-main`、`.rt-shell`、`.u9-container`、`.control-scroll` 移除相互独立的 `overflow:auto` 和固定高度剪裁；内容自然撑开。设置区若 sticky，也不另起独立滚动。
3. 手机上必须验证 iframe 对触控滚动和软键盘的影响。如果浏览器无法稳定支持 iframe 内主滚动，则切换为**宿主唯一主滚动**方案并调整 iframe 高度，不能同时存在两种主滚动。
4. 模态对话框是唯一允许独立纵向滚动的例外，必须完整处理打开/关闭焦点；大型数据表可有局部**横向**滚动，但不造成整页水平滚动。
5. 不许靠 `scrollbar-width:none` 欺骗验收；要检查真实 `scrollHeight/clientHeight` 并在手机手动测试滚轮、触控、键盘 Tab 和滚动恢复。

### 4.5 加载、域外、错误与不匹配

- 数据加载：保留原有主图区占位并写明“读取预先计算的数值参考”，禁止等待时用假曲线装饰。
- 加载失败：保留条件，空结果 + 错误原因 + Retry，不用半解析结果冒充 RT。
- 域外：以 `Unavailable/Out of domain` 标记，绝不可代入 0。
- 不匹配：分开 `Archived paired comparison valid` 与 `Current workbench differs`，紧邻同步操作。
- 假设/验证：显式标记 `internally generated / external benchmark pending` 或 `conditional under assumed noise`。

---

## 5. 科学视觉设计系统

### 5.1 设计语言

保留深墨绿、精简 serif 品牌、适度暖橙激活色；降低页面整体“仿终端”强度。科学图表、任务标题与实际读数是主角。深色主题通过背景层级区分，而不是所有容器都采用相似底色 + 细描边。

### 5.2 设计 Token 候选值（须在实施时检验对比度）

| Token | 建议色值 | 作用 |
|---|---|---|
| `--ux-bg` | `#0E1713` | 背景 |
| `--ux-surface-1` | `#15231D` | 主面板 |
| `--ux-surface-2` | `#203229` | 内层图表/结果卡 |
| `--ux-border` | `#3A5146` | 分隔与图轴 |
| `--ux-text` | `#EDF4EF` | 一级文字 |
| `--ux-text-secondary` | `#C5D6CC` | 正文 |
| `--ux-text-muted` | `#A8BEB1` | 次级说明 |
| `--ux-accent` | `#E9A179` | 当前动作 |
| `--ux-data-ed` | `#A8D9F8` | Ed，配合实线/文本 |
| `--ux-data-eu` | `#F0C68F` | Eu，配合虚线/文本 |
| `--ux-data-secondary` | `#B5D7B4` | 另一系列 |
| `--ux-warning` | `#E6BC83` | 可恢复的匹配/域提示 |
| `--ux-error` | `#E8A6A3` | 数据与网络错误 |

**无障碍目标**：正文相应对比度 ≥4.5:1，大文字 ≥3:1，关键非文本 UI 与图示 ≥3:1，遵循 WCAG 2.2 AA 相关要求。上表为候选色，不声明已通过每一种背景配对的测量。曲线必须至少使用颜色 + 线型/形状双编码。

### 5.3 字体层次

| 内容 | 建议 | 规则 |
|---|---|---|
| 紧凑品牌 | Serif 20–24px | 替换始终常驻的巨大品牌题头 |
| 工作区标题 | Serif 24–30px | 单页一个主要标题 |
| 图表标题/科学问题 | Sans 16–20px / semibold | 从细小科技标签提升为信息主语 |
| 正文解释 | Sans 14–16px / line-height 1.5–1.7 | 不全大写，不大量 mono |
| 参数标签 | Sans 13–14px | 用自然语序解释变量 |
| 数值、公式、版本 | Tabular/Mono 14–20px | 数字与单位易对齐 |
| 刻度/图例 | Sans/Tabular 12–14px | 小屏不能继续缩至 9px |

### 5.4 触控、留白与图表尺寸

- 采用 4/8/12/16/24/32px 的间距级差，一级卡片内边距约 16–20px。
- 可交互命中目标按 **44×44 CSS px** 设计；视觉紧凑按钮可扩大点击区域，禁用态仍有文字解释。
- 主科学图表自然高度建议 340–460px，手机 ≥280px；轴标题、数据点和来源不能被裁掉。
- 卡片层级最多用两到三级可分辨面，避免过度描边造成密集网格感。
- 动效仅表达改变状态，约 120–180ms，并尊重 `prefers-reduced-motion`。**不把概念动画表现为数值光子追踪**。

### 5.5 设计文件交付规范

设计团队至少提交桌面/笔记本/平板/移动四组状态图：默认、数据加载失败、不匹配、方法展开和图表数据表。每张 UI 截图必须有对应的任务、测试编号、量纲、来源与版本，不接受只画无数据的美术占位样稿。

---

## 6. WATER RT 工作区逐屏改版（核心样板模块）

### 6.1 现状与改版目标

当前页面中“Depth, direction & model discrepancy”大标题、两条较长的可信度状态、条件解释、五个数据卡和曲线图全都放在主图容器内部；在 S1 所示 864px 屏高中，图表被推到首屏可视区域外，用户容易以为它只是一块说明页面。右侧四组离散按钮的操作顺序与“不匹配”动作也被分开。

**目标**：用户一眼看到主图，明白“所选的参考水体/太阳角/波长/深度”，并立即知道当前主图来自哪个数值来源；进入比较视图时可以理解配对状态。

### 6.2 WATER RT 目标版式——桌面

```text
┌─ WATER RT | Underwater Light Field ────────────────────────────────────────┐
│ 观察水中光随深度与方向的变化；与同 IOP 半解析结果比较。                    │
│                                                                           │
│ [Clear ocean] [30° in-water] [490 nm] [Depth 2 m] [DOM generated / unverified] │
│                                                                           │
│ [Depth profiles]    [Angular radiance]    [Model comparison]              │
│                                                                           │
│ ┌─────────────────── Main Scientific Figure ────────────────────────────┐ │
│ │  Ed(z) & Eu(z) │ units / reference Ed(0−) / axis direction         ⓘ │ │
│ │                                                                    │ │
│ │       主图（先于长段解释出现；可读轴、可选探针）                    │ │
│ │                                                                    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ [Ed(2 m)] [Eu(2 m)] [Kd(2 m)]  [View source table]                         │
│                                                                           │
│ 方法说明（2 句）                       [Model & data details]             │
└───────────────────────────────────────────────────────────────────────────┘
右侧可折叠：Reference case → Solar angle → Wavelength → Depth → Match action
```

**主图和关键条件的位置先于方法长文**，取消“主图滚动卡套主图”的形式。

### 6.3 控制系统改造

| 当前 | V10.2 改法 | 交互约束 |
|---|---|---|
| `WATER CLASS` 平排按钮 | `Reference water type` 单选卡（默认推荐），3类 | 说明预设 IOP 是固定案例，非动态求解 |
| `SUN ZENITH IN WATER` | `Solar zenith in water` 0°/30°/60° | `in-water` 显示在控件标签中，不仅在帮助文案里 |
| `WAVELENGTH · SAMPLED` | `Reference wavelength` 440/490/550/620/680 nm | 标记为**离散节点**；禁止输入不存在波长后静默插值 |
| `DEPTH · SAMPLED` | 桌面可用单选条，窄屏用 select | 仅数据集 10 个深度；显示 `m` |
| `Load matched water IOP & nominal sun state` | 状态卡内的唯一主操作：`Use this reference case in Water Optics` | 点击前明确会覆盖哪些模型参数；保留返回/撤销途径 |
| `CURRENT WORKBENCH STATE: DIFFERENT` | `Current controls differ from this archived case` | 解释影响哪一条曲线，不用恐慌式警告 |

**变量和副作用说明**：同步操作必须列出即将覆盖的 `chl, ag, anap, bbp, eta, sg, snap, sza`。在正式实现时，以实际被覆盖字段为准；不得把 `sza` 仅当大气层太阳角处理而不说明“参考求解器直接在水中施加太阳角”。

### 6.4 Depth Profiles 视图：科学图形规格

主要显示两张与物理问题一致的图，但不要让第一屏同时塞入过小的两张：

**主图 A：归一化辐照度—深度**

- 标题：`Downwelling and upwelling plane irradiance`。
- 纵轴默认为深度 `z [m]`，**0 m 在顶端、深度向下递增**；横轴默认为 `E(z) / E_d,direct(0−) [1]`。可提供线性/对数尺度切换。
- 系列：`E_d`（包括直射+漫射下行）与 `E_u`（上行漫射），以冷暖颜色**及实/虚线型双编码**。
- 在现有采样深度位置绘制小节点；相邻节点连接仅作视觉引导，不暗示连续精度。
- 对数坐标若包含 0，则将 0 样本明确显示为“不适用于 log”，不强行替换为任意 epsilon 伪值。
- `Ed(0−)` 的参考归一化必须在副标题/图例中清楚，不能让学生以为为真实 W m⁻²。
- 若选择 2 m，可用横向指示线/十字探针同时读出 `Ed`、`Eu`，包含量纲。

**辅图 B：衰减系数深度廓线**

- `K_d(z) [m⁻¹]`，注明是根据离散 `E_d` 深度样本做差分的局部估计，而非独立实测。
- 默认保持深度的相同向下坐标定义；当分辨率不足时显示在主图下方。
- 标出表层与末端差分的估计方式（单边差分），不以过度平滑掩饰离散误差。

**关键指标（不要抢图）**：`Ed(z) / Ed,inc`、`Eu(z) / Ed,inc`、`Kd(z)` 三项，在图前简短概要或图后结果栏展示。`Case`、`Probe` 是条件摘要而非科学结果，不应伪装成同权的数值结果卡。

### 6.5 Angular Radiance 视图：避免视觉误导

- 标题：`Upward angular radiance (azimuth-averaged)`，副标题说明 `L_u(z, μ)`。
- 横轴可采用 `|μ| = |cos θ|`（0 近水平，1 接近向上法线/近天顶）；额外辅助标出 θ 而**不产生新采样值**。
- 纵轴：`L_u / E_d,direct(0−) [sr⁻¹]`；只绘制**八个真实离散求解器节点**，节点明显可见。
- 鼠标、键盘聚焦节点时显示：`depth`, `μ`, `equivalent angle`, `radiance`, `numerical engine`, `generated/unvalidated`。
- 必须显示：`No azimuth resolution · Near-nadir only, not exact μ = −1`。
- 禁止将曲线做成光线“发射扇形”并冠以实际求解方向场；若加教学示意，单列 `Conceptual schematic` 且与数值图区隔离。

### 6.6 Model Comparison 视图：以“同条件配对”作为主语

**标题建议**：`Numerical RT vs semi-analytical rrs`。图上方固定提示：

> *Paired values use the same archived IOP state and prescribed in-water sun angle. The two models differ in radiative-transfer/scattering assumptions.*

三个信息层：

1. **配对状态**：`Archived pair: valid` 始终可验证；`Current Water Optics controls: matched / not matched` 单独显示。二者不能混成“数据不可信”。
2. **上方光谱图**：5个离散波长节点的 `r_rs [sr⁻¹]` 对照（参考 DOM vs semi-analytical），符号与线型区分；不以高密度连续光谱渲染假装具有 1 nm RT 求解结果。
3. **下方绝对残差图**：`Δr_rs = r_rs,semi − r_rs,DOM [sr⁻¹]`，0 基线、正负方向和节点标注。必要时提供 `% difference` 的可选视图，但参考值接近 0 时标为不可用。

图旁只保留两个摘要读数：`Mean signed difference`、`RMSE across five spectral nodes`。明确它们是**模型间差异，不是相对于观测真值的准确性**。

### 6.7 WATER RT 失败与缺数据处理

| 触发 | UI 必须做到 | 不得发生 |
|---|---|---|
| `rt-reference-v1.json` 加载失败 | 显示加载失败、保留条件、`Retry` | 假造曲线或回退用半解析结果冒充 RT |
| 当前 IOP 与归档案例不一致 | 当前状态提示 + `Use archived parameters` | 使用当前参数误标为归档结果 |
| 非5个支持波长 | 选项明确禁用/提示域外 | 默默外推 |
| 太阳角非 0/30/60° | 显示离散选择限制 | 说成连续太阳角 RT |
| 执行 DOM 实例生成发生错误 | 不影响读取现有成功数据；标明是离线数据 | 把生成脚本异常伪装为视觉警告 |
| 缺失单位或来源 | 触发开发/QA 错误标识 | 生产仍显示“无量纲任意信号” |

### 6.8 WATER RT 验收样例

- `AT-UX-RT-01`：1895×864 类似屏宽下，进入 RT 后不滚动主区就可看到**至少主图标题、纵横轴、部分有效曲线及当前条件**。
- `AT-UX-RT-02`：390×844 纵屏下，可以选择 Phyto-rich、60°、620 nm、10 m，完成比较，无水平页面溢出。
- `AT-UX-RT-03`：若数据集请求拦截，结果主图区不出现任何有数值含义的 RT 曲线。
- `AT-UX-RT-04`：切换 depth/angular/compare 后，水体、角度、波长、深度都不重置。
- `AT-UX-RT-05`：未执行同步时，同屏明确出现 `Archived pair` 与 `Current controls differ`；同步后状态改为 matched 且能核对变动参数。
- `AT-UX-RT-06`：`r_rs` 的符号/单位、离散节点、非外部验证声明始终正确。
- `AT-UX-RT-07`：将 DOM 参考的一条 `Lu`/`Kd` 样本与 V10.1 JSON 对照，数值完全一致。
- `AT-UX-RT-08`：导出 schema v8 round-trip 后，参考案例、角度、波长、深度均复原。

---

## 7. UNCERTAINTY 工作区逐屏改版（第二个样板模块）

### 7.1 科学阅读路径

该模块不是一个“误差数值查询页”，而是一个**观测设计下的局部可辨识性实验**。建议将模块名从过宽泛的 `Uncertainty & Identifiability` 在一级标题附近加上副标题：

> *Which parameters can this sensor distinguish under the assumed noise model?*

界面应沿以下路径构建：`Observation design → Local Jacobian → Fisher information / rank → Conditional formal uncertainty → Interpretation`。

### 7.2 首屏布局建议

```text
┌─ UNCERTAINTY / Parameter Identifiability ────────────────────────────────┐
│ 问题：当前传感器及假设噪声下，哪些参数难以同时辨识？                     │
│ Model: local linearized Fisher | Sensor: OLCI nominal | σ: 2e−5 sr⁻¹    │
│                                                                          │
│ [Largest formal 1σ] [Most similar Jacobian pair] [Rank/conditioning]     │
│                                                                          │
│ [Summary] [Jacobian] [Parameter correlation]                             │
│ ┌────────────────────────────┬────────────────────────────────────────┐  │
│ │ Result / matrix            │ Interpretation                          │  │
│ │ 对比清晰、显示数值与单位    │ 区分“假设”与“结论”                      │  │
│ └────────────────────────────┴────────────────────────────────────────┘  │
│ Assumptions / numerical validity / View matrix table / Export           │
└──────────────────────────────────────────────────────────────────────────┘
右侧（桌面）：Sensor → SRF → Retrieved parameters → Noise → Step
```

### 7.3 统计概念与视觉编码（P0）

| 概念 | 数学定义/来源 | UI 正确标签 | 严禁称作 |
|---|---|---|---|
| 形式 1σ | 例如 `sqrt(diag((JᵀΣ⁻¹J)⁻¹))`，满足适用的局部线性可识别前提 | `Conditional formal 1σ`，附参数单位 | “测量误差”“真实可信区间”“检索准确率” |
| 敏感度相似 | 标度、噪声条件下 Jacobian 两列的 cosine | `Sensitivity-column cosine` | “后验参数相关系数” |
| 参数相关 | 从有效形式协方差矩阵标准化得到的相关度 | `Formal parameter correlation` | “自然水体经验协变”“因果关系” |
| 最弱模态 | 缩放/白化后 Jacobian 或 Fisher 的奇异向量/特征向量 | `Weakest local parameter combination` | “最不重要的变量” |
| 秩亏/不可辨识 | 依据显式阈值、归一化、局部 Jacobian | `Locally rank-deficient under this design` | “永远无法反演” |

**重要纠错**：截图中“chl vs ag: cosine 0.9069”仅说明两条**局部敏感度列**高度相似。它不能未经说明直接显示为 `strong parameter correlation` 或“Chl 与 CDOM 真实共变”。

### 7.4 Summary 视图（形式不确定度）

- 顶部 3 项**解释性摘要**，不要把每个数值块当作无差别卡片：
  - `Least constrained parameter`：相对或绝对 1σ 最大者，注明比较是否跨单位；跨单位默认使用比例/标度，不把 mg m⁻³ 与 m⁻¹ 直接比较大小。
  - `Most similar sensitivity pair`：`cosine = ...`，量定义可点击。
  - `Local identifiability status`：full rank / ill-conditioned / rank-deficient / not computable，必须有判据。
- `Formal 1σ` 可用**带轴的点区间图**或按参数列出的横向图，**不同量纲的参数分面显示**，而不是都画到同一物理数值轴。
- 数值卡写完整：`Chl-a · formal 1σ = ± 0.0652 mg m⁻³`；若估计基点可用，显示“相对于参考状态的局部误差尺度”，不是无条件的总体准确度。
- 解读区默认两句：先陈述数量事实，再陈述局部模型条件；禁止生成“估计可靠”之类未经验证断语。

### 7.5 Jacobian 视图（有单位、有标度）

- 主图为热力图或分面曲线：波段 × 参数，展示 `∂Rrs_band/∂p` 或**明确定义**的标准化/白化导数。
- 每次切换 `Raw / Scale-normalized / Noise-whitened` 都更新图标题、单位或无量纲说明。
- 配置里明确 perturbation step、参数边界截断方式、传感器 SRF 与 nominal/measured 模式。
- 正负导数使用发散色标与居中的零值；色标上下界及截断策略可查看。
- 波段不可用/没有 SRF 时显示缺测状态，而不是把 0 当成灵敏度为 0。

### 7.6 Correlations 视图（先声明矩阵定义）

- 仅当可构造有效协方差时，呈现**形式参数相关矩阵**，取值 `[-1,1]`，对角为 1；不可辨识情形使用单独说明，不输出看似有意义的相关矩阵。
- 高度相似的 Jacobian 列 cosine 应放在 `Sensitivity similarity` 小节，与 covariance correlation 清楚分离。
- 色标必须固定 `−1 / 0 / +1`，颜色之外同时有数字或悬停/焦点可读值；提供可下载表格。
- 正负相关具有不同符号；不使用同色深浅表达无符号强弱。

### 7.7 右侧实验配置：从按钮列表改为顺序实验设计

**Step 1 — Observation model**：传感器 `OLCI / OCI / MSI / OLI`，显示当前 SRF 模式可用性与覆盖波段。

**Step 2 — Retrieved parameters**：五个可选参数，显示 `2 selected / 5 available`，并清楚解释：此处只定义**分析中的自由参数**，未选参数固定。

**Step 3 — Noise assumption**：每波段噪声 σ 的假设值、单位 `sr⁻¹`、独立同方差模型。提供 `Why this matters`；不说“卫星真实测量噪声”。

**Step 4 — Derivative settings**：差分相对步长、自动边界处理、计算模式。面向新手折叠，专家模式显式展开。

**Step 5 — Recalculate / Reset**：若是自动更新，按钮叫 `Reset to baseline`，不要放一个无效的 `Run`；若转为显式运行，必须说明缓存与进度。

### 7.8 不确定性异常态

- 选择参数过多、波段不足、条件数过大时：显示**无法作可靠局部估计**的原因和已知局限，而不是 `± Infinity`、`NaN` 或虚假精度。
- 不把负对角协方差、奇异求逆、浮点问题静默裁剪成正小数。
- 选择 OCI nominal vs MSI measured 时，不是“不同级别误差”的简单对比，须说明 SRF 及波段维度不同、假设噪声相同并不能代表传感器整体优劣。
- 右侧控件一旦修改，摘要和图表使用**同一个计算状态版本**；异步计算未完成时旧结果带 `previous settings` 标识。

### 7.9 UNCERTAINTY 验收样例

- `AT-UX-U08-01`：首次进入 8 号工作区，1 个屏幕中能看到设计假设与形式不确定度摘要。
- `AT-UX-U08-02`：读屏器读出 `0.0652 mg m⁻³` 的量名、数值、单位与“conditional”标签。
- `AT-UX-U08-03`：敏感度 cosine 不出现在 `Formal parameter correlation` 标题下。
- `AT-UX-U08-04`：非法/秩亏场景不显示数字相关矩阵且有解释性空状态。
- `AT-UX-U08-05`：热力图含色标、零点、单位/标准化说明及数字表替代视图。
- `AT-UX-U08-06`：切换传感器和 SRF 后，图表数据和条件标签原子更新。
- `AT-UX-U08-07`：移动端可一次展示一个图，参数区可关闭返回图表，不丢已选参数。

---

## 8. 其余七个工作区统一改版要求

为避免“只有 WATER RT/UNCERTAINTY 被重新设计，其他七页又变成独立旧页面”，本节要求全量覆盖。**所有页面首先执行通用 Shell、字体/间距/操作分层、单滚动与单位规范，再实施差异化改版**。

| 工作区 | 主要任务 | 默认关键可视化 | 右侧控制重点 | 科学有效性必须显示 | 优先级 |
|---|---|---|---|---|---|
| `01 path` Radiative Path | 建立光路与因果联系 | 概念路径阶段图 + 选中步骤短解释 | 水体情景、阶段导航 | 明确 `SCHEMATIC`，不能用发光箭头冒充数值光子追踪 | P1 |
| `02 iop` Water Optics | 组分吸收/后散射如何塑造反射率 | `a(λ)`、`bb(λ)`、`r_rs/Rrs` 分面，不混轴 | Chl、CDOM、NAP、bbp、η、实验性斜率 | 单位、模型适用域、实验变体标签 | P0 |
| `03 atm` Atmosphere | 大气路径贡献与水体透射贡献 | 贡献分解堆叠/叠线 + 总合检验 | aerosol τ/α、压力、角度 | 当前仅 first-order、TOA `ρ*` 近似而非实际 L1 观测 | P1 |
| `04 sensor` Sensor | 波段积分如何影响光谱解释 | 光谱曲线 + SRF 带通 + 波段采样 | sensor/platform/SRF mode/band | nominal top-hat 与 published measured 的来源和有效域 | P0 |
| `05 ac` Atmospheric Correction | 演示理想闭合与假设偏差 | true vs corrected `Rrs` + 残差 | 假设 aerosol、校正参数 | 同模闭合非独立验证，负值/失败状态 | P1 |
| `06 compare` A/B Comparison | 设定两组情景并解释变化 | 同轴 A/B 光谱 + `B − A` 差值 | A/B 保存、切换、复位 | 两情景一致坐标/参数来源，数值量与单位 | P1 |
| `07 sensitivity` Sensitivity | 哪个参数最影响哪个波段 | 响应/差分曲线、导数方向 | 扰动参数与步长 | 局部导数、参考状态、归一化方式、边界 | P1 |

### 8.1 Radiative Path

- 阶段卡可保留象征性视觉，但标记为**教学示意（schematic）**；概念箭头不得与 RT 求解器计算矢量共用图例。
- 当前步骤的输入/输出和物理量关系应在主图区就地读出，右栏只放可改变的状态。
- 选阶段仅改变解释焦点，不默默改变 IOP 或几何参数。

### 8.2 Water Optics

- 明确 `a(λ) [m⁻¹]`、`bb(λ) [m⁻¹]`、`r_rs(λ) [sr⁻¹]` 与 `Rrs(λ) [sr⁻¹]`，不能把所有序列并排画进一个没有量纲差异的纵轴。
- 组件分解图可用 stacked/line，但累计总量与总线必须一致，并显示数值守恒检查。
- CDOM/NAP 斜率改变立即显示 `Exploratory slope variant`，并可一键恢复 V9 兼容值。

### 8.3 Atmosphere

- `Rayleigh path`、`Aerosol path`、`Transmitted water term` 的定义、单位和相加关系显示在图例或方法信息里。
- TOA 教学信号不应称“真实卫星辐亮度”，同屏标 `First-order simulated TOA reflectance`。
- 控件按“气溶胶 → 气压 → 观测角度”分组；角度图标必须符合定义而非做装饰旋转。

### 8.4 Sensor

- 分为 `Source spectrum`、`Band response`、`Band-integrated sample` 三层，突出 SRF 归一化/采样方式；波段不可用应与非零信号区分。
- OLCI Oa11（708.75 nm）不支持 400–700 nm 水体模型，必须显示 `Out of model domain`、空值或不可计算，不以邻近 700 nm 结果外推。
- 实测 SRF 只有来源确认的设备/平台可用；不能把 `nominal` 按钮美化成官方响应曲线。

### 8.5 Atmospheric Correction

- 默认 `Simulation closure` 且显著说明前向和逆向采用相关模型；用户应知道这不是独立准确度验证。
- 对比主图标出 `Rrs_reference`、`Rrs_corrected` 与残差，每条曲线的定义和算法版本应可查。
- 数学上的负值不应被悄悄 `max(0, x)` 修改；须按现有科学契约判断显示/遮蔽规则。

### 8.6 A/B Comparison

- 实验角色卡明确 `A: saved` 与 `B: live/saved`，保存时间、参数摘要、模型版本一目了然。
- 统一同轴或锁轴逻辑；不同参数变化时展示 `Changed variables (A → B)`，避免用户只看颜色差异。
- 残差 `Δ = B − A` 的定义固定在图上方；不自动切换差异符号约定。

### 8.7 Sensitivity

- `Finite difference`、扰动方向、参数数值范围与所对应参考点不能缺失。
- 若对数参数使用相对扰动，主图应明确 `per 1% parameter change` 或导数实际单位。
- 支持对比同一响应的两种参数，但必须有一致的标准化选择和清晰的单位标识。

---

## 9. 统一科学图表组件规范

### 9.1 图表最小数据契约

任何 `ScientificFigure` 至少接受以下字段，不允许只传 `title + x + y`：

```ts
type ScientificFigureSpec = {
  figureId: string;
  viewId: string;            // stable workspace view identifier
  title: string;
  question?: string;         // the scientific question answered
  quantity: {
    symbol: string;          // e.g. 'E_d' or 'r_rs'
    label: string;
    unit: string;            // 'sr^-1', 'm^-1', '1', ...
    referenceLevel?: string; // '0-', 'incident direct Ed', etc.
  };
  xAxis: {variable: string; unit: string; scale: 'linear'|'log'; direction?: 'increasing'|'down'};
  yAxis: {variable: string; unit: string; scale: 'linear'|'log'; direction?: 'increasing'|'down'};
  series: Array<{
    id: string; label: string; points: Array<{x:number; y:number|null; status:string}>;
    lineStyle?: 'solid'|'dash'|'dot'; marker?: 'circle'|'square'|'triangle';
    sourceModelId: string; referenceStatus?: string;
    sampled?: boolean; interpolation?: 'none'|'visual-join'|'validated';
  }>;
  validity: {status:string; domain:string; reason?:string};
  provenance: {modelId:string; modelVersion:string; datasetId?:string; validationLevel:string};
  altSummary: string;
  accessibleTable: Array<Record<string,string|number|null>>;
};
```

这是**V10.2 UI 侧设计接口草案**，不是承诺 V10.1 的原有数据结构已经符合上述 API；实施时应通过适配器转换，不改动科学引擎原始对象。

### 9.2 显示规定

- **图标题**应写问题和具体量：`How does Ed decrease with depth?`，或“Depth dependence of Ed and Eu”。
- **单位与参考层**不能藏在 tooltip：`sr⁻¹`、`m⁻¹`、`normalized to incident Ed(0−)`必须可直接看到。
- **波长与角度采样标识**：5节点光谱不进行未经验证的光谱插值；折线若存在须注明视觉连接。
- **轴锁定与缩放**：仅针对支持的坐标量；工作区不同变量切换后不能继承同一数值范围。
- **缺值**：使用无点/间断/表格 `N/A`；不能把 `null` 绘成 `(0,0)`。
- **零/负值**：对数轴不得直接呈现零或负值；必须给出线性轴回退或清晰的不可用说明。
- **图例**：为每条系列同时提供颜色、线型、文本标签，必要时在曲线末端直接标注系列名。
- **数据探针**：鼠标悬停、键盘聚焦和触屏点按均能获取同一数值信息。
- **来源**：显示 `Teaching semi-analytical / In-house numerical RT / measured SRF / nominal SRF` 之一；未经验证的称谓禁止模糊化。
- **复制与导出**：`Download data table (.csv)` 应使用可读列名和单位；实验 JSON 包含版本、状态与来源而非仅图像。

### 9.3 图表对照可靠性规则

| 比较 | 必须先检查 | 缺失时行为 |
|---|---|---|
| 半解析 vs RT | 相同水体 IOP、波长、太阳角约定、比较量 `rrs` | 告警并标注仅归档配对对照 |
| A vs B | 同一个目标物理量、传感器定义和横轴波长支持 | 禁止误用同轴同单位 |
| 传感器波段 vs 单色光谱 | SRF 模式、波段支持、积分方法 | 禁止用中心波长近似结果冒充 SRF 积分 |
| 形式不确定度跨参数 | 参数单位/尺度、同一 σ 假设与秩判据 | 用分面/相对尺度而非裸数大小排名 |
| 大气校正输出 vs 真实参考 | 正向/反向模型是否独立、输入是否实测 | 明确 `same-model closure`，不产生准确度结论 |

### 9.4 可访问图表替代

- 每幅 SVG 必须具有可读标题/描述和对应的 HTML 原始表格入口。
- 用 `<table>` 或等效可访问结构提供 x/y 数值、系列名、单位与状态，不强制用户通过鼠标 tooltip 获取数据。
- 热力图可按行/列导航并读出数值；避免屏幕阅读器在数百个 SVG 元素上逐项迷失，提供压缩摘要 + 表格。
- 颜色无法作为唯一编码：还要文本、线型、形状、正负号、轴标签。
- 导出 SVG/PNG 若实施，需保证文字清楚、图表名称/单位/来源随图保存；不能只导出黑色底图上的裸曲线。

---
## 10. 无障碍、响应式与国际化规范

### 10.1 无障碍语义

| 控件/内容 | 必须具备的语义 | 特别说明 |
|---|---|---|
| 主工作区导航 | `<nav aria-label="Workspaces">`；分组标题可用 heading 或正确的层级 list | 如果不使用真正 tabpanel 行为，不得只是硬套 `role=tablist` |
| 视图切换 | `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls` + 对应 `tabpanel`，**或者**按下式 toggle `aria-pressed`，二选一 | 不能混用 selected 与 pressed 而没有定义交互模型 |
| 离散单选组 | `fieldset`/`legend` + `input[type=radio]`，或经过测试的自定义单选模式 | 仅用十个 `aria-pressed` 按钮不自动获得单选语义 |
| 主操作 | 显式可读动词、目标和影响范围 | `Use reference case` 优于 `Apply` |
| 抽屉/模态 | 标题、焦点进入和返回、Esc 关闭；背景不可交互 | `aria-modal` 与实际焦点约束一致 |
| 模型状态 | 显示文字和图标；状态切换必要时 `aria-live="polite"` | 不对滑块每帧朗读整页 |
| 错误 | `role="alert"` 及明确恢复动作 | 消息不得凭颜色辨认 |
| 图表 | 标题、摘要、数据表替代、键盘探针 | tooltip 非唯一访问路径 |

必须通过：键盘从导航 → 条件摘要 → 视图 → 主图数据 → 设置 → 导出，再次打开工作区时焦点不能丢失到 iframe body 顶部。`Tab` 不能陷入隐藏右栏；隐藏后应从 tab 顺序移除。导航激活变化后，屏幕阅读器应能获知新工作区标题。

### 10.2 响应式断点（设计规范，不以设备名称代替真实容器）

| 工作台**可用**宽度 | 目标布局 | 特殊行为 | 验收尺寸 |
|---|---|---|---|
| ≥ 1440px | 可折叠左分组 + 主内容 + 右设置区 | 主图在首屏，右栏 sticky 无独立滚动 | 1895×864、1440×900 |
| 1200–1439px | 左导航默认收窄，右栏仍可见或可收起 | 主区不得小于主要图所需可读宽度 | 1366×768 |
| 768–1199px | 顶部导航选择器 + 主内容 + 设置抽屉 | 不横向切断 tab、无两栏压图 | 1024×768、820×1180 |
| 320–767px | 单列工作台 + 参数抽屉/可展开控件 | 数据表可局部横向滚动，但**页面**不允许横向滚动 | 390×844、375×812、320×700 |

注意 iframe 外宿主通常有内边距和固定头部；媒体查询应尽量按**实际工作台容器宽**设计，不能仅凭浏览器 `window.innerWidth` 作布局判断。

### 10.3 国际化与数值格式

- V10.2 默认允许保持英文界面，但所有用户可见字符串必须集中登记，不能散在 `renderChart` 字符串拼接中。中文翻译可作为后续独立语言资源，不得改变任何物理单位、符号或算法版本。
- 始终区分数字格式和内部值：显示 `0.0652` 不改变内部浮点；单位使用规范指数、上下标。CSV 导出使用稳定机器字段，不依赖翻译。
- 对 `in-water zenith`、`reference at 0−`、`local Fisher` 提供术语解释；切换语言也保持这些科学条件不被遗漏。
- 支持 200% 页面缩放后仍能完成所有 P0 流程；键盘焦点必须可见且不被固定头部遮挡。

### 10.4 性能与低成本渲染

- 图表 resize 采用 `ResizeObserver` 或等效布局监听，避免每次文本变化重算全部科学模型。
- 视图切换复用现有科学计算结果，只有输入契约变化时才触发计算。
- 将静态 RT JSON 读取/缓存与图表渲染状态分开；弱网时显示缓存版本与加载来源。
- 图表 SVG 元素有限时可继续用 SVG；大型矩阵若改 Canvas，必须同时实现 DOM 表格替代。
- 图表动画不得影响数学数值；高负载环境和 `prefers-reduced-motion` 自动停止装饰性过渡。
- 建立真实设备性能样本后再冻结阈值：建议以桌面中档设备和中档 Android 手机作为最低观测基线，记录首可交互时间、参数操作 p50/p95、资源体积、滚动掉帧。

---

## 11. 工程架构与代码改造映射

### 11.1 核心约束

V10.1 目前将大量 UI、样式、模块定义与操作流放在 `site/water/workbench-v10-1/app/index.html`（近20万字符）。**不能把这次改版继续写成全文件零散 CSS patch 的叠加**；应以 UI 分层为主要技术交付，但也不要求一次性重写科学引擎。

建议遵循“**保留计算内核、抽离表现层、适配现有状态契约**”：

```text
site/water/workbench-v10-2/
├── app/
│   ├── index.html              语义外壳，加载 manifest 和样式
│   ├── boot.js                 初始化 + 版本/状态通知
│   └── styles/
│       ├── tokens.css          科学设计令牌
│       ├── shell.css           单主滚动、导航、辅助栏
│       ├── controls.css        参数与表单
│       ├── scientific-chart.css
│       ├── workspace-rt.css
│       └── workspace-uncertainty.css
├── ui/
│   ├── shell/                  WorkHeader, NavGroups, WorkspaceLayout
│   ├── components/             ModelIdentity, StatusText, ResultCard,
│   │                            ExperimentControls, ActionMenu, ScopeDrawer
│   ├── charts/                 ChartFrame, Axes, Legend, DataTable, Probe
│   └── workspaces/             view renderer for each of the 9 stable IDs
├── adapters/
│   ├── legacy-workspace.js     wrap existing V10.1 workspace implementations
│   ├── rt-reference-view.js    read-only V10.1 offline DOM data
│   └── experiment-view.js      adapt schema-v8 session to new UI contract
├── instrument.js              mount + fallback to V10.1
├── instrument.css             host/iframe integration styles
└── tests/
    ├── ux-shell.test.mjs
    ├── ux-scientific-terms.test.mjs
    └── ux-state-migration.test.mjs
```

这是推荐的**目标结构**而不是现有文件目录。可根据站点构建器的静态引用和打包方式适当调整，但拆出 `tokens / shell / scientific chart / workspace controls` 四类层次为 P0。

### 11.2 原文件到目标组件的具体映射

| 现有文件与可识别节点 | 当前职责/问题 | V10.2 目标 | 影响类型 |
|---|---|---|---|
| `site/lab.html` + 宿主 `.instrument-dialog` | 大标题、关闭按钮、iframe 舞台 | 工作态紧凑宿主标题；保留返回/关闭可访问语义 | 宿主 HTML/CSS |
| `site/lab-fullpage.js`、`site/app.js`、`site/instruments.js` | 全屏状态和关闭按钮 aria-label 有加载顺序风险 | 建立宿主对全屏关闭/返回标签的唯一所有权；保持既有回归 | 宿主 UI 行为 |
| `site/water/workbench-v10-1/instrument.js` | same-origin iframe、启动与回退 | V10.2 新适配器；V10.1 为第一回退 | 装载器 |
| `site/water/workbench-v10-1/instrument.css` | 当前 `.instrument-stage` 固定溢出与 iframe 高度 | 明确主滚动所有权及手机触控策略 | host iframe CSS |
| `app/index.html` `.topbar`、`.appnav` | 标识常驻、九模块挤压 | `GlobalWorkHeader` + `WorkspaceNav` | shell |
| `.workspace-head`、`.chart-top`、`.head-controls` | 标题、视图与导出重复占高 | 任务头部 + 结果视图栏 + 单一工具菜单 | shell + toolbar |
| `.workspace`、`.main-space`、`.side-rail` | 左结果/右设置割裂 | 响应式 workspace grid + drawer | layout |
| `.chart-area`、`.chart-main` | 固定 flex 与内部溢出滚动 | 自然内容高度、主滚动、不裁剪图表 | layout |
| `.rt-shell`、`.rt-metric`、`.rt-grid` | WATER RT 内层滚动和等权指标 | 工作区专属信息摘要 + 统一图表框 | RT renderer |
| `.u9-container`、`.u9-summary` | UNCERTAINTY 另一个内部滚动层 | 同一壳层内的 Summary/Jacobian/Correlation | UNC renderer |
| `.control-scroll`、`.control-section` | 辅助栏独立滚动与细碎分割线 | Sticky 参数栏/移动抽屉，实验步骤顺序 | controls |
| `.rt-choice`、`.switch`、`.plot-tab` | 单选行为/按钮语义不统一 | 可访问 `SingleChoice` 与 `ViewTabs` | primitive |
| `#v10Science`、`#inspectorDialog` | 泛模型折叠条 vs 专业方法弹窗 | 基于当前工作区的科学来源和限制面板 | metadata |
| `workspaces/rt.js` factory | 直接字符串拼接图表和文本 | 数据只读适配 + `RtWorkspaceView` | presenter |
| `workspaces/uncertainty.js` factory | Fisher 结果直接嵌入特定排版 | `IdentifiabilitySummary` / `JacobianView` / `CorrelationView` | presenter |
| `app/export.js` factory | 实验 JSON 与 CSV 导出 | 保留 schema v8，UI 统一导出操作 | adapter/menu |
| `core/session-store.js` factory | 局部 UI 状态与实验参数混存 | 明确科学状态/展示状态隔离；历史迁移 | state |
| `site/core/modules.js` | 默认指向 V10.1，V10.0/V9 可回退 | V10.2 默认，`waterVersion=v101/v10/v9` 明确保留 | site loader |
| `.github/workflows/quality.yml` 和 `pages.yml` | 科学+浏览器测试 | 新增 UI 截图/滚动/a11y gate，保留全部科学 gate | CI |

**注意**：对 `site/lab-fullpage.js` 与宿主相关 JS 的任何修改都可能影响 Earth/Pulse 等其他 Lab；必须跑完整站点 `qa:browser`，不能只跑 water 专属测试。

### 11.3 状态设计：科学输入和 UI 呈现分离

```ts
type ScientificExperimentState = {
  params: WaterParameters;
  sensor: string;
  responseMode: string;
  rtCase: 'clear'|'phyto'|'cdom';
  rtSun: 0|30|60;
  rtWl: 440|490|550|620|680;
  rtDepth: 0|0.5|1|2|3|5|7|10|15|20;
  // existing schema v8 fields retained
};

type UXPresentationState = {
  activeTab: 'path'|'iop'|'atm'|'sensor'|'ac'|'compare'|'sensitivity'|'uncertainty'|'rt';
  activeView: string;
  navigationCollapsed: boolean;
  configurationPanelOpen: boolean;
  detailsOpen: boolean;
  chartScale: Record<string, 'linear'|'log'>;
  showDataTable: Record<string, boolean>;
};
```

- **不得**因为折叠导航、打开来源抽屉或放大图表而重算科学模型或改写参数。
- 原 schema v8 需继续导入/导出。若新增 UI 偏好字段，优先放独立本地 preference key；如确有必要升 schema v9，必须单列 `ADR-UX-STATE` 和迁移测试。**不得只为换皮肤修改科学实验 schema**。
- 同一实验状态在桌面/移动端必须对应相同科学数值；只允许不同排版、视图开关与显示格式。
- `waterVersion=v101` 路由需明确保留旧 UI 作回归对照。当前 V10.1 没有这个显式参数；由 V10.2 新增并测试。

### 11.4 数据访问与渲染生命周期

1. 从原科学模块读取输入/输出，适配成 `ScientificFigureSpec` 与 `ResultSummary`。
2. 对展示状态进行纯函数变换：色彩、布局、坐标格式、图例、说明；**不改动底层浮点数组**。
3. 变更科学参数时触发原有计算路径，并在计算状态标识同步之后更新数据视图。
4. RT 参考仍使用既有 `GeoGeekRT101` 数据包及 `dataAvailable`/`status`/`datasetSchema`；数据未加载则组件只渲染空态。
5. 浮点格式化仅在最终展示层进行，CSV/JSON 保留规范精度；必要时同时记录显示格式版本。
6. 若发生渲染异常，在工作区局部显示可恢复错误，不影响其它 tab；版本回退必须显示真实版本名称。

### 11.5 CSS 改造禁止事项

- 不再把新的全局 `:root`、模块 CSS、移动 CSS 反复附加到同一个 200KB 的内联样式表末尾。
- 不以 `!important` 大规模覆盖历史布局来“修复”尺寸；宿主已有必要 `!important` 须清理依赖顺序。
- 不对 `.rt-shell/.u9-container` 保留 `overflow:auto` 同时宣称只有一个滚动区域。
- 不直接隐藏滚动条以通过视觉检查；必须测量 `scrollHeight > clientHeight` 的实际可滚动容器数。
- 不改变旧工作区 `tab`/`plot` 标识符、输入字段和 `data-export` 行为而不提供迁移。
- 不把未经科学确认的“人工说明文本”写成计算引擎回传结果。

---

## 12. 研发任务拆解：可直接转 GitHub Issues

任务号稳定，PR 关联 `UX-xxx`；必要时再关联长期母本 `Fxx-Ryyy` / `NFR-xx`。

### 12.1 P0：科学与关键可用性（版本进入正式验收前必须完成）

| ID | 研发任务 | 主要代码区域 | 完成判据 |
|---|---|---|---|
| UX-001 | 提交 `RFC-UX-0102`，审定 V10.2 与原 F06/F07 的计划冲突 | docs | 已批准变更和迁移版本安排 |
| UX-002 | 建立独立 V10.2 路径，保留 V10.1/V10/V9 回退 | workbench-v10-2、modules.js | 三个历史入口均能打开且版本标识正确 |
| UX-003 | 拆出 token、壳层 CSS、科学图表 CSS、工作区样式 | app/styles | 页面不依赖覆盖顺序拼补 |
| UX-004 | 设计并实现单主滚动宿主/iframe 契约 | lab.html、instrument.css、shell.css | 桌面+手机无页面与主图同时纵向滚动 |
| UX-005 | 将永久大头部改为紧凑工作态 | 宿主 + shell | 864px 高首屏主图可见 |
| UX-006 | 九标签改任务分组导航，ID 不变 | NavGroups | 320–1920px 不遮挡，键盘可达 |
| UX-007 | 建立统一 `WorkspaceContext / ResultSummary / ScientificFigure` | UI components | 九模块共享基本骨架 |
| UX-008 | 建立来源与有效域分级显示 | ModelIdentity/Scope | `SEMI_ANALYTICAL` 与 `SELF_GENERATED_RT` 不混淆 |
| UX-009 | 重构 WATER RT 首屏主图和条件摘要 | RtWorkspaceView | 一屏可读主图标题/轴/条件 |
| UX-010 | 将 RT 参数匹配状态与主动作结合 | RtMatchStatus | 匹配/不匹配语义准确，参数变更可核对 |
| UX-011 | 深度/角度/五节点光谱图按科学规范重画 | RT charts | 维度、节点、单位、朝向无错 |
| UX-012 | UNCERTAINTY 区分 Fisher 1σ、cosine 与 correlation | U08 components | 无术语混淆，无无效矩阵假值 |
| UX-013 | 修复 RT/U08 错误态、加载态、不可计算状态 | state presenters | 空值不绘假曲线、不绘零 |
| UX-014 | 实现键盘、焦点、标签和图表数据表最低规范 | a11y components | WCAG AA 无阻断项 |
| UX-015 | 确认 V10.1 数值与 schema v8 迁移零漂移 | tests | 固定谱/DOM/不确定性全量通过 |
| UX-016 | 宿主退出标签与 UI 文案模块的单一所有权 | lab-fullpage/app/instruments | Earth/Pulse/Water 全屏回归通过 |

### 12.2 P1：九模块一致性与结果表达

| ID | 任务 | 完成判据 |
|---|---|---|
| UX-017 | 统一右侧参数区步进/分组语义 | 每页一个清晰“当前配置”区域，支持移动抽屉 |
| UX-018 | 建立统一动作分级与 Experiment tools 菜单 | 导入/导出不抢占首屏主图空间 |
| UX-019 | 重构 Radiative Path 为明确的概念示意 | 不会把示意光线冒充数值解 |
| UX-020 | Water Optics 分开 IOP 与 AOP 量纲和坐标 | `a`, `bb`, `rrs`, `Rrs` 不混轴 |
| UX-021 | Atmosphere 分解贡献与范围披露 | 一阶 TOA 教学近似显式可读 |
| UX-022 | Sensor SRF/采样/来源三区重排 | Oa11 域外与 nominal/measured 清楚 |
| UX-023 | Atmospheric Correction 闭合与误差表示 | 不产生独立验证幻觉 |
| UX-024 | A/B 差异与变更参数清单 | 统一残差符号和坐标 |
| UX-025 | Sensitivity 导数图标准化与解释 | 单位、步长、局部线性边界清楚 |
| UX-026 | U08 Jacobian 与 correlation 热图/表格 | 色标数值、有效性和读屏替代齐全 |
| UX-027 | 所有图标注来源、单位、状态、导出方式 | `ScientificFigureSpec` 元数据覆盖完整 |
| UX-028 | 统一图表数据表切换与 CSV 命名 | 9 模块数据可查看、下载与复制 |
| UX-029 | 统一非阻塞通知与错误恢复 | 错误不只出现 toast 后即消失 |
| UX-030 | 移动端和 200% 缩放细节测试 | 320px 无丢失核心操作或横向页面溢出 |

### 12.3 P2：体验增强（不得阻断科学正确性修复）

| ID | 任务 | 边界 |
|---|---|---|
| UX-031 | Guided explanation／Expert details | 只改变讲解层级；不实现完整 F07 教学任务引擎 |
| UX-032 | 可复制实验摘要／实验分享链接 | 不暴露隐私数据，不宣称远程保存 |
| UX-033 | 图表 SVG/PNG 导出 | 保存单位与来源；可留后续小版本 |
| UX-034 | 主题明暗模式试验 | 原科研深色主题优先完成对比度达标 |
| UX-035 | 帮助术语表与学习路径提示 | 文案必须经科学负责人审核 |
| UX-036 | 仪器外框与全屏切换动效优化 | 尊重 reduced-motion 与其他实验室模块 |

### 12.4 跨需求映射

| 长期母本 | V10.2 UI 工作内容 | 说明 |
|---|---|---|
| `F01` | 模型身份、有效域、可信度披露 | 仅表现重构，不宣称科学验证升级 |
| `F02` | IOP 控件分组、实验性参数标识 | 不更换水体参数化 |
| `F03` | SRF、波段响应和域外状态表达 | 不改官方响应数据 |
| `F04` | 深度、角度 RT 工作区可视化 | 参考数据仍为内部离散 DOM |
| `F05` | 同输入 rrs 对照与残差视觉设计 | 仅重构对照解释，不改物理计算 |
| `F06` | 现有大气校正页面可用性 | **不等于完成原 V10.2 的非同模大气校正新功能** |
| `F07` | 任务说明、探索指导的 UI 基础 | **不等于完成原 V10.2 的三个 LEARN 实验** |
| `F09` | Fisher 结果呈现及错误状态 | 不增加相关噪声模型、Monte Carlo |
| `F12` | 版本标识、导出入口、状态兼容 | 默认保持实验 schema v8 |
| `NFR-03/05/06/07/08/12/14/15` | 响应、图表、移动、可访问、离线、测试、回退、性能 | UI 版本主范围 |

---

## 13. 验收矩阵与 QA 测试方案

### 13.1 分层测试

| Gate | 类型 | 测试对象 | 失败判定 |
|---|---|---|---|
| G-UX-01 | UI unit | 导航分组、控件、来源状态、导出菜单 | 用户看不到关键字段或错误标签 |
| G-UX-02 | Layout E2E | 桌面/平板/手机、200% 缩放、全屏 iframe | 主图或控制被裁剪、多重滚动、横向页面溢出 |
| G-UX-03 | Accessibility | Axe + 键盘 + NVDA/VoiceOver 手工 | 无法操作参数、图表数据无替代、焦点丢失 |
| G-UX-04 | Scientific visual contract | `rrs/Rrs`、`b/bb`、DOM 来源、噪声模型 | 变量、单位、来源、可信度错标 |
| G-UX-05 | Scientific regression | V9/V10/V10.1 模型、DOM 45 场景、Fisher | 数值漂移或被 UI 截断/归零 |
| G-UX-06 | State + export | 导入 schema 3–8、schema 8 round-trip | 无提示迁移/丢状态/来源造假 |
| G-UX-07 | Cross-Lab | GeoGeek 其他模块的关闭/全屏/快捷键 | Water 的宿主修改破坏其他模块 |
| G-UX-08 | Performance | Lighthouse + 帧率 + 操作延迟 + 首帧 | 未达到批准预算且无允许降级 |
| G-UX-09 | Deploy | GitHub Pages 下载/入口/资源 checksum | 线上少资源或启动降级无提示 |

### 13.2 宽高测试矩阵

| 环境 | 可用空间 | 首要用例 |
|---|---|---|
| 桌面 Chromium | 1895×864（对应 S1）、1919×871（S2） | 单滚动、首屏图、长任务导航 |
| 常见笔记本 | 1366×768、1440×900 | 不挤压图表和右栏 |
| 平板 | 820×1180、1024×768 | 抽屉与触控 |
| Android | 390×844 | WATER RT 所有节点选择、模型对照 |
| iPhone 类尺寸 | 375×812 | UNCERTAINTY 热图与数据表 |
| 极窄屏 | 320×700 | 所有控件可达，无水平主文档滚动 |
| 浏览器放大 | 200% | 焦点可见，无操作永久被遮挡 |
| 减少动画模式 | `prefers-reduced-motion` | 无持续光线/图表插值特效 |

### 13.3 P0 自动化断言（建议新增 `tests/browser/water-v102.spec.mjs`）

以下为**验收行为描述**，不是可以直接粘贴运行的现有测试脚本：

```text
AT-UX-SHELL-01  在 1895×864 进入 rt，不需滚动看到主图标题、轴、可见样本点
AT-UX-SHELL-02  主滚动区域只有一个；chart-main/rt-shell/u9-container/control-scroll 不各自滚动
AT-UX-SHELL-03  在 390×844 无整页横向滚动，参数抽屉可打开、关闭并保持状态
AT-UX-SHELL-04  主导航九个模块全部可触达，分组切换不重设水体参数
AT-UX-SHELL-05  import/export/tools 菜单完整支持键盘与 Escape
AT-UX-SHELL-06  200% 缩放下最关键结果和关闭按钮可访问

AT-UX-RT-01     WATER RT 条件、来源和图表可读
AT-UX-RT-02     改案例后参考样本与标签同步；无未定义波长
AT-UX-RT-03     RT 资源失败时没有任何 RT 数值曲线
AT-UX-RT-04     IOP 不匹配提示和同步操作在一处
AT-UX-RT-05     角度视图节点与参考 JSON 逐值匹配
AT-UX-RT-06     对照为 rrs vs rrs 而非 rrs vs Rrs，显示 absolute Δ

AT-UX-U08-01    Fisher 条件形式 1σ 含单位/假设
AT-UX-U08-02    Jacobian cosine 与 formal parameter correlation 明确区别
AT-UX-U08-03    条件不满足时不出现 Infinity/NaN 的“可用结果”
AT-UX-U08-04    热力图有数值数据表及键盘替代

AT-UX-MODEL-01  45 个 DOM slices 的输入/输出与 V10.1 完全一致
AT-UX-MODEL-02  参考 SRF / TOA / Rrs 模型输出未因 UI 变化漂移
AT-UX-STATE-01  schema 8 试验导入/导出 round-trip 不丢字段
AT-UX-STATE-02  v9/v10/v101 路由可进入对应版本
AT-UX-SITE-01   Earth/Pulse/其它 Lab 全屏退出标签回归无失败
```

### 13.4 科学审稿验收表

每个涉及模型/图表的 PR 必须明确完成以下审稿：

- [ ] **量纲核对**：轴、图例、卡片、表格、CSV 和导出元数据一致。
- [ ] **模型来源**：半解析模型与自建 DOM 参考分开表述；数据状态可追溯。
- [ ] **数据覆盖**：只显示真实支持的波长、角度、深度、传感器波段。
- [ ] **误差统计**：偏差、RMSE、Fisher 1σ、cosine、correlation 各自有定义与解释。
- [ ] **坐标与方向**：水深、太阳天顶角、向上/向下辐亮度方向定义正确。
- [ ] **保真**：只改变 UI 时，数据及算法版本没变；若变，必须单独 ADR。
- [ ] **可访问数据**：视觉无法读取的科学信息有表格/可复制文本替代。
- [ ] **图表誠实**：不能把插值/示意/外推/内部参考伪装成验证的实测。

---

## 14. 分阶段实施与验收 Gate

### Phase 0：审批、基线与重构边界（先行）

**交付**：RFC 版本范围变更、现状 UX 截图基线、V10.1 固定科学输出样本、图表/参数/数据字段清单。

**进入条件**：科学负责人明确 V10.2 不改变计算精度；产品负责人确认 F06/F07 原计划重新排期。

**退出条件**：版本号治理不冲突、数值基线可重复、可追踪 UI Issue 全部创建。

### Phase 1：V10.2-a Shell 与单滚动修复（P0）

**范围**：独立版本入口、紧凑宿主头部、导航分组、单滚动所有权、基础 tokens、工具菜单、数据元信息状态栏、基础移动抽屉。

**退出条件**：九模块仍可打开；桌面和手机不出现滚动陷阱；所有历史版本不回归。

### Phase 2：V10.2-b WATER RT + UNCERTAINTY 科学样板（P0）

**范围**：RT 三视图、匹配状态、深度轴/离散节点/来源，U08 Summary/Jacobian/Correlation 的科学表达、表格替代与错误态。

**退出条件**：`AT-UX-RT-*`、`AT-UX-U08-*` 全部通过，科学图审签字。

### Phase 3：V10.2-c 其余七个模块统一（P1）

**范围**：Water Optics、Sensor 两个高优先模块先行，然后其他五个工作区逐一迁移统一壳层与图表规范。

**退出条件**：九页视觉与交互规律一致；A/B/AC/Fisher 等重要科学术语无混淆；没有遗留关键多重滚动。

### Phase 4：V10.2 release candidate（完整 QA）

**范围**：跨浏览器、桌面/平板/手机、200% 缩放、无障碍、性能、科学快照、schema v8、历史路由与其它 Lab 回归。

**退出条件**：所有 P0 缺陷已关闭，P1 非阻断项有明示风险接受；科学模型版本及数据来源可核查。

### Phase 5：生产发布与回滚核验

**范围**：GitHub Pages 正式部署、线上 smoke、用户任务验收、遗留事项归档。

**退出条件**：部署成功≠科学新模型验证；只称“UI/UX 发布完成”，已知科学限制与 V10.1 保持一致。

### 分支 / PR 建议

```text
feat/water-v10-2-shell
feat/water-v10-2-rt-ux
feat/water-v10-2-uncertainty-ux
feat/water-v10-2-core-workspaces
feat/water-v10-2-accessibility
release/water-v10-2
```

每个 PR 只改有限模块，均需科学快照回归；禁止在最后一个巨型 PR 中同时改变九页结构和模型计算。

---

## 15. 维护与版本治理

### 15.1 范围变更 RFC

建议在仓库增设：

`docs/RFC-UX-0102-V10-2-UI-UX-SCOPE-CHANGE.md`

至少记录：

1. **旧计划**：V10.2 = F06 非同模大气误差与 F07 引导实验（长期母本第 10.3 节）。
2. **新提案**：V10.2 = UI/UX 重构及现有九工作区科学可视化规范化。
3. **受影响工作**：F06、F07、F02、F12 相关原功能交付时点。
4. **新版本归属**：须由产品负责人确认移到 V10.3、V10.4 或并行支线；**不允许简单宣布“自动顺延一个次版本”**，否则会与已有 V10.3 F09/F10/F11 规划冲突。
5. **不改内容**：V10.1 solver、RT reference json、半解析参数化与实验科学值。
6. **审批记录**：评审人、日期、签字状态及 link to mother PRD amendment。

审批后在母本新增修订条目，更新第 10 章版本交付表以及第 11 章需求—版本追踪矩阵，保留历史追踪。

### 15.2 版本和回退

| 版本 | 默认路由 | 用途 | 回退/对照 |
|---|---|---|---|
| V9 | `waterVersion=v9` | 历史兼容 | 保持旧存储与计算 |
| V10.0 | `waterVersion=v10` | 早期科学契约对照 | 保留旧行为 |
| V10.1 | 建议新增 `waterVersion=v101` | WATER RT 数值基线 + 旧 UI | 本次 UI 改版直接对照 |
| V10.2 | 无显式版本参数时的默认入口，建议 `waterVersion=v102` 可直达 | 新工作台体验 | 启动异常时显示明确的 V10.1 回退 |

**不要将 `waterVersion=v10` 暗中重定义为 V10.2**。如增加显式 `v102`，必须在装载器和测试中逐一覆盖。

### 15.3 源码及设计文档的生命周期

- **UX 本规格**：状态按 `PROPOSED → REVIEWED → APPROVED → IMPLEMENTING → VERIFYING → ACCEPTED → RELEASED`。
- **设计 token**：每次修改记录原因、影响组件与对比度检测结果。
- **UI 图表契约**：字段/量纲变化需要科学负责人审批；不能由视觉设计直接修改数据含义。
- **验证证据**：保留桌面/移动截图、任务测试、axe/Lighthouse 报告、科学快照、生产部署链接。
- **维护策略**：先保兼容，再移除 V10.1 的重复 UI 实现；任何删除旧版前须通过单独弃用决策。

### 15.4 风险与缓解措施

| 风险 | 影响 | 概率判断 | 缓解 |
|---|---|---|---|
| R-UX-01 单体 UI 拆分造成启动失败 | P0 | 中 | 先分离 UI adapter、每 PR smoke、保留 V10.1 回退 |
| R-UX-02 宿主 iframe 滚动改变其他 Lab | P0 | 中高 | 限定 water CSS 作用域、跨 Lab 全屏回归 |
| R-UX-03 数值和显示格式转换混淆 | P0 | 中 | 单独 adapter、单位测试、固定谱逐值比对 |
| R-UX-04 U08 术语渲染错误造成科学误解 | P0 | 高 | Fisher/雅可比定义评审，UI 截图科学审稿 |
| R-UX-05 RT 视觉插值误导为连续求解 | P0 | 高 | 离散节点明显、样本级 tooltip、数据表和来源标签 |
| R-UX-06 多语言/多行标签导致尺寸失控 | P1 | 中 | 响应式长文本与 200% 放大测试 |
| R-UX-07 暗色主题对比度不达标 | P1 | 中 | token 审计与 WCAG 工具/人工确认 |
| R-UX-08 UI 重构范围无限扩张 | P0 | 高 | V10.2 仅限 UX，F06/F07 单独版本治理 |
| R-UX-09 延续旧样式造成样式特异性冲突 | P1 | 高 | CSS 层次规划、token 迁移、组件截图测试 |
| R-UX-10 无真实用户实测却声称更易用 | P1 | 中 | 按 K-01~K-04 执行小规模任务式测试，不先宣布达标 |

---

## 16. 审批清单（正式启动前）

| 审批角色 | 核心检查 | 状态 |
|---|---|---|
| 产品负责人 | V10.2 范围变更、原 F06/F07 的重新排期、任务指标 | PENDING |
| UI/UX 负责人 | IA、主滚动所有权、组件规范、视觉层级及移动策略 | PENDING |
| 水色遥感科学负责人 | `rrs/Rrs`、RT 参考条件、Fisher 语义及所有关键图轴 | PENDING |
| 前端负责人 | 宿主 iframe 可行性、代码拆分、状态迁移、性能 | PENDING |
| QA 负责人 | 回归矩阵、科学快照、WCAG、跨 Lab、线上 smoke | PENDING |

**批准条件**：五个角色至少指派实际负责人，完成对应签署。未批准时仅能实现探索性原型，不应把计划改名为已接受的正式 V10.2 版本。

---

## 17. 交付清单与完成定义（Definition of Done）

### 17.1 必须提交到仓库的交付物

- [ ] 已批准的 `RFC-UX-0102` + 长期需求母本版本追踪更新。
- [ ] `V10.2` 独立新工作台路径、稳定 v101/v10/v9 回退。
- [ ] Token 设计与真实对比度记录、图表色盲/灰度检查。
- [ ] 九模块统一 shell、任务导航、科学状态模型和主要操作区。
- [ ] WATER RT & UNCERTAINTY 两个详细样板实现。
- [ ] 其余七页符合统一基本组件、单位和有效域规范。
- [ ] 一个明确主滚动容器 + 宿主/iframe 交互验收。
- [ ] 主要图表的结构化可访问数据表与 CSV 导出一致性。
- [ ] 固定科学模型/参考场数值的完整回归证明。
- [ ] 320px/390px/820px/1366px/1895px、200% 缩放截图回归与任务测试。
- [ ] WCAG 2.2 AA 适用条款审查，已记录人工键盘及至少一种读屏测试。
- [ ] V10.2 发布说明（科学不变、UI 变化、兼容与已知限制）。
- [ ] GitHub Pages 已部署，所有线上资源及参考数据 checksum/有效域检查成功。

### 17.2 发布阻断（任何一条存在即不得宣布 V10.2 全面完成）

1. 页面、主图、参数区仍出现多个互相竞争的纵向滚动区域，导致操作或图表不可达。
2. 任何页面中关键科学量缺单位、超域数据被画成零，或 `rrs/Rrs` 混写。
3. 新 UI 与 V10.1 相同科学输入下结果不同，且没有单独批准的科学变更。
4. 数据来源标签把内部 RT 数值解或 Fisher 假设不确定性说成经过实测验证的准确度。
5. 手机和放大环境存在无法关闭的参数抽屉、无法触达的下载或关闭按钮。
6. 旧版导入、V10.1 回退、宿主的其它实验模块有阻断回归。
7. GitHub Pages 构建成功但线上 RT 参考 JSON、CSS 或脚本缺失。
8. V10.2 版本范围变更没有完成审批，导致母本功能交付计划失去可追溯性。

### 17.3 完成后的可检验产品叙述

满足全部 Gate 后，可以声明：

> **V10.2 升级了 Water as Spectrum 九工作区的科学交互、导航、图表可读性、响应式和可访问性，同时保持 V10.1 已发布计算模型与参考数据不变。** WATER RT 的数值参考解仍为内部生成且尚未外部交叉验证；Uncertainty 仍为指定噪声假设下的局部形式分析。

**不能声明**：已完成全面大气辐射传输研究、拥有 HydroLight 验证精度、具有真实卫星反演准确率，或完成了原母本 F06/F07 的未交付科学/课程功能。

---

## 附录 A. UI 组件和状态命名建议

| 语义 | 推荐组件名 | 现有近似位置 |
|---|---|---|
| 工作态主头部 | `GlobalWorkHeader` | `.topbar` + 宿主 header |
| 导航分组 | `WorkspaceNav` | `.appnav` / `#mainNav` |
| 任务/领域摘要 | `WorkspaceContext` | `.workspace-head` |
| 当前物理状态 | `ScenarioSummary` | 右栏字段/RT metric |
| 科学结果布局 | `ScientificFigure` | `.chart-main` / `.rt-svg` / `.graph` |
| 图表数据替代 | `ScientificDataTable` | 新增 |
| 模型/来源 | `ModelProvenance` | `#v10Science` / `#inspectorDialog` |
| 配对状态及恢复 | `ReferenceMatchStatus` | `.rt-state-row` + 侧栏按钮 |
| 参数配置 | `ExperimentControls` | `.side-rail` / `.control-scroll` |
| 视图单选 | `ViewTabs` | `.plot-switches` / `.plot-tab` |
| 科学错误/无效域 | `ScientificEmptyState` | V10.1 局部 RT 空状态 |
| 工具菜单 | `ExperimentTools` | `.head-controls` 下多个按钮 |
| 数值摘要 | `ResultSummary` | `.metric-grid` / `.rt-metrics` / `.u9-stat` |

## 附录 B. 推荐的科学状态措辞（英文界面）

| 情境 | 推荐措辞 | 不推荐措辞 |
|---|---|---|
| RT 模型 | `In-house numerical RT reference · external benchmark pending` | `Validated RT reference`, `true radiation` |
| 参考状态匹配 | `Current controls match this archived case` | `Experiment verified` |
| 参考不匹配 | `Comparison uses the archived paired model inputs` | `Data inaccurate` |
| 形式不确定度 | `Conditional formal 1σ under the stated noise model` | `Satellite error`, `retrieval accuracy` |
| Jacobian 列相似 | `Sensitivity-column cosine` | `Parameter correlation` |
| 超域波段 | `Outside supported water-model wavelength range` | `Zero signal` |
| 名义传感器 SRF | `Nominal top-hat approximation` | `Measured spectral response` |
| 大气模拟 | `First-order simulated TOA reflectance` | `Observed top-of-atmosphere radiance` |
| 示意动画 | `Conceptual schematic (not numerical RT)` | `Photon simulation output` |
| 5点光谱线 | `Five sampled wavelengths; lines guide the eye` | `Continuous hyperspectral RT` |

## 附录 C. 参考资料与既有项目契约

### 项目源代码与要求

1. `GeoGeekLab/GeoGeekLab.github.io` — <https://github.com/GeoGeekLab/GeoGeekLab.github.io>
2. 当前实验入口：<https://geogeeklab.github.io/lab.html?release=20261008v101&instrument=water#l13>
3. `docs/WATER_AS_SPECTRUM_REQUIREMENTS_MASTER.md` — 现有长期母本（V10.2 原功能计划须审批修改）。
4. `docs/WATER_AS_SPECTRUM_SCIENTIFIC_CONTRACT.md` — 科学约束基线。
5. `site/water/workbench-v10-1/README.md` — DOM 求解与数据定义、科学限制。
6. `site/water/workbench-v10-1/app/index.html` — 当前九模块 UI、布局和交互。
7. `site/water/workbench-v10-1/instrument.js` / `instrument.css` — 宿主 iframe 集成。
8. `site/water/workbench-v10-1/reference/rt-reference-v1.json` — RT 固定样本数据。
9. `site/water/workbench-v10-1/tests/rt-reference.test.mjs`、`tests/browser/water-v101.spec.mjs` — 科学与浏览器回归起点。
10. `site/water/schemas/experiment-v8.schema.json` — 当前实验文件规范。

### 可访问性与通用标准（正式实现须按当时最新规范核对）

- W3C WCAG 2.2 — <https://www.w3.org/TR/WCAG22/>
- WAI-ARIA Authoring Practices Guide — <https://www.w3.org/WAI/ARIA/apg/>
- WAI Patterns: Tabs — <https://www.w3.org/WAI/ARIA/apg/patterns/tabs/>
- WAI Patterns: Dialog (Modal) — <https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/>

### 科学来源与声明边界

- 当前 WATER RT 引擎是仓库内自建标量方位平均 DOM，不能把论文中的 HydroLight 数据说成当前 45 个案例的直接源头。
- 如后续接入外部参考求解器，需要来源、许可证、几何/边界条件、变量定义和独立数值比较报告，并另立科学验收项。
- 本文的设计 token、尺寸和 K 指标是**候选规范及验收目标**；不是已经完成的人体工程学实验结论。

## 附录 D. 修订记录

| 版本 | 日期 | 修订 | 状态 |
|---|---|---|---|
| 1.0.0 | 2026-10-09 | 根据 V10.1 两张截图、当前源码和母本科学契约形成完整 UI/UX 改版规格 | PROPOSED |

---

**建议第一步**：先批准 `RFC-UX-0102` 与 V10.2 范围，再建 `UX-001` 至 `UX-016` 的 P0 Issues，分拆 Shell、WATER RT、UNCERTAINTY 三类实施 PR；通过它们的科学零漂移/单滚动/读屏验收后再推进其余七个模块。
