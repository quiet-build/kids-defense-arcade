# Relay Defense 改版与验收

日期：2026-09-11。用户批准将简单糖果塔防大幅改为适合稍大孩子的现代防线游戏。本地实现完成；2026-09-12 用户批准通过现有 CI 发布。宿主原有未提交工作保留，发布使用独立检出。

## 交付

- 原创现代工业战场、带方向的路线、核心机柜、瞄准炮塔和不同轮廓的敌机；移除两套旧主题与主题选择器。
- 三个原教学关保留为 Perimeter、Crowd control、Fast response，另有可直接进入的 Relay siege。
- 五波挑战按探路、密集群、快速突袭、混合攻击和最终载具递进。固定路线、手动开波，无隐藏准备倒计时。
- 预告与实际生成共享 waveSchedule：按难度显示真实数量，明确快速敌群时点及波后补给。
- 挑战只有固定波后补给，没有击杀收入；教学关保留原经济。需要在扩张、群伤、减速和临时阻挡之间分配有限预算。
- 群伤扩大覆盖并提升次级命中伤害；减速在弹丸命中时应用。星级目标使用真实群伤命中、减速击杀和累计支出。
- 结算列出漏过的敌人类型、战斗表现及对应改进提示。重试清空局面，Sectors 回到选择。保留本地星级和进度。
- 原生箭头与 Enter 支持网格建造，Space 激活焦点按钮。Start Mission 等待 Phaser 场景就绪才启用，解决 WebKit 过早点击被忽略的问题。
- 桌面战场在左、情报和工具在右；窄屏上下排列，简报与结算进入文档流，避免覆盖全部战场。
- 静态地图按关卡重画，不再每帧重复绘制。保持现有 Phaser/Vite、组件生命周期和发布边界，无新依赖或通用 SDK。

## 源码来源

上游 Server Survival 固定审查版本 `01796362d3b7bfa6c85efab5e2685f4d955dc137`。具体文件与复用边界见 SOURCE_REVIEW.md。原有 MIT 战役辅助逻辑保留 NOTICE；本轮压力波次、经济、绘图均为原创适配，没有复制上游素材。实际读取两个指定发现索引，并用 Computer Use 查看上游实时菜单。没有把其 Three.js 云架构系统移植进 Phaser。

## 平衡证据

同一 Normal 挑战、相同 240 初始预算、正常速度真实 Phaser 场景；脚本用真实按钮与画布坐标建造，不替换模拟规则。两种布阵只证明这组可复现对照，不是所有布局或所有难度的最优性证明。

| 阵容 | 第1波核心 | 第2波 | 第3波 | 第4波 | 第5波 | 最终支出 / 余额 |
| --- | --- | --- | --- | --- | --- | --- |
| 纯 Pulse | 12 | 0，失守 | — | — | — | 280 / 35 |
| Pulse + Mortar + Stasis | 12 | 12 | 12 | 12 | 12，通关 | 465 / 35 |

组合通关记录：476 次次级群伤命中，30 次减速击杀。初始四塔：Pulse (2,3)、Mortar (4,4)、Stasis (6,4)、Pulse (8,3)，坐标从 0 起；后续在每波准备期按 tests/challenge.component.spec.js 加建。最初宽松版本纯 Pulse 也满血通过，因此已用更密集敌群和固定补给修正；旧版本数据不作为最终平衡证据。

## 验证

- `node tests/waves.check.mjs`：通过，检查定时突袭、排序、确定性、难度数量和实际战斗目标阈值。
- 组件浏览器检查：12 项通过，包含 Chromium 与 WebKit；真实开局/建塔/失守/重试、键盘、触控模拟、焦点恢复、320/390/900 宽度、失败恢复、十次挂卸和渲染资源释放。
- 两个正常速度完整挑战对照通过；胜负事件只发一次，重试清空旧塔和敌人。虚拟时钟曾因 Phaser 帧计时不合适超时，最终检查已移除时钟替换。
- 独立页 smoke：2 项通过，包括建造退款、准备阶段墙寿命和无自动开波。
- `node --test tests/redirect.test.mjs`：2 项通过。
- 宿主 `pnpm verify`：通过，含目录、组件 URL、结果协议、Astro 类型检查、构建和生成路由/CSP。
- Computer Use：普通 Brave 在生产构建预览中再次完整打通最终五波，核心 12、余额 35、用时 157 秒，484 次群伤命中、21 次减速击杀；实际建造、开波、战斗、预告、补给和重试均已检查。不同帧节奏下命中统计可有小幅变化。另从真实本地 Mini Arcade 页面加载组件，确认品牌、介绍和宿主暂停/恢复。自动化报告和人工试玩均使用本地版本，不代表线上更新。

剩余边界：无物理 iPhone/Android 验收；没有音频；所有难度及所有布阵未穷尽平衡。宿主 Fullscreen 在本次自动化操作中仍显示无法切换，未修改该宿主功能，普通页面可以继续玩。没有用本地成功推断生产 CI/发布成功。

## 文件与交付边界

游戏修改：src/levels.js、src/mount.js、src/art.js、src/ui.html、src/style.css、index.html；README.md、SOURCE.md、SOURCE_REVIEW.md、本文件；tests/component.spec.js、tests/controls.component.spec.js、tests/smoke.spec.js，新增 tests/challenge.component.spec.js、tests/waves.check.mjs；package.json、playwright.component.config.js、.github/workflows/deploy.yml 将新检查接入现有入口/CI。

宿主修改仅限 defense-arcade 的 src/data/games.ts 条目、public/games/defense-arcade.svg，以及 docs/source-map.md 的职责说明。发布时必须先走游戏 CI，再走宿主 CI；2026-09-12 已获发布授权，发布结果以 GitHub Actions 和线上验收为准。

## 2026-09-12 开局修复

简报内新增 Deploy sector 和 Close setup，关闭后焦点回到 Start Mission，Sectors 可重新打开。面板参与网格高度计算，展开设置不会被战场裁切。真实浏览器已验证展开、关闭、重开、开始、建塔与第一波；WebKit 检查覆盖 900/600/390/320 宽度以及键盘焦点。主站发布同时更新 relay 结算模式校验。
