# Recorta o busto das referências oficiais (references/<id>/ref_front.png) em quadrado com fundo transparente
# e salva public/assets/characters/<id>/portrait.png (PNG paletizado, <= 150 KB). HUD e seleção usam sozinhos.
# Uso: python tools/portraits.py [tamanho=384]
import sys
from collections import deque
from PIL import Image, ImageFilter

SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 384
# id → (arquivo, fração da altura do corpo que vira o lado do quadrado, deslocamento vertical do topo em fração)
CHARS = {
    'lulacio': ('references/lulacio/ref_punhos_apose.png', 0.36, -0.03),
    'capitao-brasa': ('references/capitao-brasa/ref_front.png', 0.34, -0.02),
    'xandor': ('references/xandor/ref_front.png', 0.34, -0.03),
    'dino-supremo': ('references/dino-supremo/ref_front.png', 0.42, -0.03),
}


def remove_bg(img, tol=26):
    """Flood fill a partir das bordas: tudo que está ligado à borda e perto da cor de fundo vira transparente."""
    img = img.convert('RGB')
    w, h = img.size
    px = img.load()
    # cor de fundo = média dos 4 cantos
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    mask = Image.new('L', (w, h), 255)
    mp = mask.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        r, g, b = px[x, y]
        if max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2])) > tol:
            continue
        mp[x, y] = 0
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = img.convert('RGBA')
    out.putalpha(mask)
    return out, mask


def crop_bust(img, mask, frac, dy):
    w, h = img.size
    bbox = mask.point(lambda v: 255 if v > 128 else 0).getbbox()
    top, bottom = bbox[1], bbox[3]
    body_h = bottom - top
    side = int(body_h * frac)
    # centro horizontal = centro de massa das linhas do topo (cabeça)
    head = mask.crop((0, top, w, top + int(body_h * 0.12)))
    hp = head.load()
    sx = n = 0
    for y in range(head.size[1]):
        for x in range(w):
            if hp[x, y] > 128:
                sx += x; n += 1
    cx = sx // max(1, n)
    y0 = max(0, top + int(body_h * dy))
    x0 = min(max(0, cx - side // 2), w - side)
    return img.crop((x0, y0, x0 + side, y0 + side))


for cid, (path, frac, dy) in CHARS.items():
    img = Image.open(path)
    rgba, mask = remove_bg(img)
    bust = crop_bust(rgba, mask, frac, dy).resize((SIZE, SIZE), Image.LANCZOS)
    out = f'public/assets/characters/{cid}/portrait.png'
    bust.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(out, optimize=True)
    import os
    print(cid, bust.size, f'{os.path.getsize(out) // 1024} KB')
