# -*- coding: utf-8 -*-
"""Procedural Spider-Man collectible scene for Blender 5.x.
Run: blender --background --python create_spiderman.py
All geometry and materials are generated locally; no external assets required.
"""
import bpy
import math
import os
from math import sin, cos, pi, sqrt, exp
from mathutils import Vector, Matrix

OUT = os.path.dirname(os.path.abspath(__file__))
BLEND_PATH = os.path.join(OUT, "Spider-Man.blend")
RENDER_PATH = os.path.join(OUT, "Spider-Man.png")

# -----------------------------------------------------------------------------
# Scene and organization
# -----------------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection':
        bpy.data.collections.remove(c)
default_collection = bpy.data.collections.get('Collection')
if default_collection:
    bpy.data.collections.remove(default_collection)

scene = bpy.context.scene

def collection(name, parent=None):
    c = bpy.data.collections.new(name)
    (parent.children if parent else scene.collection.children).link(c)
    return c

hero = collection('01  SPIDER-MAN')
body_col = collection('Body | tailored suit', hero)
head_col = collection('Mask & expressive lenses', hero)
web_col = collection('Raised web pattern', hero)
hand_col = collection('Hands | web-slinging gesture', hero)
emblem_col = collection('Spider emblems', hero)
stage_col = collection('02  DISPLAY BASE')
light_col = collection('03  STUDIO')
cam_col = collection('04  CAMERAS')

root = bpy.data.objects.new('SPIDER-MAN | character root', None)
hero.objects.link(root)
root.empty_display_type = 'CIRCLE'
root.empty_display_size = 0.8
root['Design'] = 'Classic red & blue / stylized collectible'
root['Geometry'] = 'Procedural meshes and raised curve webbing; no external textures'
root['Pose'] = 'Contrapposto, fist on hip, web-shooting hand'

def move_to(obj, col, parent=True):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)
    if parent and col in (body_col, head_col, web_col, hand_col, emblem_col):
        obj.parent = root
    return obj

# -----------------------------------------------------------------------------
# Materials
# -----------------------------------------------------------------------------
def material(name, color, metallic=0.0, roughness=0.4, coat=0.0, micro=False, emission=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    n = m.node_tree.nodes
    l = m.node_tree.links
    bs = n.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Coat Weight'].default_value = coat
    bs.inputs['Coat Roughness'].default_value = 0.24
    if emission:
        bs.inputs['Emission Color'].default_value = (*emission[0], 1)
        bs.inputs['Emission Strength'].default_value = emission[1]
    if micro:
        tex = n.new('ShaderNodeTexNoise')
        tex.name = 'Microscopic suit weave'
        tex.inputs['Scale'].default_value = 175
        tex.inputs['Detail'].default_value = 2
        tex.inputs['Roughness'].default_value = 0.65
        bump = n.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = 0.11
        bump.inputs['Distance'].default_value = 0.014
        l.new(tex.outputs['Fac'], bump.inputs['Height'])
        l.new(bump.outputs['Normal'], bs.inputs['Normal'])
        tex.location = (-520, -180)
        bump.location = (-270, -100)
    return m

red = material('Suit | deep scarlet technical fabric', (0.48, 0.012, 0.025), 0.12, 0.34, 0.24, True)
blue = material('Suit | midnight cobalt panels', (0.012, 0.045, 0.19), 0.18, 0.35, 0.18, True)
web_mat = material('Webbing | raised charcoal rubber', (0.006, 0.009, 0.015), 0.12, 0.34)
black = material('Lens frame & emblem | obsidian', (0.004, 0.007, 0.012), 0.22, 0.25, 0.25)
eye = material('Lenses | pearl white ceramic', (0.78, 0.91, 0.98), 0.22, 0.17, 0.5, emission=((0.34, 0.48, 0.58), 0.09))
sole_mat = material('Boot soles | soft graphite', (0.012, 0.018, 0.028), 0.05, 0.55)
base_mat = material('Base | charcoal concrete', (0.045, 0.065, 0.085), 0.18, 0.54, micro=True)
base_top = material('Base | brushed slate', (0.10, 0.135, 0.16), 0.35, 0.4, micro=True)
metal = material('Base | gunmetal trim', (0.025, 0.04, 0.055), 0.75, 0.25)
red_glow = material('Base | red accent', (0.55, 0.008, 0.018), 0.4, 0.25, emission=((1.0, 0.005, 0.012), 2.0))
letter_mat = material('Lettering | warm white', (0.78, 0.86, 0.9), 0.45, 0.3)
floor_mat = material('Stage | infinite midnight', (0.012, 0.022, 0.037), 0.15, 0.48)

# -----------------------------------------------------------------------------
# Geometry helpers
# -----------------------------------------------------------------------------
def mesh_object(name, verts, faces, mats, col, indices=None, subd=0, parent=True):
    mesh = bpy.data.meshes.new(name + ' mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)
    if parent and col in (body_col, head_col, web_col, hand_col, emblem_col):
        obj.parent = root
    for m in mats:
        mesh.materials.append(m)
    for p in mesh.polygons:
        p.use_smooth = True
    if indices:
        for p, idx in zip(mesh.polygons, indices):
            p.material_index = idx
    if subd:
        mod = obj.modifiers.new('Silhouette smoothing', 'SUBSURF')
        mod.levels = subd
        mod.render_levels = subd
    return obj

def ellipsoid(name, loc, scale, mat, col, rotation=None, segments=48, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    if rotation:
        obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    move_to(obj, col)
    return obj

def bevel_cube(name, loc, scale, bevel, mat, col, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if rotation:
        obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    mod = obj.modifiers.new('Soft machined edges', 'BEVEL')
    mod.width = bevel
    mod.segments = 4
    mod2 = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    move_to(obj, col, parent=False)
    return obj

def cylinder(name, radius, depth, z, mat, col, vertices=128, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=(0, 0, z))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Edge highlights', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    for p in obj.data.polygons:
        p.use_smooth = True
    move_to(obj, col, parent=False)
    return obj

def curve_bundle(name, paths, radius, mat, col, cyclic=False, resolution=3):
    data = bpy.data.curves.new(name + ' curves', 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 2
    data.bevel_depth = radius
    data.bevel_resolution = resolution
    data.resolution_u = 2
    for path in paths:
        if len(path) < 2:
            continue
        if isinstance(path, dict):
            pts = path['points']
            radii = path.get('radii')
        else:
            pts = path
            radii = None
        sp = data.splines.new('POLY')
        sp.points.add(len(pts) - 1)
        for i, (p, co) in enumerate(zip(sp.points, pts)):
            p.co = (*co, 1)
            if radii:
                p.radius = radii[i]
        sp.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    col.objects.link(obj)
    data.materials.append(mat)
    if col in (body_col, head_col, web_col, hand_col, emblem_col):
        obj.parent = root
    return obj

def catmull(values, i, t):
    p0 = values[max(0, i - 1)]
    p1 = values[i]
    p2 = values[min(len(values) - 1, i + 1)]
    p3 = values[min(len(values) - 1, i + 2)]
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2*p0 - 5*p1 + 4*p2 - p3) * t*t + (-p0 + 3*p1 - 3*p2 + p3) * t*t*t)

def sample_closed_outline(points, steps=6):
    out = []
    for i in range(len(points)):
        for j in range(steps):
            out.append(catmull(points, i, j / steps))
    return out

# -----------------------------------------------------------------------------
# Athletic torso with tailored red/blue panels and subtle muscle relief
# -----------------------------------------------------------------------------
profile = [
    (3.34, 0.46, 0.30), (3.55, 0.59, 0.345), (3.84, 0.50, 0.305),
    (4.14, 0.55, 0.33), (4.45, 0.67, 0.375), (4.78, 0.80, 0.415),
    (5.04, 0.85, 0.385), (5.27, 0.77, 0.335), (5.43, 0.53, 0.28),
    (5.57, 0.275, 0.245)
]

def profile_at(z):
    if z <= profile[0][0]:
        return profile[0][1], profile[0][2]
    if z >= profile[-1][0]:
        return profile[-1][1], profile[-1][2]
    for i in range(len(profile)-1):
        if profile[i][0] <= z <= profile[i+1][0]:
            t = (z-profile[i][0])/(profile[i+1][0]-profile[i][0])
            w = catmull([p[1] for p in profile], i, t)
            d = catmull([p[2] for p in profile], i, t)
            return w, d
    return 0.5, 0.3

def relief(x, z, s):
    fw = max(0.0, -s) ** 3
    pec = 0.052 * exp(-((abs(x)-0.34)/0.26)**2 - ((z-4.82)/0.24)**2)
    abs_bulge = 0.0
    for row in (4.34, 4.08, 3.83):
        abs_bulge += 0.022 * exp(-((abs(x)-0.18)/0.16)**2 - ((z-row)/0.12)**2)
    return fw * (pec + abs_bulge)

torso_centers = []
for i in range(len(profile)-1):
    for j in range(7):
        torso_centers.append(profile[i][0] + (profile[i+1][0]-profile[i][0])*j/7)
torso_centers.append(profile[-1][0])
N = 80
verts = []
for z in torso_centers:
    w, d = profile_at(z)
    for j in range(N):
        a = 2*pi*j/N
        x = w*cos(a)
        s = sin(a)
        y = d*s - relief(x, z, s)
        verts.append((x, y, z))
faces, idx = [], []
for i in range(len(torso_centers)-1):
    z = (torso_centers[i]+torso_centers[i+1])/2
    for j in range(N):
        a = 2*pi*(j+0.5)/N
        faces.append((i*N+j, i*N+(j+1)%N, (i+1)*N+(j+1)%N, (i+1)*N+j))
        idx.append(0 if z >= 4.50 or (z >= 3.62 and sin(a) < -0.60) else 1)
faces.append(tuple(reversed(tuple(range(N)))))
idx.append(1)
faces.append(tuple((len(torso_centers)-1)*N+j for j in range(N)))
idx.append(0)
torso = mesh_object('Torso | sculpted athletic V taper', verts, faces, [red, blue], body_col, idx, 1)

ellipsoid('Pelvis | cobalt briefs', (0, 0.025, 3.43), (0.575, 0.345, 0.39), blue, body_col)
ellipsoid('Neck | masked', (0, 0.0, 5.57), (0.285, 0.26, 0.34), red, head_col)

# Tailored deltoids bridge the torso and arms.
for s in (-1, 1):
    ellipsoid(('L' if s < 0 else 'R') + ' deltoid', (s*0.78, 0.015, 5.12), (0.34, 0.345, 0.37), red, body_col)

# -----------------------------------------------------------------------------
# Smooth ring tubes for limbs and fingers
# -----------------------------------------------------------------------------
def make_tube(name, controls, mat, col, color_fn=None, samples=8, sides=40, subd=1):
    coords = [Vector(c[0]) for c in controls]
    rx_values = [c[1][0] for c in controls]
    ry_values = [c[1][1] for c in controls]
    centers, rxs, rys = [], [], []
    for i in range(len(controls)-1):
        for j in range(samples):
            t = j/samples
            centers.append(catmull(coords, i, t))
            rxs.append(max(0.012, catmull(rx_values, i, t)))
            rys.append(max(0.012, catmull(ry_values, i, t)))
    centers.append(coords[-1]); rxs.append(rx_values[-1]); rys.append(ry_values[-1])
    frames = []
    for i, c in enumerate(centers):
        tangent = (centers[min(i+1, len(centers)-1)] - centers[max(i-1, 0)]).normalized()
        ref = Vector((0, 1, 0)) if abs(tangent.y) < 0.88 else Vector((1, 0, 0))
        u = tangent.cross(ref).normalized()
        v = tangent.cross(u).normalized()
        frames.append((u, v, tangent))
    verts = []
    for i, c in enumerate(centers):
        u, v, _ = frames[i]
        for j in range(sides):
            a = 2*pi*j/sides
            p = c + u*(rxs[i]*cos(a)) + v*(rys[i]*sin(a))
            verts.append(tuple(p))
    faces, indices = [], []
    for i in range(len(centers)-1):
        for j in range(sides):
            faces.append((i*sides+j, i*sides+(j+1)%sides, (i+1)*sides+(j+1)%sides, (i+1)*sides+j))
            indices.append(color_fn(i, 2*pi*(j+0.5)/sides, centers[i]) if color_fn else 0)
    faces.append(tuple(reversed(tuple(range(sides))))); indices.append(0)
    faces.append(tuple((len(centers)-1)*sides+j for j in range(sides))); indices.append(0)
    obj = mesh_object(name, verts, faces, mat if isinstance(mat, list) else [mat], col, indices, subd)
    return {'obj': obj, 'centers': centers, 'rx': rxs, 'ry': rys, 'frames': frames, 'sides': sides}

def tube_point(data, i, a, offset=0.009):
    i = max(0, min(len(data['centers'])-1, i))
    lo = int(math.floor(i)); hi = min(lo+1, len(data['centers'])-1); t = i-lo
    c = data['centers'][lo].lerp(data['centers'][hi], t)
    rx = data['rx'][lo]*(1-t)+data['rx'][hi]*t
    ry = data['ry'][lo]*(1-t)+data['ry'][hi]*t
    u = data['frames'][lo][0].lerp(data['frames'][hi][0], t).normalized()
    v = data['frames'][lo][1].lerp(data['frames'][hi][1], t).normalized()
    return c + u*((rx+offset)*cos(a)) + v*((ry+offset)*sin(a))

def tube_web(name, data, predicate, spokes=8, rings=6, radius=0.0075):
    allowed = [i for i, c in enumerate(data['centers']) if predicate(i, c)]
    if len(allowed) < 4:
        return
    paths = []
    for k in range(spokes):
        a = 2*pi*k/spokes
        path = []
        for i in allowed:
            path.append(tube_point(data, i, a))
        if len(path) > 1:
            paths.append(path)
    start, end = allowed[0], allowed[-1]
    for r in range(1, rings+1):
        base = start + (end-start)*r/(rings+1)
        for k in range(spokes):
            path = []
            for j in range(9):
                t = j/8
                a = 2*pi*(k+t)/spokes
                i = base - 0.8*sin(pi*t)
                if start <= i <= end:
                    path.append(tube_point(data, i, a))
            if len(path) > 1:
                paths.append(path)
    return curve_bundle(name, paths, radius, web_mat, web_col)

leg_data = []
for side, label in ((-1, 'L'), (1, 'R')):
    if side < 0:
        controls = [((-0.18,0.055,3.60),(0.35,0.29)), ((-0.46,-0.01,3.10),(0.39,0.36)),
                    ((-0.57,-0.10,2.30),(0.265,0.26)), ((-0.65,-0.055,1.72),(0.30,0.285)),
                    ((-0.74,-0.12,0.64),(0.19,0.195))]
    else:
        controls = [((0.18,0.055,3.60),(0.35,0.29)), ((0.51,0.10,3.10),(0.39,0.36)),
                    ((0.66,0.18,2.28),(0.265,0.26)), ((0.79,0.16,1.70),(0.295,0.28)),
                    ((0.93,0.08,0.64),(0.19,0.195))]
    data = make_tube(label+' leg | thigh knee calf', controls, [red, blue], body_col,
                     lambda i,a,c: 0 if c.z < 2.25 else 1, samples=10, sides=48)
    leg_data.append(data)
    tube_web(label+' boot | stitched raised webbing', data, lambda i,c: c.z < 2.22, spokes=10, rings=7)

# Arms: left fist rests at hip, right forearm rises into the iconic gesture.
left_arm = make_tube('L arm | deltoid to wrist', [
    ((-0.77,0.015,5.17),(0.29,0.29)), ((-1.08,-0.015,4.88),(0.29,0.27)),
    ((-1.37,-0.12,4.43),(0.215,0.215)), ((-1.20,-0.29,4.13),(0.235,0.22)),
    ((-0.91,-0.405,3.96),(0.15,0.16))], red, body_col, samples=10, sides=44)
right_arm = make_tube('R arm | raised web-shooting pose', [
    ((0.77,0.015,5.17),(0.29,0.29)), ((1.10,-0.035,5.01),(0.28,0.265)),
    ((1.48,-0.15,4.80),(0.215,0.215)), ((1.80,-0.34,4.99),(0.225,0.21)),
    ((2.035,-0.50,5.25),(0.145,0.15))], red, body_col, samples=10, sides=44)
tube_web('L arm | red sleeve webbing', left_arm, lambda i,c: 2 < i < len(left_arm['centers'])-2, spokes=9, rings=7)
tube_web('R arm | red sleeve webbing', right_arm, lambda i,c: 2 < i < len(right_arm['centers'])-2, spokes=9, rings=7)

# -----------------------------------------------------------------------------
# Feet / boots with web patterns on the instep
# -----------------------------------------------------------------------------
def transform_func(center, angle):
    rot = Matrix.Rotation(angle, 3, 'Z')
    c = Vector(center)
    return lambda p: c + rot @ Vector(p)

for side, label in ((-1,'L'),(1,'R')):
    cx = -0.74 if side < 0 else 0.93
    cy = -0.20 if side < 0 else 0.01
    angle = math.radians(-9 if side < 0 else 11)
    center = (cx, cy, 0.535)
    ellipsoid(label+' boot | streamlined foot', center, (0.285,0.575,0.225), red, body_col, (0,0,angle))
    ellipsoid(label+' boot | graphite sole', (cx,cy,0.355), (0.278,0.56,0.055), sole_mat, body_col, (0,0,angle))
    H = transform_func(center, angle)
    paths = []
    rx, ry, rz = 0.285, 0.575, 0.225
    for x in (-0.18,-0.09,0,0.09,0.18):
        path = []
        for j in range(38):
            y = -0.49 + 0.67*j/37
            q = 1-(x/rx)**2-(y/ry)**2
            if q > 0:
                path.append(H((x,y,rz*sqrt(q)+0.008)))
        if len(path)>1: paths.append(path)
    for y0 in (-0.43,-0.25,-0.07,0.11):
        width = rx*sqrt(max(0,1-(y0/ry)**2))*0.92
        path=[]
        for j in range(32):
            x = -width+2*width*j/31
            y = y0-0.025*sin(pi*j/31)
            q=1-(x/rx)**2-(y/ry)**2
            if q>0: path.append(H((x,y,rz*sqrt(q)+0.008)))
        if len(path)>1: paths.append(path)
    curve_bundle(label+' foot | instep webbing', paths, 0.0065, web_mat, web_col)

# -----------------------------------------------------------------------------
# Hands: relaxed fist and fully modeled web-shooting hand
# -----------------------------------------------------------------------------
ellipsoid('L fist | palm', (-0.865,-0.43,3.91), (0.225,0.185,0.235), red, hand_col,
          (math.radians(-8),math.radians(-16),math.radians(-8)))
# Curled finger volumes and subtle knuckle separation.
for k in range(4):
    x = -1.015 + k*0.095
    ellipsoid('L fist | knuckle %d'%(k+1), (x,-0.555,3.97), (0.062,0.075,0.11), red, hand_col, segments=32, rings=20)
ellipsoid('L fist | thumb', (-0.70,-0.48,3.91), (0.09,0.12,0.16), red, hand_col,
          (0,math.radians(-25),0), segments=32, rings=20)

hand_center = Vector((2.12,-0.535,5.44))
hand_rot = Matrix.Rotation(math.radians(12),3,'Y') @ Matrix.Rotation(math.radians(-5),3,'Z')
def H(p):
    return hand_center + hand_rot @ Vector(p)

ellipsoid('R hand | open palm', hand_center, (0.235,0.135,0.285), red, hand_col,
          (0,math.radians(12),math.radians(-5)))

finger_specs = [
    ('index', [((-0.15,0,0.18),(.069,.064)),((-0.19,-0.005,.40),(.061,.057)),((-0.23,-0.012,.63),(.049,.047)),((-0.24,-0.015,.69),(.014,.014))]),
    ('middle curled', [((-0.055,0,.19),(.071,.065)),((-0.055,-0.015,.37),(.064,.058)),((-0.05,-0.15,.34),(.058,.052)),((-0.045,-0.19,.20),(.018,.018))]),
    ('ring curled', [((.065,0,.18),(.069,.064)),((.07,-0.015,.345),(.061,.057)),((.08,-0.15,.31),(.055,.05)),((.09,-0.185,.16),(.017,.017))]),
    ('pinky', [((.165,0,.17),(.063,.059)),((.205,-0.005,.39),(.055,.052)),((.25,-0.012,.61),(.044,.042)),((.275,-0.015,.675),(.013,.013))]),
    ('thumb', [((-.18,0,.015),(.079,.072)),((-.33,-.005,.11),(.068,.061)),((-.42,-.025,.285),(.049,.046)),((-.43,-.03,.35),(.015,.015))])
]
for name, spec in finger_specs:
    controls = [(H(p),r) for p,r in spec]
    data = make_tube('R hand | '+name, controls, red, hand_col, samples=7, sides=28, subd=1)
    tube_web('R hand | '+name+' web detail', data, lambda i,c: True, spokes=4, rings=2, radius=0.0042)

# Palm webbing on its front surface.
paths=[]
for x in (-.13,-.065,0,.065,.13):
    path=[]
    for j in range(28):
        z=-.21+.43*j/27
        q=1-(x/.235)**2-(z/.285)**2
        if q>0: path.append(H((x,-.135*sqrt(q)-.009,z)))
    if len(path)>1: paths.append(path)
for z0 in (-.14,-.015,.11):
    width=.235*sqrt(max(0,1-(z0/.285)**2))*.90
    path=[]
    for j in range(30):
        x=-width+2*width*j/29
        z=z0-.018*sin(pi*j/29)
        q=1-(x/.235)**2-(z/.285)**2
        if q>0: path.append(H((x,-.135*sqrt(q)-.009,z)))
    if len(path)>1: paths.append(path)
curve_bundle('R hand | palm webbing', paths, .0055, web_mat, web_col)

# -----------------------------------------------------------------------------
# Head, raised radial webbing and curved ceramic eye lenses
# -----------------------------------------------------------------------------
head_center = Vector((0,0,6.285))
head_r = Vector((0.555,0.475,0.725))

def head_from_unit(d):
    d = Vector(d).normalized()
    lower = max(0,(-d.z-0.10)/0.90)
    taper = 1-0.19*(lower**1.25)
    p = head_center + Vector((head_r.x*d.x*taper, head_r.y*d.y*(1-0.08*lower), head_r.z*d.z))
    return p

def head_front_y(x,z):
    dz=(z-head_center.z)/head_r.z
    lower=max(0,(-dz-0.10)/.90)
    taper=1-.19*(lower**1.25)
    q=max(.008,1-dz*dz-(x/(head_r.x*taper))**2)
    return head_r.y*(-sqrt(q))*(1-.08*lower)

verts=[]; faces=[]
LAT=64; LON=96
for i in range(LAT+1):
    phi=-pi/2+pi*i/LAT
    for j in range(LON):
        a=2*pi*j/LON
        d=Vector((cos(phi)*cos(a),cos(phi)*sin(a),sin(phi)))
        verts.append(tuple(head_from_unit(d)))
for i in range(LAT):
    for j in range(LON):
        faces.append((i*LON+j,i*LON+(j+1)%LON,(i+1)*LON+(j+1)%LON,(i+1)*LON+j))
head=mesh_object('Mask | sculpted jaw and cranium',verts,faces,[red],head_col,subd=1)

c=Vector((0,-1,.065)).normalized()
e1=Vector((1,0,0))
e2=c.cross(e1).normalized()

def mask_surface(t,a,offset=.009):
    v=cos(a)*e1+sin(a)*e2
    d=(cos(t)*c+sin(t)*v).normalized()
    p=head_from_unit(d)
    normal=Vector((d.x/head_r.x,d.y/head_r.y,d.z/head_r.z)).normalized()
    return p+normal*offset

paths=[]
SPOKES=16
for k in range(SPOKES):
    a=2*pi*k/SPOKES
    paths.append([mask_surface(.035+(pi-.07)*j/110,a) for j in range(111)])
for base in (.25,.50,.77,1.05,1.34,1.64,1.95,2.26,2.57,2.86):
    for k in range(SPOKES):
        path=[]
        for j in range(10):
            t=j/9
            a=2*pi*(k+t)/SPOKES
            radial=base-.055*sin(pi*t)
            path.append(mask_surface(radial,a))
        paths.append(path)
curve_bundle('Mask | sixteen radial spokes & scalloped webs',paths,.0082,web_mat,web_col,resolution=3)

# Eye outlines are curved patches, not flat disks.
eye_outline=[(-.155,-.19),(-.15,.045),(-.075,.205),(.105,.255),(.225,.145),(.18,-.055),(.015,-.21)]

def eye_patch(name,side,scale,offset,mat):
    base=[Vector((u*scale,z*scale)) for u,z in eye_outline]
    outline=sample_closed_outline(base,7)
    center=sum(outline,Vector((0,0)))/len(outline)
    verts=[]
    rings=6
    for r in range(rings+1):
        f=max(.0001,r/rings)
        for q in outline:
            p=center+(q-center)*f
            x=side*(.235+p.x)
            z=6.355+p.y
            y=head_front_y(x,z)-offset
            verts.append((x,y,z))
    n=len(outline); faces=[]
    for r in range(rings):
        for j in range(n):
            faces.append((r*n+j,r*n+(j+1)%n,(r+1)*n+(j+1)%n,(r+1)*n+j))
    obj=mesh_object(name,verts,faces,[mat],head_col,subd=0)
    return obj

for side,label in ((-1,'L'),(1,'R')):
    eye_patch(label+' eye | sculpted black gasket',side,1.13,.022,black)
    eye_patch(label+' eye | pearl ceramic lens',side,.91,.037,eye)
    # Fine outer rim emphasizes the sharp, expressive silhouette.
    rim=[Vector((u*1.13,z*1.13)) for u,z in eye_outline]
    rim=sample_closed_outline(rim,7)
    path=[]
    for p in rim:
        x=side*(.235+p.x); z=6.355+p.y
        path.append((x,head_front_y(x,z)-.028,z))
    curve_bundle(label+' eye | precision rim',[path],.010,black,head_col,cyclic=True,resolution=3)

# -----------------------------------------------------------------------------
# Torso webbing, projected onto the sculpted cloth
# -----------------------------------------------------------------------------
def torso_project(x,z,front=True,offset=.012):
    w,d=profile_at(z)
    q=max(.015,1-(x/w)**2)
    s=-sqrt(q) if front else sqrt(q)
    y=d*s-relief(x,z,s)
    return Vector((x,y+(-offset if front else offset),z))

def valid_torso_web(x,z,front):
    if z<3.64 or z>5.48:
        return False
    w,_=profile_at(z)
    if abs(x)>w*.96:
        return False
    if z>=4.50:
        return True
    return front and abs(x)<w*.80

for front in (True,False):
    paths=[]
    origin_z=4.89
    spokes=14
    max_r=1.12 if front else .86
    for k in range(spokes):
        a=2*pi*k/spokes
        path=[]
        for j in range(90):
            r=.06+(max_r-.06)*j/89
            x=r*cos(a); z=origin_z+r*sin(a)
            if valid_torso_web(x,z,front):
                path.append(torso_project(x,z,front))
            else:
                if len(path)>1: paths.append(path)
                path=[]
        if len(path)>1: paths.append(path)
    for base in ((.23,.43,.65,.87,1.05) if front else (.22,.43,.65)):
        for k in range(spokes):
            path=[]
            for j in range(12):
                t=j/11
                a=2*pi*(k+t)/spokes
                r=base-.04*sin(pi*t)
                x=r*cos(a); z=origin_z+r*sin(a)
                if valid_torso_web(x,z,front):
                    path.append(torso_project(x,z,front))
                else:
                    if len(path)>1: paths.append(path)
                    path=[]
            if len(path)>1: paths.append(path)
    curve_bundle('Torso | '+('front' if front else 'back')+' tailored webbing',paths,.008,web_mat,web_col)

# Chest spider: two body segments and eight tapered, angular legs.
ellipsoid('Chest spider | abdomen',(0,torso_project(0,4.72).y-.018,4.72),(.072,.030,.145),black,emblem_col)
ellipsoid('Chest spider | thorax',(0,torso_project(0,4.91).y-.018,4.91),(.057,.028,.075),black,emblem_col)
leg_shapes=[
    [(.035,4.91),(.17,5.07),(.36,5.13),(.45,5.04)],
    [(.045,4.84),(.22,4.96),(.40,4.92),(.49,4.79)],
    [(.04,4.73),(.20,4.60),(.35,4.50),(.43,4.56)],
    [(.035,4.66),(.15,4.45),(.27,4.32),(.34,4.35)]
]
paths=[]
for side in (-1,1):
    for shape in leg_shapes:
        pts=[]
        for x,z in shape:
            p=torso_project(side*x,z,True,.032)
            pts.append(p)
        # Densify each straight segment for a crisp but surface-following line.
        dense=[]
        for i in range(len(pts)-1):
            for j in range(7):
                dense.append(pts[i].lerp(pts[i+1],j/7))
        dense.append(pts[-1])
        paths.append({'points':dense,'radii':[1.15-.65*i/(len(dense)-1) for i in range(len(dense))]})
curve_bundle('Chest spider | eight tapered legs',paths,.027,black,emblem_col,resolution=4)

# Back spider, slightly larger and subtle under the studio rim light.
ellipsoid('Back spider | abdomen',(0,torso_project(0,4.84,False).y+.018,4.84),(.085,.032,.17),black,emblem_col)
ellipsoid('Back spider | thorax',(0,torso_project(0,5.05,False).y+.018,5.05),(.06,.028,.08),black,emblem_col)
paths=[]
for side in (-1,1):
    for shape in leg_shapes:
        pts=[torso_project(side*x*1.25,z+.05,False,.032) for x,z in shape]
        dense=[]
        for i in range(len(pts)-1):
            for j in range(6): dense.append(pts[i].lerp(pts[i+1],j/6))
        dense.append(pts[-1])
        paths.append({'points':dense,'radii':[1.1-.6*i/(len(dense)-1) for i in range(len(dense))]})
curve_bundle('Back spider | eight legs',paths,.027,black,emblem_col,resolution=4)

# -----------------------------------------------------------------------------
# Display plinth, lettering and studio floor
# -----------------------------------------------------------------------------
cylinder('Plinth | lower octagonal foundation',2.20,.25,.125,metal,stage_col,vertices=8,bevel=.045)
cylinder('Plinth | concrete drum',2.12,.25,.265,base_mat,stage_col,vertices=128,bevel=.04)
cylinder('Plinth | replaceable slate top',2.09,.10,.365,base_top,stage_col,vertices=128,bevel=.025)
cylinder('Plinth | scarlet light seam',2.125,.025,.205,red_glow,stage_col,vertices=128,bevel=.008)
# Small radial deck grooves.
paths=[]
for k in range(8):
    a=2*pi*k/8
    paths.append([(1.68*cos(a),1.68*sin(a),.419),(2.00*cos(a),2.00*sin(a),.419)])
curve_bundle('Plinth | eight deck inlays',paths,.009,metal,stage_col,resolution=2)

bevel_cube('Plinth | nameplate',(0,-2.102,.285),(1.72,.09,.34),.035,metal,stage_col)
def text_object(name,text,loc,size,mat,rotation=(pi/2,0,0),extrude=.004):
    data=bpy.data.curves.new(name+' font','FONT')
    data.body=text
    data.align_x='CENTER'
    data.align_y='CENTER'
    data.size=size
    data.extrude=extrude
    data.bevel_depth=.0015
    data.bevel_resolution=2
    obj=bpy.data.objects.new(name,data)
    stage_col.objects.link(obj)
    obj.location=loc
    obj.rotation_euler=rotation
    data.materials.append(mat)
    return obj
text_object('Nameplate | SPIDER-MAN','SPIDER-MAN',(0,-2.154,.303),.205,letter_mat)
text_object('Nameplate | edition','W E B - H E A D   /   0 1',(0,-2.156,.185),.061,red_glow)

bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.035))
floor=bpy.context.object
floor.name='Infinite studio floor'
floor.data.materials.append(floor_mat)
move_to(floor,stage_col,parent=False)

# -----------------------------------------------------------------------------
# Lighting and cameras
# -----------------------------------------------------------------------------
def point_at(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def area(name,loc,power,color,size,target,shape='DISK',size_y=None):
    data=bpy.data.lights.new(name,'AREA')
    data.energy=power
    data.color=color
    data.shape=shape
    data.size=size
    if size_y is not None and shape=='RECTANGLE': data.size_y=size_y
    obj=bpy.data.objects.new(name,data)
    light_col.objects.link(obj)
    obj.location=loc
    point_at(obj,target)
    return obj

area('Key | warm softbox',(-5,-7,10),1500,(1.0,.80,.68),5.0,(0,0,4.0))
area('Fill | cool silk',(6,-4,7),1100,(.56,.72,1.0),4.0,(.5,0,4.2))
area('Rim | cyan strip',(-4,4,8),1750,(.20,.62,1.0),3.0,(0,0,4.4),'RECTANGLE',5)
area('Rim | scarlet strip',(4,3,6.8),1450,(1.0,.12,.08),2.5,(0,0,4.1),'RECTANGLE',4)
area('Top | lens glint',(0,-1,11),700,(1.0,.94,.86),2.0,(0,0,5.0))

world=bpy.data.worlds.new('Midnight studio atmosphere')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.025,.045,.085,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.32
scene.world=world

cam_data=bpy.data.cameras.new('Hero portrait | orthographic product lens')
cam=bpy.data.objects.new('CAMERA | full figure',cam_data)
cam_col.objects.link(cam)
cam.location=(8.0,-17.5,8.2)
point_at(cam,(.25,0,3.52))
cam_data.type='ORTHO'
cam_data.ortho_scale=8.25
cam_data.lens=60
scene.camera=cam

close_data=bpy.data.cameras.new('Mask detail lens')
close=bpy.data.objects.new('CAMERA | mask detail (alternate)',close_data)
cam_col.objects.link(close)
close.location=(5.8,-12,7.7)
point_at(close,(0,0,5.55))
close_data.type='ORTHO'
close_data.ortho_scale=3.9

# -----------------------------------------------------------------------------
# Rendering, viewport and file output
# -----------------------------------------------------------------------------
scene.render.engine='CYCLES'
scene.cycles.samples=64
scene.cycles.use_denoising=True
scene.cycles.max_bounces=8
scene.cycles.diffuse_bounces=3
scene.cycles.glossy_bounces=4
scene.cycles.transmission_bounces=4
scene.render.resolution_x=1400
scene.render.resolution_y=1600
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGB'
scene.render.film_transparent=False
scene.render.filepath=RENDER_PATH
scene.render.use_file_extension=True
scene.view_settings.view_transform='AgX'
try:
    scene.view_settings.look='AgX - Medium High Contrast'
except Exception:
    pass
scene.render.image_settings.color_depth='8'

# Helpful opening state: camera-framed, material-colored solid viewport.
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active=torso
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='CAMERA'
            a.spaces.active.shading.type='SOLID'
            a.spaces.active.shading.color_type='MATERIAL'
            a.spaces.active.overlay.show_overlays=False

scene['Asset']='SPIDER-MAN | Web-Head 01'
scene['Instructions']='F12 renders the hero camera. Alternate mask-detail camera is included. All character components are parented to SPIDER-MAN | character root.'
scene['Palette']='Scarlet / cobalt / pearl / obsidian'

bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
print('SAVED_BLEND='+BLEND_PATH,flush=True)
bpy.ops.render.render(write_still=True)
print('SAVED_RENDER='+RENDER_PATH,flush=True)
