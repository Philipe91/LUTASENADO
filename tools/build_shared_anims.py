# Caminho B (Mixamo): junta as animações FBX em um único shared.glb.
# Uso: blender -b -P tools/build_shared_anims.py
# Entrada: public/assets/animations/fbx/<chave>.fbx  (ex.: idle.fbx, punch1.fbx, kick.fbx)
#          baixados do Mixamo "without skin", "in place", todos do MESMO personagem.
# Saída:   public/assets/animations/shared.glb  (cada clip nomeado exatamente com a chave)
import bpy, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'public', 'assets', 'animations', 'fbx')
OUT = os.path.join(ROOT, 'public', 'assets', 'animations', 'shared.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
files = sorted(f for f in os.listdir(SRC) if f.lower().endswith('.fbx'))
if not files:
    sys.exit('nenhum .fbx em ' + SRC)

base_arm = None
for f in files:
    key = os.path.splitext(f)[0]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, f), automatic_bone_orientation=False)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next((o for o in new if o.type == 'ARMATURE'), None)
    if not arm or not arm.animation_data or not arm.animation_data.action:
        print('sem animação:', f)
        continue
    action = arm.animation_data.action
    action.name = key
    action.use_fake_user = True
    if base_arm is None:
        base_arm = arm
        base_arm.animation_data.action = None
    else:
        for o in new:
            bpy.data.objects.remove(o, do_unlink=True)
    track = base_arm.animation_data.nla_tracks.new()
    track.name = key
    track.strips.new(key, int(action.frame_range[0]), action)
    track.mute = True
    print('ok', key)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_skins=True, use_selection=False)
print('gerado', OUT)
