# Caminho B (Mixamo): converte um personagem FBX rigado em GLB.
# Uso: blender -b -P tools/fbx_to_glb.py -- entrada.fbx public/assets/characters/<id>/model.glb
import bpy, sys

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, automatic_bone_orientation=False)
for a in list(bpy.data.actions):
    a.name = 'idle' if len(bpy.data.actions) == 1 else a.name
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True, export_skins=True,
                          export_image_format='WEBP')
print('gerado', out)
