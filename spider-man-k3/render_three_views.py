# -*- coding: utf-8 -*-
"""Render three consistent full-body views from Spider-Man.blend without changing it."""
import bpy
import os
from mathutils import Vector

out_dir = os.path.dirname(os.path.abspath(__file__))
scene = bpy.context.scene
camera = scene.camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 8.25

scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 1400
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'

views = [
    ('Front', (0.30, -18.0, 7.2), (0.30, 0.0, 3.50)),
    ('Side', (18.0, -1.0, 7.0), (0.20, 0.0, 3.50)),
    ('Back', (-7.0, 16.0, 7.8), (0.20, 0.0, 3.50)),
]

for label, position, target in views:
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(out_dir, 'Spider-Man_' + label + '.png')
    print('RENDERING_VIEW=' + label, flush=True)
    bpy.ops.render.render(write_still=True)
    print('FINISHED_VIEW=' + label, flush=True)

print('THREE_VIEWS_COMPLETE', flush=True)
