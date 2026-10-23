import bpy
import bmesh
import math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
import os

OUTPUT_DIR = r"D:\model"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def clear_scene_objects():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for m in list(bpy.data.meshes):
        bpy.data.meshes.remove(m, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)
    for lgt in list(bpy.data.lights):
        bpy.data.lights.remove(lgt, do_unlink=True)
    for cam in list(bpy.data.cameras):
        bpy.data.cameras.remove(cam, do_unlink=True)
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col, do_unlink=True)


def setup_collections():
    root_col = bpy.data.collections.new("COL_SpiderMan")
    bpy.context.scene.collection.children.link(root_col)

    cols = {}
    for name in ["COL_Geo", "COL_Webbing", "COL_Accessories", "COL_Lookdev_Lights"]:
        c = bpy.data.collections.new(name)
        root_col.children.link(c)
        cols[name] = c
    return root_col, cols


def link_to_collection(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


def set_bsdf_input(bsdf, names, value):
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return True
    return False


def create_materials():
    mats = {}

    # 1. Red Suit Material
    mat_red = bpy.data.materials.new("MAT_Suit_Red")
    mat_red.diffuse_color = (0.76, 0.025, 0.035, 1.0)
    nt = mat_red.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    set_bsdf_input(bsdf, ["Base Color"], (0.74, 0.02, 0.03, 1.0))
    set_bsdf_input(bsdf, ["Roughness"], 0.38)
    set_bsdf_input(bsdf, ["Metallic"], 0.05)
    set_bsdf_input(bsdf, ["Sheen Weight", "Sheen"], 0.35)
    set_bsdf_input(bsdf, ["Coat Weight", "Clearcoat"], 0.14)

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    voronoi = nt.nodes.new("ShaderNodeTexVoronoi")
    voronoi.inputs["Scale"].default_value = 420.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.07
    bump.inputs["Distance"].default_value = 0.002
    nt.links.new(tex_coord.outputs["Object"], voronoi.inputs["Vector"])
    nt.links.new(voronoi.outputs["Distance"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    mats["red"] = mat_red

    # 2. Blue Suit Material
    mat_blue = bpy.data.materials.new("MAT_Suit_Blue")
    mat_blue.diffuse_color = (0.02, 0.09, 0.44, 1.0)
    nt = mat_blue.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    set_bsdf_input(bsdf, ["Base Color"], (0.018, 0.08, 0.40, 1.0))
    set_bsdf_input(bsdf, ["Roughness"], 0.42)
    set_bsdf_input(bsdf, ["Metallic"], 0.15)
    set_bsdf_input(bsdf, ["Sheen Weight", "Sheen"], 0.3)

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    voronoi = nt.nodes.new("ShaderNodeTexVoronoi")
    voronoi.inputs["Scale"].default_value = 360.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.09
    bump.inputs["Distance"].default_value = 0.002
    nt.links.new(tex_coord.outputs["Object"], voronoi.inputs["Vector"])
    nt.links.new(voronoi.outputs["Distance"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    mats["blue"] = mat_blue

    # 3. Black Webbing / Eye Frame / Chest Logo Material
    mat_black = bpy.data.materials.new("MAT_Suit_Black")
    mat_black.diffuse_color = (0.012, 0.012, 0.018, 1.0)
    nt = mat_black.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    set_bsdf_input(bsdf, ["Base Color"], (0.010, 0.010, 0.015, 1.0))
    set_bsdf_input(bsdf, ["Roughness"], 0.20)
    set_bsdf_input(bsdf, ["Metallic"], 0.25)
    set_bsdf_input(bsdf, ["Coat Weight", "Clearcoat"], 0.40)
    mats["black"] = mat_black

    # 4. White Eye Lenses Material
    mat_white = bpy.data.materials.new("MAT_Eyes_White")
    mat_white.diffuse_color = (0.97, 0.98, 1.0, 1.0)
    nt = mat_white.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    set_bsdf_input(bsdf, ["Base Color"], (0.96, 0.98, 1.0, 1.0))
    set_bsdf_input(bsdf, ["Roughness"], 0.12)
    set_bsdf_input(bsdf, ["Coat Weight", "Clearcoat"], 0.8)
    set_bsdf_input(bsdf, ["Emission Color", "Emission"], (0.92, 0.96, 1.0, 1.0))
    set_bsdf_input(bsdf, ["Emission Strength"], 0.35)
    mats["white"] = mat_white

    # 5. Web Shooter Metal Material
    mat_metal = bpy.data.materials.new("MAT_WebShooter_Metal")
    mat_metal.diffuse_color = (0.35, 0.38, 0.42, 1.0)
    nt = mat_metal.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    set_bsdf_input(bsdf, ["Base Color"], (0.32, 0.35, 0.40, 1.0))
    set_bsdf_input(bsdf, ["Metallic"], 0.92)
    set_bsdf_input(bsdf, ["Roughness"], 0.25)
    mats["metal"] = mat_metal

    # 6. Back Spider Red Emblem Material
    mat_back_red = bpy.data.materials.new("MAT_Logo_Red")
    mat_back_red.diffuse_color = (0.82, 0.03, 0.04, 1.0)
    nt = mat_back_red.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    set_bsdf_input(bsdf, ["Base Color"], (0.78, 0.02, 0.03, 1.0))
    set_bsdf_input(bsdf, ["Roughness"], 0.28)
    set_bsdf_input(bsdf, ["Metallic"], 0.15)
    mats["logo_red"] = mat_back_red

    # 7. Pedestal Base Material
    mat_base = bpy.data.materials.new("MAT_Pedestal_Dark")
    mat_base.diffuse_color = (0.06, 0.065, 0.08, 1.0)
    nt = mat_base.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    set_bsdf_input(bsdf, ["Base Color"], (0.05, 0.055, 0.07, 1.0))
    set_bsdf_input(bsdf, ["Metallic"], 0.65)
    set_bsdf_input(bsdf, ["Roughness"], 0.32)
    mats["base"] = mat_base

    return mats


def smooth_shade(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True


HEAD_CENTER_Z = 1.565


def build_head_and_neck(col, mats):
    """Build sculpted Spider-Man head and muscular neck with natural heroic proportions."""
    mesh = bpy.data.meshes.new("SM_SpiderMan_Head_Mesh")
    obj = bpy.data.objects.new("SM_SpiderMan_Head", mesh)
    link_to_collection(obj, col)

    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=48, radius=1.0)

    for v in bm.verts:
        x, y, z = v.co.x, v.co.y, v.co.z
        rx = 0.096
        ry = 0.112
        rz = 0.132

        if z < 0.0:
            t = -z
            jaw_narrow = 1.0 - 0.38 * (t ** 1.35)
            rx *= jaw_narrow
            if y < 0:
                chin_forward = 1.0 + 0.07 * math.sin(min(t * math.pi, math.pi)) - 0.16 * (t ** 2.2)
                ry *= chin_forward
            else:
                occiput = 1.0 - 0.44 * (t ** 1.45)
                ry *= occiput
        else:
            t = z
            rx *= (1.0 - 0.07 * (t ** 2))
            if y > 0:
                ry *= (1.0 + 0.06 * math.sin(t * math.pi * 0.8))

        px = x * rx
        py = y * ry
        pz = HEAD_CENTER_Z + z * rz

        if y < -0.30:
            front_factor = (-y - 0.30) / 0.70
            brow = math.exp(-((z - 0.14) / 0.11) ** 2) * math.exp(-((abs(x) - 0.32) / 0.35) ** 2)
            py -= 0.0045 * brow * front_factor
            nose = math.exp(-(x / 0.16) ** 2) * math.exp(-((z + 0.06) / 0.18) ** 2)
            py -= 0.0075 * nose * front_factor
            cheek = math.exp(-((z + 0.12) / 0.16) ** 2) * math.exp(-((abs(x) - 0.55) / 0.25) ** 2)
            px += math.copysign(0.004 * cheek * front_factor, x)
            py -= 0.003 * cheek * front_factor

        v.co = Vector((px, py, pz))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    obj.data.materials.append(mats["red"])
    smooth_shade(obj)

    neck_mesh = bpy.data.meshes.new("SM_SpiderMan_Neck_Mesh")
    neck_obj = bpy.data.objects.new("SM_SpiderMan_Neck", neck_mesh)
    link_to_collection(neck_obj, col)
    bm_n = bmesh.new()

    rings = 16
    segs = 48
    ring_verts = []
    for i in range(rings + 1):
        t = i / rings  # 0 at Z=1.385, 1 at Z=1.495
        z = 1.385 + t * 0.110
        flare = (1.0 - t) ** 1.8
        rx = 0.060 + 0.042 * flare
        ry = 0.062 + 0.034 * flare
        cy = 0.008 - 0.015 * t
        row = []
        for j in range(segs):
            ang = (j / segs) * 2.0 * math.pi
            vx = rx * math.cos(ang)
            vy = cy + ry * math.sin(ang)
            row.append(bm_n.verts.new((vx, vy, z)))
        ring_verts.append(row)

    for i in range(rings):
        for j in range(segs):
            v1 = ring_verts[i][j]
            v2 = ring_verts[i][(j + 1) % segs]
            v3 = ring_verts[i + 1][(j + 1) % segs]
            v4 = ring_verts[i + 1][j]
            bm_n.faces.new((v1, v2, v3, v4))

    bmesh.ops.recalc_face_normals(bm_n, faces=bm_n.faces)
    bm_n.to_mesh(neck_mesh)
    bm_n.free()
    neck_obj.data.materials.append(mats["red"])
    smooth_shade(neck_obj)

    return obj, neck_obj


def eval_eye_spherical(s_len, s_height, expand_rad=0.0, expand_z=0.0):
    """
    Evaluate spherical coordinates (azimuth angle theta from front-center, elevation z)
    for the iconic large Spider-Man eye lens & black border.
    s_len in [0, 1]: 0 at inner nose bridge, 1 at outer temple corner.
    s_height in [0, 1]: 0 at lower cheek curve, 1 at upper brow curve.
    """
    s_c = max(0.0, min(1.0, s_len))
    # Azimuth from front (-Y axis): inner corner at 8.5 deg, outer temple corner at 54 deg!
    theta_min = math.radians(8.5) - expand_rad * 1.15
    theta_max = math.radians(54.0) + expand_rad * 1.35
    theta = theta_min + s_c * (theta_max - theta_min)

    # Spine elevation z sweeps upward from 1.542 at nose bridge to 1.606 at temple tip
    z_spine = (1.542 - expand_z * 0.35) + s_c * (0.064 + expand_z * 0.90)

    sin_p = math.sin(s_c * math.pi)
    # Upper brow curve is sleek and slightly arched; lower cheek curve drops deeply into a bold teardrop
    upper_dz = (0.016 * (sin_p ** 0.72) + expand_z * (0.55 + 0.55 * (sin_p ** 0.4)))
    lower_dz = (-0.036 * (sin_p ** 0.78) * (1.0 + 0.25 * (1.0 - s_c)) - expand_z * (0.65 + 0.65 * (sin_p ** 0.4)))

    # Perpendicular tilt offset so the eye opens orthogonal to its diagonal spine
    dz = lower_dz * (1.0 - s_height) + upper_dz * s_height
    dtheta = -dz * 3.2
    return theta + dtheta, z_spine + dz


def build_eyes(col, head_obj, mats):
    """Build large, expressive Spider-Man white lenses and bold black frames wrapping around the head."""
    bm_head = bmesh.new()
    bm_head.from_mesh(head_obj.data)
    bm_head.transform(head_obj.matrix_world)
    bvh = BVHTree.FromBMesh(bm_head)

    frame_mesh = bpy.data.meshes.new("SM_SpiderMan_Eyes_Frame_Mesh")
    frame_obj = bpy.data.objects.new("SM_SpiderMan_Eyes_Frame", frame_mesh)
    link_to_collection(frame_obj, col)

    lens_mesh = bpy.data.meshes.new("SM_SpiderMan_Eyes_Lens_Mesh")
    lens_obj = bpy.data.objects.new("SM_SpiderMan_Eyes_Lens", lens_mesh)
    link_to_collection(lens_obj, col)

    bm_frame = bmesh.new()
    bm_lens = bmesh.new()

    def project_spherical_to_head(side, theta, z, offset):
        # Raycast from outside the head along azimuth `theta` (0 = -Y front, +theta = +X side)
        ray_out = Vector((side * math.sin(theta), -math.cos(theta), 0.0)).normalized()
        center = Vector((0.0, 0.0, z))
        origin = center + ray_out * 0.25
        loc, norm, _, _ = bvh.ray_cast(origin, -ray_out)
        if loc is None:
            loc, norm, _, _ = bvh.find_nearest(center + ray_out * 0.10)
        return loc + norm * offset

    nu, nv = 32, 18
    for side in [1.0, -1.0]:
        # 1. White Inner Lens
        grid_lens = []
        for i in range(nu + 1):
            s_len = i / nu
            row = []
            for j in range(nv + 1):
                s_h = j / nv
                theta, z = eval_eye_spherical(s_len, s_h, expand_rad=0.0, expand_z=0.0)
                dome = math.sin(s_len * math.pi) * math.sin(s_h * math.pi) * 0.0028
                pt = project_spherical_to_head(side, theta, z, 0.0038 + dome)
                row.append(bm_lens.verts.new(pt))
            grid_lens.append(row)

        for i in range(nu):
            for j in range(nv):
                v1 = grid_lens[i][j]
                v2 = grid_lens[i + 1][j]
                v3 = grid_lens[i + 1][j + 1]
                v4 = grid_lens[i][j + 1]
                if side > 0:
                    bm_lens.faces.new((v1, v2, v3, v4))
                else:
                    bm_lens.faces.new((v1, v4, v3, v2))

        # 2. Bold Black Outer Frame Backing & Rim
        grid_frame_front = []
        grid_frame_back = []
        for i in range(nu + 1):
            s_len = i / nu
            row_f = []
            row_b = []
            for j in range(nv + 1):
                s_h = j / nv
                theta, z = eval_eye_spherical(
                    s_len, s_h, expand_rad=math.radians(5.8), expand_z=0.0085
                )
                edge_dist = min(s_len, 1.0 - s_len, s_h, 1.0 - s_h) * 2.0
                rim_h = 0.0034 if edge_dist < 0.36 else 0.0024
                pt_f = project_spherical_to_head(side, theta, z, rim_h)
                pt_b = project_spherical_to_head(side, theta, z, -0.0010)
                row_f.append(bm_frame.verts.new(pt_f))
                row_b.append(bm_frame.verts.new(pt_b))
            grid_frame_front.append(row_f)
            grid_frame_back.append(row_b)

        for i in range(nu):
            for j in range(nv):
                v1 = grid_frame_front[i][j]
                v2 = grid_frame_front[i + 1][j]
                v3 = grid_frame_front[i + 1][j + 1]
                v4 = grid_frame_front[i][j + 1]
                if side > 0:
                    bm_frame.faces.new((v1, v2, v3, v4))
                else:
                    bm_frame.faces.new((v1, v4, v3, v2))

        for i in range(nu):
            bm_frame.faces.new((grid_frame_front[i][0], grid_frame_front[i + 1][0], grid_frame_back[i + 1][0], grid_frame_back[i][0]))
            bm_frame.faces.new((grid_frame_front[i + 1][nv], grid_frame_front[i][nv], grid_frame_back[i][nv], grid_frame_back[i + 1][nv]))

    bmesh.ops.recalc_face_normals(bm_lens, faces=bm_lens.faces)
    bm_lens.to_mesh(lens_mesh)
    bm_lens.free()
    lens_obj.data.materials.append(mats["white"])
    smooth_shade(lens_obj)

    bmesh.ops.recalc_face_normals(bm_frame, faces=bm_frame.faces)
    bm_frame.to_mesh(frame_mesh)
    bm_frame.free()
    frame_obj.data.materials.append(mats["black"])
    smooth_shade(frame_obj)

    bm_head.free()
    return frame_obj, lens_obj


def torso_red_panel_halfwidth(z):
    t = max(0.0, min(1.0, (z - 0.96) / (1.295 - 0.96)))
    return 0.034 + 0.076 * (t ** 1.1)


def torso_shoulder_line_z(x, y):
    ax = abs(x)
    return 1.295 - 0.026 * (ax / 0.175) if y < 0 else 1.285 + 0.012 * (ax / 0.175)


def torso_belt_lines_z(x, y):
    ax = abs(x)
    v_dip = 0.036 * max(0.0, 1.0 - ax / 0.115) if y < 0 else 0.018 * max(0.0, 1.0 - ax / 0.115)
    belt_bot = 0.915 - v_dip
    belt_top = 0.980 - v_dip * 0.60
    return belt_bot, belt_top


def is_torso_red_zone(x, y, z):
    belt_bot, belt_top = torso_belt_lines_z(x, y)
    if belt_bot <= z <= belt_top:
        return True
    if z < belt_bot:
        return False

    shoulder_line = torso_shoulder_line_z(x, y)
    if z >= shoulder_line:
        return True

    if y < 0.015:
        if abs(x) <= torso_red_panel_halfwidth(z):
            return True

    return False


def build_torso(col, mats):
    """Build sleek, agile Spider-Man torso with aligned suit panel boundaries."""
    mesh = bpy.data.meshes.new("SM_SpiderMan_Torso_Mesh")
    obj = bpy.data.objects.new("SM_SpiderMan_Torso", mesh)
    link_to_collection(obj, col)

    bm = bmesh.new()
    rings = 76
    segs = 84
    ring_verts = []

    for i in range(rings + 1):
        t = i / rings  # 0 at Z=0.79, 1 at Z=1.425
        z = 0.79 + t * 0.635

        if z < 0.95:
            # Pelvis / hips (Z=0.79 to 0.95)
            s = (z - 0.79) / 0.16
            rx = 0.142 + 0.008 * math.sin(s * math.pi * 0.75)
            ry = 0.098 + 0.010 * math.sin(s * math.pi * 0.75)
            cy = 0.006
        elif z < 1.35:
            # Athletic waist (rx=0.132) tapering out to agile swimmer chest/lats (rx=0.184)
            s = (z - 0.95) / 0.40
            waist_dip = -0.014 * math.sin(min(s * 2.1, 1.0) * math.pi)
            rx = 0.144 + waist_dip + 0.052 * (s ** 1.15)
            ry = 0.098 + 0.026 * (s ** 1.1)
            cy = -0.006 * math.sin(s * math.pi)
        else:
            # Trapezius slope from shoulders (Z=1.35, rx=0.196) to neck base (Z=1.425)
            s = (z - 1.35) / 0.075
            rx = 0.196 * (1.0 - 0.52 * (s ** 1.5))
            ry = 0.124 * (1.0 - 0.40 * (s ** 1.5))
            cy = 0.005 * s

        row = []
        for j in range(segs):
            ang = (j / segs) * 2.0 * math.pi
            ca = math.cos(ang)
            sa = math.sin(ang)

            squircle = 1.0 + 0.05 * math.cos(2 * ang)
            px = rx * ca * squircle
            py = cy + ry * sa * squircle
            pz = z

            # 1. Snap front abdominal vertices near the diagonal Red/Blue seam onto the exact curve
            if sa < -0.15 and 0.965 < pz < 1.290:
                target_x = torso_red_panel_halfwidth(pz)
                if abs(abs(px) - target_x) < 0.010:
                    px = math.copysign(target_x, px)
                    ratio = min(0.99, abs(px) / max(0.01, rx * squircle))
                    py = cy - ry * squircle * math.sqrt(1.0 - ratio * ratio)

            # 2. Snap vertices near shoulder_line or belt_top / belt_bot onto the exact Z boundary
            sh_z = torso_shoulder_line_z(px, py)
            if abs(pz - sh_z) < 0.0045 and abs(px) > torso_red_panel_halfwidth(sh_z) - 0.005:
                pz = sh_z
            belt_bot, belt_top = torso_belt_lines_z(px, py)
            if abs(pz - belt_top) < 0.0045 and not (py < 0 and abs(px) < torso_red_panel_halfwidth(belt_top)):
                pz = belt_top
            elif abs(pz - belt_bot) < 0.0045:
                pz = belt_bot

            # Muscle sculpting:
            if sa < -0.15 and 1.18 < pz < 1.36:
                pec_z = math.sin(((pz - 1.18) / 0.18) * math.pi)
                pec_x = math.exp(-((abs(ca) - 0.46) / 0.34) ** 2)
                cleft = 1.0 - 0.60 * math.exp(-(ca / 0.10) ** 2)
                py -= 0.016 * pec_z * pec_x * cleft * (-sa)

            if sa < -0.35 and 0.97 < pz < 1.19:
                ab_x = math.exp(-((abs(ca) - 0.18) / 0.16) ** 2) * (1.0 - 0.50 * math.exp(-(ca / 0.05) ** 2))
                ab_wave = abs(math.sin(((pz - 0.97) / 0.22) * 3.0 * math.pi))
                py -= 0.006 * ab_x * (0.4 + 0.6 * ab_wave) * (-sa)

            if sa > 0.2 and 1.00 < pz < 1.35:
                spine_groove = math.exp(-(ca / 0.12) ** 2) * math.sin(((pz - 1.00) / 0.35) * math.pi)
                py -= 0.008 * spine_groove * sa

            if sa > 0.15 and 0.80 <= pz <= 0.96:
                glute_z = math.sin(((pz - 0.80) / 0.16) * math.pi)
                glute_x = math.exp(-((abs(ca) - 0.42) / 0.32) ** 2)
                py += 0.018 * glute_z * glute_x * sa

            if pz < 0.88:
                crotch_t = (0.88 - pz) / 0.09
                pz += 0.068 * crotch_t * (abs(ca) ** 1.4)
                px *= (1.0 - 0.22 * crotch_t * (1.0 - abs(ca) * 0.5))

            row.append(bm.verts.new((px, py, pz)))
        ring_verts.append(row)

    for i in range(rings):
        for j in range(segs):
            v1 = ring_verts[i][j]
            v2 = ring_verts[i][(j + 1) % segs]
            v3 = ring_verts[i + 1][(j + 1) % segs]
            v4 = ring_verts[i + 1][j]
            f = bm.faces.new((v1, v2, v3, v4))
            center = f.calc_center_median()
            f.material_index = 0 if is_torso_red_zone(center.x, center.y, center.z) else 1

    bot_center = bm.verts.new((0.0, 0.006, 0.788))
    for j in range(segs):
        f = bm.faces.new((ring_verts[0][(j + 1) % segs], ring_verts[0][j], bot_center))
        f.material_index = 1

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    obj.data.materials.append(mats["red"])
    obj.data.materials.append(mats["blue"])
    smooth_shade(obj)
    return obj


def build_arms_and_hands(col, mats):
    """Build agile, athletic Spider-Man arms, hands with 5 fingers, and wrist web-shooters."""
    arm_mesh = bpy.data.meshes.new("SM_SpiderMan_Arms_Mesh")
    arm_obj = bpy.data.objects.new("SM_SpiderMan_Arms", arm_mesh)
    link_to_collection(arm_obj, col)

    shooter_mesh = bpy.data.meshes.new("SM_SpiderMan_WebShooters_Mesh")
    shooter_obj = bpy.data.objects.new("SM_SpiderMan_WebShooters", shooter_mesh)
    link_to_collection(shooter_obj, col)

    bm = bmesh.new()
    bm_shooter = bmesh.new()

    for side in [1.0, -1.0]:
        p_root = Vector((side * 0.138, 0.005, 1.335))
        p_deltoid = Vector((side * 0.192, 0.008, 1.312))
        p_bicep = Vector((side * 0.236, 0.018, 1.215))
        p_elbow = Vector((side * 0.270, 0.030, 1.105))
        p_forearm = Vector((side * 0.292, -0.022, 1.000))
        p_wrist = Vector((side * 0.302, -0.080, 0.905))

        def eval_arm_spine(t):
            pts = [p_root, p_deltoid, p_bicep, p_elbow, p_forearm, p_wrist]
            scaled = t * (len(pts) - 1)
            idx = min(int(scaled), len(pts) - 2)
            lt = scaled - idx
            p0 = pts[max(0, idx - 1)]
            p1 = pts[idx]
            p2 = pts[idx + 1]
            p3 = pts[min(len(pts) - 1, idx + 2)]
            t2 = lt * lt
            t3 = t2 * lt
            return 0.5 * (
                (2.0 * p1)
                + (-p0 + p2) * lt
                + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
                + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
            )

        rings = 48
        segs = 32
        arm_rings = []
        for i in range(rings + 1):
            t = i / rings
            pos = eval_arm_spine(t)
            pos_next = eval_arm_spine(min(1.0, t + 0.01))
            pos_prev = eval_arm_spine(max(0.0, t - 0.01))
            tangent = (pos_next - pos_prev).normalized()

            up_ref = Vector((0.0, 1.0, 0.0))
            n_out = tangent.cross(up_ref).normalized()
            if n_out.x * side < 0:
                n_out = -n_out
            n_front = n_out.cross(tangent).normalized()

            # Sleek, agile superhero arm taper:
            # Deltoid ~ 0.060, Bicep ~ 0.048, Elbow ~ 0.040, Forearm ~ 0.043, Wrist ~ 0.027
            linear_taper = 0.056 * (1.0 - 0.52 * (t ** 0.95))
            deltoid_swell = 0.008 * math.exp(-((t - 0.14) / 0.14) ** 2)
            bicep_swell = 0.006 * math.exp(-((t - 0.38) / 0.14) ** 2)
            elbow_trim = -0.004 * math.exp(-((t - 0.56) / 0.08) ** 2)
            forearm_swell = 0.006 * math.exp(-((t - 0.70) / 0.12) ** 2)
            base_r = linear_taper + deltoid_swell + bicep_swell + elbow_trim + forearm_swell

            r_out = base_r * 1.02
            r_front = base_r * 0.94

            row = []
            for j in range(segs):
                ang = (j / segs) * 2.0 * math.pi
                ca = math.cos(ang)
                sa = math.sin(ang)
                v_pos = pos + n_out * (r_out * ca) + n_front * (r_front * sa)
                row.append((bm.verts.new(v_pos), t, ca, sa))
            arm_rings.append(row)

        for i in range(rings):
            for j in range(segs):
                v1, t1, ca1, _ = arm_rings[i][j]
                v2, _, ca2, _ = arm_rings[i][(j + 1) % segs]
                v3, t2, _, _ = arm_rings[i + 1][(j + 1) % segs]
                v4, _, _, _ = arm_rings[i + 1][j]
                f = bm.faces.new((v1, v2, v3, v4) if side > 0 else (v1, v4, v3, v2))

                t_mid = 0.5 * (t1 + t2)
                ca_mid = 0.5 * (ca1 + ca2)
                if t_mid < 0.24 or t_mid > 0.70 or ca_mid > 0.20:
                    f.material_index = 0
                else:
                    f.material_index = 1

        sh_center = bm.verts.new(p_root)
        for j in range(segs):
            v1 = arm_rings[0][j][0]
            v2 = arm_rings[0][(j + 1) % segs][0]
            f = bm.faces.new((v2, v1, sh_center) if side > 0 else (v1, v2, sh_center))
            f.material_index = 0

        wrist_tangent = (eval_arm_spine(1.0) - eval_arm_spine(0.95)).normalized()
        n_out = wrist_tangent.cross(Vector((0.0, 1.0, 0.0))).normalized()
        if n_out.x * side < 0:
            n_out = -n_out
        n_front = n_out.cross(wrist_tangent).normalized()

        palm_center = p_wrist + wrist_tangent * 0.040
        bm_palm = bmesh.new()
        bmesh.ops.create_uvsphere(bm_palm, u_segments=20, v_segments=14, radius=1.0)
        for v in bm_palm.verts:
            lx, ly, lz = v.co.x * 0.020, v.co.y * 0.036, v.co.z * 0.044
            v.co = palm_center + n_out * lx + n_front * ly + wrist_tangent * lz
        for f in bm_palm.faces:
            f.material_index = 0
        palm_mesh_tmp = bpy.data.meshes.new("tmp_palm")
        bm_palm.to_mesh(palm_mesh_tmp)
        bm_palm.free()
        bm.from_mesh(palm_mesh_tmp)
        bpy.data.meshes.remove(palm_mesh_tmp)

        finger_specs = [
            ("Thumb", 0.030, -0.010, 0.052, 0.0090, 28.0),
            ("Index", 0.026, 0.034, 0.065, 0.0078, 18.0),
            ("Middle", 0.008, 0.038, 0.070, 0.0082, 42.0),
            ("Ring", -0.009, 0.036, 0.065, 0.0076, 48.0),
            ("Pinky", -0.025, 0.030, 0.054, 0.0068, 24.0),
        ]
        for fname, fy, fz, flen, frad, fcurl in finger_specs:
            f_base = palm_center + n_front * fy + wrist_tangent * fz + n_out * (-0.004)
            f_rings = 10
            f_segs = 12
            f_verts = []
            cur_pos = f_base.copy()
            cur_dir = (wrist_tangent + n_front * (0.35 if fname == "Thumb" else 0.05)).normalized()
            curl_rad = math.radians(fcurl) / f_rings

            for fi in range(f_rings + 1):
                ft = fi / f_rings
                r = frad * (1.0 - 0.28 * (ft ** 1.6)) * (1.0 + 0.08 * math.sin(ft * 2.0 * math.pi))
                f_up = cur_dir.cross(n_front).normalized()
                if f_up.length < 0.1:
                    f_up = n_out
                f_side = cur_dir.cross(f_up).normalized()

                row = []
                for fj in range(f_segs):
                    fang = (fj / f_segs) * 2.0 * math.pi
                    vp = cur_pos + f_up * (r * math.cos(fang)) + f_side * (r * math.sin(fang))
                    row.append(bm.verts.new(vp))
                f_verts.append(row)

                cur_pos = cur_pos + cur_dir * (flen / f_rings)
                rot_mat = Matrix.Rotation(curl_rad * (-side), 3, n_front)
                cur_dir = (rot_mat @ cur_dir).normalized()

            for fi in range(f_rings):
                for fj in range(f_segs):
                    v1 = f_verts[fi][fj]
                    v2 = f_verts[fi][(fj + 1) % f_segs]
                    v3 = f_verts[fi + 1][(fj + 1) % f_segs]
                    v4 = f_verts[fi + 1][fj]
                    f = bm.faces.new((v1, v2, v3, v4))
                    f.material_index = 0
            tip_c = bm.verts.new(cur_pos)
            for fj in range(f_segs):
                f = bm.faces.new((f_verts[f_rings][fj], f_verts[f_rings][(fj + 1) % f_segs], tip_c))
                f.material_index = 0

        # Wrist Web-Shooter Cuff + Nozzle
        ws_segs = 28
        ws_rings = 6
        ws_verts = []
        for wi in range(ws_rings + 1):
            wt = (wi / ws_rings) - 0.5
            w_pos = p_wrist + wrist_tangent * (wt * 0.026)
            bevel = 1.0 - 0.15 * ((2.0 * wt) ** 2)
            row = []
            for wj in range(ws_segs):
                wang = (wj / ws_segs) * 2.0 * math.pi
                ca = math.cos(wang)
                sa = math.sin(wang)
                nozzle = 0.0075 if (ca < -0.75 and abs(wt) < 0.35) else 0.0
                cartridge = 0.0030 if (math.cos(wang * 8) > 0.3 and abs(wt) < 0.32) else 0.0
                r_o = (0.030 + nozzle + cartridge) * bevel
                r_f = (0.028 + nozzle + cartridge) * bevel
                vp = w_pos + n_out * (r_o * ca) + n_front * (r_f * sa)
                row.append(bm_shooter.verts.new(vp))
            ws_verts.append(row)

        for wi in range(ws_rings):
            for wj in range(ws_segs):
                v1 = ws_verts[wi][wj]
                v2 = ws_verts[wi][(wj + 1) % ws_segs]
                v3 = ws_verts[wi + 1][(wj + 1) % ws_segs]
                v4 = ws_verts[wi + 1][wj]
                bm_shooter.faces.new((v1, v2, v3, v4) if side > 0 else (v1, v4, v3, v2))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(arm_mesh)
    bm.free()
    arm_obj.data.materials.append(mats["red"])
    arm_obj.data.materials.append(mats["blue"])
    smooth_shade(arm_obj)

    bmesh.ops.recalc_face_normals(bm_shooter, faces=bm_shooter.faces)
    bm_shooter.to_mesh(shooter_mesh)
    bm_shooter.free()
    shooter_obj.data.materials.append(mats["metal"])
    smooth_shade(shooter_obj)

    return arm_obj, shooter_obj


def build_legs_and_boots(col, mats):
    """Build athletic legs with smooth thigh-to-knee-to-calf flow and red boots planted on Z = 0."""
    leg_mesh = bpy.data.meshes.new("SM_SpiderMan_Legs_Mesh")
    leg_obj = bpy.data.objects.new("SM_SpiderMan_Legs", leg_mesh)
    link_to_collection(leg_obj, col)

    bm = bmesh.new()

    for side in [1.0, -1.0]:
        rings = 60
        segs = 36
        leg_rings = []

        for i in range(rings + 1):
            t = i / rings
            z = 0.085 + t * 0.810

            cx = side * (0.130 - 0.046 * (t ** 0.95))
            knee_curve = -0.012 * math.exp(-((t - 0.48) / 0.18) ** 2)
            calf_curve = 0.010 * math.exp(-((t - 0.28) / 0.16) ** 2)
            cy = 0.006 + knee_curve + calf_curve

            linear_r = 0.039 + 0.048 * (t ** 0.88)
            calf_swell = 0.0075 * math.exp(-((t - 0.30) / 0.13) ** 2)
            knee_trim = -0.0060 * math.exp(-((t - 0.49) / 0.09) ** 2)
            quad_swell = 0.0070 * math.exp(-((t - 0.74) / 0.18) ** 2)
            base_r = linear_r + calf_swell + knee_trim + quad_swell

            rx = base_r * 0.96
            ry = base_r * 1.05

            row = []
            for j in range(segs):
                ang = (j / segs) * 2.0 * math.pi
                ca = math.cos(ang)
                sa = math.sin(ang)

                quad_front = 0.007 * math.exp(-((t - 0.74) / 0.18) ** 2) * max(0.0, -sa)
                calf_back = 0.009 * math.exp(-((t - 0.30) / 0.13) ** 2) * max(0.0, sa)

                px = cx + rx * ca
                py = cy + ry * sa - quad_front + calf_back
                row.append((bm.verts.new((px, py, z)), z, sa))
            leg_rings.append(row)

        for i in range(rings):
            for j in range(segs):
                v1, z1, sa1 = leg_rings[i][j]
                v2, _, sa2 = leg_rings[i][(j + 1) % segs]
                v3, z2, _ = leg_rings[i + 1][(j + 1) % segs]
                v4, _, _ = leg_rings[i + 1][j]
                f = bm.faces.new((v1, v2, v3, v4))
                z_mid = 0.5 * (z1 + z2)
                sa_mid = 0.5 * (sa1 + sa2)
                boot_line = 0.365 + 0.045 * max(0.0, -sa_mid)
                f.material_index = 0 if z_mid <= boot_line else 1

        top_c = bm.verts.new((side * 0.084, 0.006, 0.895))
        for j in range(segs):
            v1 = leg_rings[rings][j][0]
            v2 = leg_rings[rings][(j + 1) % segs][0]
            f = bm.faces.new((v1, v2, top_c))
            f.material_index = 1

        foot_segs = 28
        foot_rings = 16
        foot_verts = []
        foot_yaw = math.radians(9.0 * side)
        cos_y = math.cos(foot_yaw)
        sin_y = math.sin(foot_yaw)
        ankle_x = side * 0.130

        for fi in range(foot_rings + 1):
            ft = fi / foot_rings
            ly = 0.055 - ft * 0.210
            fw = 0.044 * math.sin(max(0.12, min(0.95, ft * 0.88 + 0.12)) * math.pi) + 0.018
            fh = 0.088 * ((1.0 - ft * 0.72) ** 1.4) + 0.016
            row = []
            for fj in range(foot_segs):
                fang = (fj / foot_segs) * 2.0 * math.pi
                ca = math.cos(fang)
                sa = math.sin(fang)
                lx = fw * ca
                if sa < 0:
                    lz = 0.012 * (1.0 + sa)
                else:
                    lz = 0.012 + fh * (sa ** 0.85)
                wx = ankle_x + lx * cos_y - ly * sin_y
                wy = lx * sin_y + ly * cos_y
                row.append(bm.verts.new((wx, wy, lz)))
            foot_verts.append(row)

        for fi in range(foot_rings):
            for fj in range(foot_segs):
                v1 = foot_verts[fi][fj]
                v2 = foot_verts[fi][(fj + 1) % foot_segs]
                v3 = foot_verts[fi + 1][(fj + 1) % foot_segs]
                v4 = foot_verts[fi + 1][fj]
                f = bm.faces.new((v1, v2, v3, v4))
                f.material_index = 0

        heel_c = bm.verts.new((ankle_x - 0.055 * sin_y, 0.055 * cos_y, 0.035))
        toe_c = bm.verts.new((ankle_x + 0.155 * sin_y, -0.155 * cos_y, 0.018))
        for fj in range(foot_segs):
            f1 = bm.faces.new((foot_verts[0][(fj + 1) % foot_segs], foot_verts[0][fj], heel_c))
            f2 = bm.faces.new((foot_verts[foot_rings][fj], foot_verts[foot_rings][(fj + 1) % foot_segs], toe_c))
            f1.material_index = 0
            f2.material_index = 0

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(leg_mesh)
    bm.free()

    leg_obj.data.materials.append(mats["red"])
    leg_obj.data.materials.append(mats["blue"])
    smooth_shade(leg_obj)
    return leg_obj


def add_tube_along_points(bm, pts, radius=0.0014, sides=6, closed=False):
    if len(pts) < 2:
        return
    rings = []
    n_pts = len(pts)
    for i, p in enumerate(pts):
        if closed:
            tangent = (pts[(i + 1) % n_pts] - pts[(i - 1) % n_pts]).normalized()
        elif i == 0:
            tangent = (pts[1] - pts[0]).normalized()
        elif i == n_pts - 1:
            tangent = (pts[-1] - pts[-2]).normalized()
        else:
            tangent = (pts[i + 1] - pts[i - 1]).normalized()

        ref = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((1, 0, 0))
        n1 = tangent.cross(ref).normalized()
        n2 = tangent.cross(n1).normalized()

        row = []
        for s in range(sides):
            ang = (s / sides) * 2.0 * math.pi
            vp = p + n1 * (radius * math.cos(ang)) + n2 * (radius * math.sin(ang))
            row.append(bm.verts.new(vp))
        rings.append(row)

    limit = n_pts if closed else n_pts - 1
    for i in range(limit):
        i_next = (i + 1) % n_pts
        for s in range(sides):
            s_next = (s + 1) % sides
            bm.faces.new((rings[i][s], rings[i][s_next], rings[i_next][s_next], rings[i_next][s]))


def build_suit_webbing_and_logos(col_web, col_acc, head_obj, neck_obj, torso_obj, leg_obj, mats):
    """Create raised 3D black webbing on Head, Neck, Torso, and Boots, plus Chest & Back Spider Emblems."""
    bm_h = bmesh.new()
    bm_h.from_mesh(head_obj.data)
    bvh_head = BVHTree.FromBMesh(bm_h)

    bm_n = bmesh.new()
    bm_n.from_mesh(neck_obj.data)
    bvh_neck = BVHTree.FromBMesh(bm_n)

    bm_t = bmesh.new()
    bm_t.from_mesh(torso_obj.data)
    bvh_torso = BVHTree.FromBMesh(bm_t)

    bm_web = bmesh.new()

    # --- 1. HEAD MASK WEBBING ---
    head_center = Vector((0.0, 0.0, HEAD_CENTER_Z))
    nose_dir = Vector((0.0, -1.0, -0.04)).normalized()
    up_vec = Vector((0.0, -0.04, 1.0)).normalized()
    right_vec = Vector((1.0, 0.0, 0.0))

    def point_in_eye_mask(p):
        if p.y < -0.015 and 1.505 <= p.z <= 1.625:
            theta = math.atan2(abs(p.x), -p.y)
            if math.radians(7.0) <= theta <= math.radians(56.0):
                s_c = (theta - math.radians(8.5)) / math.radians(45.5)
                s_c = max(0.0, min(1.0, s_c))
                cz = 1.542 + s_c * 0.064
                if (cz - 0.036) <= p.z <= (cz + 0.020):
                    return True
        return False

    num_rays = 16
    max_phi = math.pi * 0.92
    ray_steps = 40

    for r in range(num_rays):
        theta = (r / num_rays) * 2.0 * math.pi
        tang = right_vec * math.cos(theta) + up_vec * math.sin(theta)
        seg_pts = []
        for s in range(ray_steps + 1):
            phi = (s / ray_steps) * max_phi
            ray_dir = (nose_dir * math.cos(phi) + tang * math.sin(phi)).normalized()
            origin = head_center + ray_dir * 0.25
            loc, norm, _, _ = bvh_head.ray_cast(origin, -ray_dir)
            if loc is not None and not point_in_eye_mask(loc):
                seg_pts.append(loc + norm * 0.0011)
            else:
                if len(seg_pts) >= 2:
                    add_tube_along_points(bm_web, seg_pts, radius=0.0012, sides=6)
                seg_pts = []
        if len(seg_pts) >= 2:
            add_tube_along_points(bm_web, seg_pts, radius=0.0012, sides=6)

    ring_phis = [0.14, 0.28, 0.44, 0.62, 0.82, 1.05, 1.32, 1.62, 1.95, 2.30]
    for phi_base in ring_phis:
        for r in range(num_rays):
            theta0 = (r / num_rays) * 2.0 * math.pi
            theta1 = ((r + 1) / num_rays) * 2.0 * math.pi
            arc_pts = []
            sub_steps = 8
            for k in range(sub_steps + 1):
                st = k / sub_steps
                th = theta0 + (theta1 - theta0) * st
                scallop = -0.025 * math.sin(st * math.pi)
                phi = phi_base + scallop
                tang = right_vec * math.cos(th) + up_vec * math.sin(th)
                ray_dir = (nose_dir * math.cos(phi) + tang * math.sin(phi)).normalized()
                origin = head_center + ray_dir * 0.25
                loc, norm, _, _ = bvh_head.ray_cast(origin, -ray_dir)
                if loc is not None and not point_in_eye_mask(loc):
                    arc_pts.append(loc + norm * 0.0011)
                else:
                    if len(arc_pts) >= 2:
                        add_tube_along_points(bm_web, arc_pts, radius=0.0011, sides=6)
                    arc_pts = []
            if len(arc_pts) >= 2:
                add_tube_along_points(bm_web, arc_pts, radius=0.0011, sides=6)

    # --- 1b. NECK WEBBING ---
    for r in range(16):
        ang = (r / 16) * 2.0 * math.pi
        pts = []
        for zi in range(12):
            z = 1.390 + (zi / 11) * 0.075
            ray_dir = Vector((math.cos(ang), math.sin(ang), 0.0))
            origin = Vector((0.0, 0.0, z)) + ray_dir * 0.15
            loc, norm, _, _ = bvh_neck.ray_cast(origin, -ray_dir)
            if loc is not None:
                pts.append(loc + norm * 0.0011)
        if len(pts) >= 2:
            add_tube_along_points(bm_web, pts, radius=0.0011, sides=6)

    for z_neck in [1.41, 1.44]:
        pts = []
        for k in range(49):
            ang = (k / 48) * 2.0 * math.pi
            scallop = -0.004 * abs(math.sin(ang * 8.0))
            ray_dir = Vector((math.cos(ang), math.sin(ang), 0.0))
            origin = Vector((0.0, 0.0, z_neck + scallop)) + ray_dir * 0.15
            loc, norm, _, _ = bvh_neck.ray_cast(origin, -ray_dir)
            if loc is not None:
                pts.append(loc + norm * 0.0011)
        if len(pts) >= 2:
            add_tube_along_points(bm_web, pts, radius=0.0011, sides=6, closed=True)

    # --- 2. TORSO RED-ZONE WEBBING & SEAM PIPING ---
    torso_angles = [i * (2.0 * math.pi / 24) for i in range(24)]
    for ang in torso_angles:
        pts = []
        for zi in range(52):
            z = 0.88 + (zi / 51) * 0.54
            ray_dir = Vector((math.cos(ang), math.sin(ang), 0.0))
            origin = Vector((0.0, 0.0, z)) + ray_dir * 0.35
            loc, norm, _, _ = bvh_torso.ray_cast(origin, -ray_dir)
            if loc is not None and is_torso_red_zone(loc.x, loc.y, loc.z):
                pts.append(loc + norm * 0.0013)
            else:
                if len(pts) >= 2:
                    add_tube_along_points(bm_web, pts, radius=0.0012, sides=6)
                pts = []
        if len(pts) >= 2:
            add_tube_along_points(bm_web, pts, radius=0.0012, sides=6)

    for z_ring in [0.93, 0.97, 1.02, 1.07, 1.12, 1.17, 1.22, 1.27, 1.32, 1.37]:
        pts = []
        steps = 96
        for k in range(steps + 1):
            ang = (k / steps) * 2.0 * math.pi
            scallop = -0.008 * abs(math.sin(ang * 12.0))
            z = z_ring + scallop
            ray_dir = Vector((math.cos(ang), math.sin(ang), 0.0))
            origin = Vector((0.0, 0.0, z)) + ray_dir * 0.35
            loc, norm, _, _ = bvh_torso.ray_cast(origin, -ray_dir)
            if loc is not None and is_torso_red_zone(loc.x, loc.y, loc.z):
                pts.append(loc + norm * 0.0013)
            else:
                if len(pts) >= 2:
                    add_tube_along_points(bm_web, pts, radius=0.0011, sides=6)
                pts = []
        if len(pts) >= 2:
            add_tube_along_points(bm_web, pts, radius=0.0011, sides=6)

    # Seam piping along all Red/Blue boundaries on Torso:
    # A) Left & Right diagonal abdominal V-panel borders
    for side in [1.0, -1.0]:
        seam_pts = []
        for k in range(32):
            t = k / 31
            z = 0.960 + t * 0.335
            x = side * torso_red_panel_halfwidth(z)
            origin = Vector((x, -0.25, z))
            loc, norm, _, _ = bvh_torso.ray_cast(origin, Vector((0.0, 1.0, 0.0)))
            if loc is not None:
                seam_pts.append(loc + norm * 0.0020)
        add_tube_along_points(bm_web, seam_pts, radius=0.0022, sides=6)

    # B) Upper chest/back horizontal shoulder border seam (where blue side torso meets red upper torso)
    sh_seam_pts = []
    for k in range(97):
        ang = (k / 96) * 2.0 * math.pi
        ray_dir = Vector((math.cos(ang), math.sin(ang), 0.0))
        est_x = 0.16 * math.cos(ang)
        est_y = 0.11 * math.sin(ang)
        z = torso_shoulder_line_z(est_x, est_y)
        if est_y < 0 and abs(est_x) < torso_red_panel_halfwidth(z) - 0.004:
            if len(sh_seam_pts) >= 2:
                add_tube_along_points(bm_web, sh_seam_pts, radius=0.0020, sides=6)
            sh_seam_pts = []
            continue
        origin = Vector((0.0, 0.0, z)) + ray_dir * 0.35
        loc, norm, _, _ = bvh_torso.ray_cast(origin, -ray_dir)
        if loc is not None:
            sh_seam_pts.append(loc + norm * 0.0018)
    if len(sh_seam_pts) >= 2:
        add_tube_along_points(bm_web, sh_seam_pts, radius=0.0020, sides=6)

    # C) Belt top and bottom border seams
    for is_top in [True, False]:
        belt_pts = []
        for k in range(97):
            ang = (k / 96) * 2.0 * math.pi
            ray_dir = Vector((math.cos(ang), math.sin(ang), 0.0))
            est_x = 0.14 * math.cos(ang)
            est_y = 0.10 * math.sin(ang)
            b_bot, b_top = torso_belt_lines_z(est_x, est_y)
            z = b_top if is_top else b_bot
            if is_top and est_y < 0 and abs(est_x) < torso_red_panel_halfwidth(z) - 0.004:
                if len(belt_pts) >= 2:
                    add_tube_along_points(bm_web, belt_pts, radius=0.0020, sides=6)
                belt_pts = []
                continue
            origin = Vector((0.0, 0.0, z)) + ray_dir * 0.35
            loc, norm, _, _ = bvh_torso.ray_cast(origin, -ray_dir)
            if loc is not None:
                belt_pts.append(loc + norm * 0.0018)
        if len(belt_pts) >= 2:
            add_tube_along_points(bm_web, belt_pts, radius=0.0020, sides=6)

    # --- 3. BOOT WEBBING ---
    bm_l = bmesh.new()
    bm_l.from_mesh(leg_obj.data)
    bvh_legs = BVHTree.FromBMesh(bm_l)

    for side in [1.0, -1.0]:
        ankle_x = side * 0.130
        for z_boot in [0.12, 0.18, 0.24, 0.30, 0.36]:
            pts = []
            for k in range(33):
                ang = (k / 32) * 2.0 * math.pi
                ray_dir = Vector((math.cos(ang), math.sin(ang), 0.0))
                origin = Vector((ankle_x, 0.0, z_boot)) + ray_dir * 0.15
                loc, norm, _, _ = bvh_legs.ray_cast(origin, -ray_dir)
                if loc is not None:
                    pts.append(loc + norm * 0.0012)
            if len(pts) >= 2:
                add_tube_along_points(bm_web, pts, radius=0.0012, sides=6, closed=True)

        for r in range(10):
            ang = (r / 10) * 2.0 * math.pi
            pts = []
            for zi in range(16):
                z = 0.09 + (zi / 15) * 0.28
                ray_dir = Vector((math.cos(ang), math.sin(ang), 0.0))
                origin = Vector((ankle_x, 0.0, z)) + ray_dir * 0.15
                loc, norm, _, _ = bvh_legs.ray_cast(origin, -ray_dir)
                if loc is not None:
                    pts.append(loc + norm * 0.0012)
            if len(pts) >= 2:
                add_tube_along_points(bm_web, pts, radius=0.0012, sides=6)

    web_mesh = bpy.data.meshes.new("SM_SpiderMan_Webbing_Mesh")
    web_obj = bpy.data.objects.new("SM_SpiderMan_Webbing", web_mesh)
    link_to_collection(web_obj, col_web)
    bmesh.ops.recalc_face_normals(bm_web, faces=bm_web.faces)
    bm_web.to_mesh(web_mesh)
    bm_web.free()
    web_obj.data.materials.append(mats["black"])
    smooth_shade(web_obj)

    # --- 4. FRONT CHEST BLACK SPIDER EMBLEM ---
    chest_mesh = bpy.data.meshes.new("SM_SpiderMan_ChestLogo_Mesh")
    chest_obj = bpy.data.objects.new("SM_SpiderMan_ChestLogo", chest_mesh)
    link_to_collection(chest_obj, col_acc)
    bm_chest = bmesh.new()

    def project_chest(x, z, offset=0.0030):
        origin = Vector((x, -0.30, z))
        loc, norm, _, _ = bvh_torso.ray_cast(origin, Vector((0.0, 1.0, 0.0)))
        if loc is None:
            loc, norm, _, _ = bvh_torso.find_nearest(Vector((x, -0.12, z)))
        return loc + norm * offset

    for cz, rx, rz in [(1.248, 0.015, 0.024), (1.284, 0.011, 0.015)]:
        ring_pts = []
        for k in range(16):
            ang = (k / 16) * 2.0 * math.pi
            px = rx * math.cos(ang)
            pz = cz + rz * math.sin(ang)
            ring_pts.append(bm_chest.verts.new(project_chest(px, pz, 0.0036)))
        c_vert = bm_chest.verts.new(project_chest(0.0, cz, 0.0055))
        for k in range(16):
            bm_chest.faces.new((ring_pts[k], ring_pts[(k + 1) % 16], c_vert))

    front_legs = [
        [(0.007, 1.286), (0.025, 1.304), (0.034, 1.345), (0.028, 1.375)],
        [(0.009, 1.278), (0.038, 1.290), (0.050, 1.325), (0.046, 1.358)],
        [(0.010, 1.262), (0.038, 1.252), (0.048, 1.215), (0.042, 1.180)],
        [(0.008, 1.248), (0.025, 1.232), (0.032, 1.190), (0.024, 1.152)],
    ]
    for side in [1.0, -1.0]:
        for leg_ctrl in front_legs:
            dense_pts = []
            for idx in range(len(leg_ctrl) - 1):
                x0, z0 = leg_ctrl[idx]
                x1, z1 = leg_ctrl[idx + 1]
                for sub in range(5):
                    st = sub / 5
                    lx = side * (x0 + (x1 - x0) * st)
                    lz = z0 + (z1 - z0) * st
                    dense_pts.append(project_chest(lx, lz, 0.0030))
            lx_end, lz_end = leg_ctrl[-1]
            dense_pts.append(project_chest(side * lx_end, lz_end, 0.0025))
            add_tube_along_points(bm_chest, dense_pts, radius=0.0025, sides=8)

    bmesh.ops.recalc_face_normals(bm_chest, faces=bm_chest.faces)
    bm_chest.to_mesh(chest_mesh)
    bm_chest.free()
    chest_obj.data.materials.append(mats["black"])
    smooth_shade(chest_obj)

    # --- 5. BACK RED SPIDER EMBLEM ---
    back_mesh = bpy.data.meshes.new("SM_SpiderMan_BackLogo_Mesh")
    back_obj = bpy.data.objects.new("SM_SpiderMan_BackLogo", back_mesh)
    link_to_collection(back_obj, col_acc)
    bm_back = bmesh.new()

    def project_back(x, z, offset=0.0030):
        origin = Vector((x, 0.30, z))
        loc, norm, _, _ = bvh_torso.ray_cast(origin, Vector((0.0, -1.0, 0.0)))
        if loc is None:
            loc, norm, _, _ = bvh_torso.find_nearest(Vector((x, 0.12, z)))
        return loc + norm * offset

    for cz, rx, rz in [(1.185, 0.034, 0.044), (1.240, 0.017, 0.019)]:
        ring_pts = []
        for k in range(24):
            ang = (k / 24) * 2.0 * math.pi
            px = rx * math.cos(ang)
            pz = cz + rz * math.sin(ang)
            ring_pts.append(bm_back.verts.new(project_back(px, pz, 0.0032)))
        c_vert = bm_back.verts.new(project_back(0.0, cz, 0.0056))
        for k in range(24):
            bm_back.faces.new((ring_pts[(k + 1) % 24], ring_pts[k], c_vert))

    back_legs = [
        [(0.014, 1.235), (0.048, 1.258), (0.068, 1.295), (0.058, 1.330)],
        [(0.022, 1.215), (0.062, 1.230), (0.085, 1.258), (0.080, 1.290)],
        [(0.024, 1.185), (0.065, 1.172), (0.085, 1.138), (0.078, 1.102)],
        [(0.018, 1.160), (0.050, 1.140), (0.065, 1.100), (0.052, 1.062)],
    ]
    for side in [1.0, -1.0]:
        for leg_ctrl in back_legs:
            dense_pts = []
            for idx in range(len(leg_ctrl) - 1):
                x0, z0 = leg_ctrl[idx]
                x1, z1 = leg_ctrl[idx + 1]
                for sub in range(5):
                    st = sub / 5
                    lx = side * (x0 + (x1 - x0) * st)
                    lz = z0 + (z1 - z0) * st
                    dense_pts.append(project_back(lx, lz, 0.0030))
            lx_end, lz_end = leg_ctrl[-1]
            dense_pts.append(project_back(side * lx_end, lz_end, 0.0025))
            add_tube_along_points(bm_back, dense_pts, radius=0.0032, sides=8)

    bmesh.ops.recalc_face_normals(bm_back, faces=bm_back.faces)
    bm_back.to_mesh(back_mesh)
    bm_back.free()
    back_obj.data.materials.append(mats["logo_red"])
    smooth_shade(back_obj)

    bm_h.free()
    bm_n.free()
    bm_t.free()
    bm_l.free()
    return web_obj, chest_obj, back_obj


def build_pedestal(col, mats):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.42, depth=0.06, location=(0.0, 0.0, -0.03))
    ped = bpy.context.active_object
    ped.name = "SM_SpiderMan_Pedestal"
    ped.data.name = "SM_SpiderMan_Pedestal_Mesh"
    link_to_collection(ped, col)
    ped.data.materials.append(mats["base"])
    smooth_shade(ped)

    bevel = ped.modifiers.new(name="Bevel", type="BEVEL")
    bevel.width = 0.008
    bevel.segments = 3
    return ped


def setup_lighting_and_camera(col_lights):
    scene = bpy.context.scene

    world = bpy.data.worlds.new("World_Lookdev")
    scene.world = world
    bg = next((n for n in world.node_tree.nodes if n.type == "BACKGROUND"), None)
    if bg:
        bg.inputs[0].default_value = (0.045, 0.05, 0.068, 1.0)
        bg.inputs[1].default_value = 0.85

    key_data = bpy.data.lights.new(name="LGT_Key", type="AREA")
    key_data.energy = 220.0
    key_data.size = 1.6
    key_data.color = (1.0, 0.97, 0.94)
    key_obj = bpy.data.objects.new(name="LGT_Key", object_data=key_data)
    key_obj.location = (-1.6, -2.1, 2.2)
    direction = Vector((0.0, 0.0, 1.10)) - key_obj.location
    key_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    link_to_collection(key_obj, col_lights)

    fill_data = bpy.data.lights.new(name="LGT_Fill", type="AREA")
    fill_data.energy = 95.0
    fill_data.size = 2.0
    fill_data.color = (0.85, 0.92, 1.0)
    fill_obj = bpy.data.objects.new(name="LGT_Fill", object_data=fill_data)
    fill_obj.location = (1.9, -1.8, 1.5)
    direction = Vector((0.0, 0.0, 1.05)) - fill_obj.location
    fill_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    link_to_collection(fill_obj, col_lights)

    rim_data = bpy.data.lights.new(name="LGT_Rim", type="AREA")
    rim_data.energy = 260.0
    rim_data.size = 1.4
    rim_data.color = (0.92, 0.96, 1.0)
    rim_obj = bpy.data.objects.new(name="LGT_Rim", object_data=rim_data)
    rim_obj.location = (0.3, 1.8, 2.3)
    direction = Vector((0.0, 0.0, 1.20)) - rim_obj.location
    rim_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    link_to_collection(rim_obj, col_lights)

    cam_data = bpy.data.cameras.new(name="CAM_Lookdev_Hero")
    cam_data.lens = 55.0
    cam_obj = bpy.data.objects.new(name="CAM_Lookdev_Hero", object_data=cam_data)
    cam_obj.location = (-0.62, -2.45, 1.12)
    cam_dir = Vector((0.0, 0.0, 0.92)) - cam_obj.location
    cam_obj.rotation_euler = cam_dir.to_track_quat("-Z", "Y").to_euler()
    link_to_collection(cam_obj, col_lights)
    scene.camera = cam_obj

    cam_close_data = bpy.data.cameras.new(name="CAM_Lookdev_Closeup")
    cam_close_data.lens = 75.0
    cam_close_obj = bpy.data.objects.new(name="CAM_Lookdev_Closeup", object_data=cam_close_data)
    cam_close_obj.location = (0.26, -1.10, 1.46)
    cam_close_dir = Vector((0.0, 0.0, 1.38)) - cam_close_obj.location
    cam_close_obj.rotation_euler = cam_close_dir.to_track_quat("-Z", "Y").to_euler()
    link_to_collection(cam_close_obj, col_lights)

    return cam_obj, cam_close_obj


def main():
    clear_scene_objects()
    root_col, cols = setup_collections()
    mats = create_materials()

    head_obj, neck_obj = build_head_and_neck(cols["COL_Geo"], mats)
    frame_obj, lens_obj = build_eyes(cols["COL_Accessories"], head_obj, mats)
    torso_obj = build_torso(cols["COL_Geo"], mats)
    arm_obj, shooter_obj = build_arms_and_hands(cols["COL_Geo"], mats)
    leg_obj = build_legs_and_boots(cols["COL_Geo"], mats)
    web_obj, chest_obj, back_obj = build_suit_webbing_and_logos(
        cols["COL_Webbing"], cols["COL_Accessories"], head_obj, neck_obj, torso_obj, leg_obj, mats
    )
    ped_obj = build_pedestal(cols["COL_Accessories"], mats)

    cam_hero, cam_close = setup_lighting_and_camera(cols["COL_Lookdev_Lights"])

    blend_path = os.path.join(OUTPUT_DIR, "spiderman.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved Blender file: {blend_path}")

    glb_path = os.path.join(OUTPUT_DIR, "spiderman.glb")
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB")
    print(f"Exported GLB: {glb_path}")

    fbx_path = os.path.join(OUTPUT_DIR, "spiderman.fbx")
    bpy.ops.export_scene.fbx(filepath=fbx_path, path_mode="COPY", embed_textures=True)
    print(f"Exported FBX: {fbx_path}")


if __name__ == "__main__":
    main()
