# 蜘蛛侠 · K3.1

k3.1用blender生成

一个风格化收藏雕像比例的蜘蛛侠：经典红蓝战衣、立体蛛网纹、白色镜片、正反面蜘蛛标志，以及标志性的蛛丝发射手势。场景包含展示地台、完整灯光和相机。

## 关于制作

由 **K3.1** 使用 **Blender 5.2** 程序化生成。模型、材质、蛛网曲线和灯光均由 Python 脚本构建，没有导入外部模型，也不依赖外部贴图。

这是静态姿势模型，未绑定骨骼。

## 文件

| 文件 | 说明 |
| --- | --- |
| [`Spider-Man.blend`](Spider-Man.blend) | 可编辑 Blender 工程，包含模型、材质、地台、灯光与两台相机 |
| [`Spider-Man.png`](Spider-Man.png) | 主视觉，1400 × 1600 |
| [`Spider-Man_Front.png`](Spider-Man_Front.png) | 正面，1200 × 1400 |
| [`Spider-Man_Side.png`](Spider-Man_Side.png) | 侧面，1200 × 1400 |
| [`Spider-Man_Back.png`](Spider-Man_Back.png) | 背面，1200 × 1400 |
| [`create_spiderman.py`](create_spiderman.py) | 完整建模与主视觉渲染脚本 |
| [`render_three_views.py`](render_three_views.py) | 正面、侧面、背面三视图渲染脚本 |

## 使用

使用 Blender 5.2 或更新版本打开 `Spider-Man.blend`，按数字小键盘 `0` 进入相机视图，按 `F12` 重新渲染。

在此目录重新生成模型与主视觉：

```sh
blender --background --python create_spiderman.py
```

基于已保存的工程渲染三视图：

```sh
blender --background Spider-Man.blend --python render_three_views.py
```

## 在线查看

<https://dennisyu-m.github.io/Dennis-ai-work/spider-man-k3/>

---

[← 返回 Dennis / AI Work](../)
