# 蜘蛛侠 · SPIDER-MAN

一个蜘蛛侠角色模型。程序化生成，没有贴图、没有外部素材。

## 关于制作

由 **Gemini 4 Argon** 生成。

建模过程是一段 Blender Python 脚本（[`build_spiderman.py`](build_spiderman.py)）：用 `bpy` 直接构建躯干、四肢、头颈、手掌与蛛丝发射器，按部位分组建模，再赋 7 套 Principled BSDF 材质。全程没有手工雕刻、没有导入模型、没有任何图片纹理。

## 规格

| 项 | 值 |
| --- | --- |
| 高度 | 1.73 m（含底座） |
| 网格 | 12 个 mesh / 12 个 node |
| 三角面 | 97,044 |
| 材质 | 7 套 PBR（红、蓝、黑、Logo、镜片、底座、金属发射器），无贴图 |
| 动画 | 无（静态姿态） |
| 导出 | Blender glTF I/O，glTF 2.0 |

## 文件

| 文件 | 说明 |
| --- | --- |
| [`spiderman.glb`](spiderman.glb) | Web / 实时引擎通用（1.7 MB） |
| [`spiderman.fbx`](spiderman.fbx) | 给 Unity / Unreal / Maya 等用 |
| [`spiderman.blend`](spiderman.blend) | Blender 源文件（5.2） |
| [`spiderman.blend1`](spiderman.blend1) | Blender 自动备份 |
| [`build_spiderman.py`](build_spiderman.py) | 生成模型的脚本，可在 Blender 里重跑 |
| [`spiderman_preview_full.png`](spiderman_preview_full.png) · [`spiderman_preview_closeup.png`](spiderman_preview_closeup.png) | 预览图 |

## 查看

线上：<https://dennisdan1104.github.io/Dennis-ai-work/spider-man/>

---

[← 返回 Dennis / AI Work](https://dennisdan1104.github.io/Dennis-ai-work/)
