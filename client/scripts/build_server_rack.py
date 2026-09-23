"""Generate the original CampusLab 42U network rack asset with Blender 5.2.

Run: blender -b --python client/scripts/build_server_rack.py
"""
import bpy
from pathlib import Path


OUTPUT = Path(__file__).resolve().parents[1] / "public" / "models" / "digital-twin" / "server-rack.glb"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def material(name, color, metallic=0.0, roughness=0.5, emission=None):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = emission
    return result


frame = material("Graphite powder-coated steel", (0.055, 0.068, 0.079), 0.72, 0.29)
panel = material("Brushed dark server faceplate", (0.105, 0.119, 0.132), 0.62, 0.35)
vent = material("Recessed ventilation", (0.018, 0.024, 0.028), 0.3, 0.74)
steel = material("Satin steel rails", (0.34, 0.39, 0.41), 0.78, 0.27)
blue = material("Active blue indicators", (0.08, 0.58, 0.83), emission=2.0)
green = material("Healthy green indicators", (0.13, 0.72, 0.39), emission=1.5)
glass = material("Smoked front glass", (0.055, 0.075, 0.082), 0.16, 0.13)


def box(name, location, dimensions, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.modifiers.new("Weighted face normals", "WEIGHTED_NORMAL")
    return obj


# Full-size 42U enclosure; ground at z=0. The front faces negative Y.
for x in (-0.296, 0.296):
    for y in (-0.425, 0.425):
        box("Vertical structural rail", (x, y, 1.015), (0.038, 0.047, 1.93), frame, 0.008)
for z in (0.075, 1.96):
    for y in (-0.425, 0.425):
        box("Horizontal structural rail", (0, y, z), (0.625, 0.055, 0.055), frame, 0.008)
    for x in (-0.296, 0.296):
        box("Side structural rail", (x, 0, z), (0.045, 0.9, 0.055), frame, 0.008)

box("Left solid side panel", (-0.308, 0, 1.02), (0.012, 0.84, 1.79), frame, 0.005)
box("Right solid side panel", (0.308, 0, 1.02), (0.012, 0.84, 1.79), frame, 0.005)
box("Rear cable service door", (0, 0.449, 1.02), (0.55, 0.016, 1.76), frame, 0.006)
box("Ventilated top panel", (0, 0, 1.991), (0.63, 0.91, 0.025), panel, 0.006)
box("Heavy lower plinth", (0, 0, 0.05), (0.65, 0.94, 0.10), frame, 0.01)

for x in (-0.262, 0.262):
    box("Front equipment mounting rail", (x, -0.404, 1.02), (0.025, 0.018, 1.76), steel, 0.003)
    box("Rack foot", (x, -0.34, 0.018), (0.07, 0.08, 0.035), vent, 0.004)
    box("Rack foot", (x, 0.34, 0.018), (0.07, 0.08, 0.035), vent, 0.004)

for slot in range(19):
    z = 0.19 + slot * 0.087
    height = 0.068 if slot % 5 else 0.078
    box(f"Server module {slot + 1:02d}", (0, -0.388, z), (0.51, 0.052, height), panel, 0.005)
    box("Inset black intake", (-0.09, -0.416, z), (0.29, 0.004, height * 0.62), vent)
    for slit in range(10):
        box("Ventilation slot", (-0.215 + slit * 0.027, -0.419, z), (0.012, 0.002, height * 0.43), steel)
    box("Module identification strip", (0.155, -0.418, z + 0.015), (0.11, 0.003, 0.008), steel)
    box("Server power LED", (0.229, -0.423, z), (0.008, 0.004, 0.008), green if slot % 6 else blue)
    if slot % 3 == 0:
        box("Secondary activity LED", (0.211, -0.423, z), (0.006, 0.004, 0.006), blue)

for index in range(14):
    x = -0.24 + index * 0.036
    box("Top cooling grille", (x, 0, 2.006), (0.014, 0.63, 0.002), vent)

# Door frame is modeled open at the left hinge, revealing the server faces.
box("Open glass door left stile", (-0.34, -0.67, 1.02), (0.026, 0.026, 1.82), frame, 0.005)
box("Open glass door right stile", (-0.34, -1.23, 1.02), (0.026, 0.026, 1.82), frame, 0.005)
for z in (0.11, 1.93):
    box("Open glass door rail", (-0.34, -0.95, z), (0.026, 0.59, 0.025), frame, 0.005)
box("Open glass door pane", (-0.34, -0.95, 1.02), (0.008, 0.53, 1.77), glass, 0.003)
box("Door handle", (-0.36, -1.19, 1.04), (0.022, 0.018, 0.15), steel, 0.004)

# Merge the many repeated details by material to keep WebGL draw calls low.
for mat in (frame, panel, vent, steel, blue, green, glass):
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.data.materials and obj.data.materials[0] == mat]
    if not objects:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    objects[0].name = mat.name

# Blender Z-up is converted to glTF Y-up by the exporter.
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format="GLB", export_apply=True)
print(f"Wrote {OUTPUT}")
