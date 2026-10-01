// Tentáculo/cauda procedural: UMA SkinnedMesh (cilindro afunilado + ventosas fundidas na mesma geometria, cores por
// vértice) com uma cadeia de ossos. A pose vem de uma CURVA: setPoints(pontos) ajusta cada osso para seguir os pontos
// (direção = próximo ponto; "cima" = lado das ventosas vira para `up`). Um draw call por tentáculo, nada é recriado.
// Usado pelo Polvão (tentáculos), pelo Jacaré (cauda) e pelo T-Rex (cauda).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _d = new THREE.Vector3(), _z = new THREE.Vector3(), _x = new THREE.Vector3(), _m = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _acc = new THREE.Quaternion(), _inv = new THREE.Quaternion();
const _c = new THREE.Color(), _ca = new THREE.Color(), _cb = new THREE.Color();

export class Tentacle {
  constructor({
    length = 4, radius = 0.28, tipRadius = 0.035, segments = 10, radial = 12,
    color = 0x7a4fd6, under = 0xa98ae8, sucker = 0xf6dcff, suckerDark = 0xb27ad6, suckers = true,
    roughness = 0.5, metalness = 0,
  } = {}) {
    this.n = segments; this.length = length; this.segLen = length / segments;
    const geos = [];
    const cyl = new THREE.CylinderGeometry(tipRadius, radius, length, radial, segments * 3, false);
    cyl.translate(0, length / 2, 0);
    paint(cyl, (p, nrm) => _c.copy(_ca.setHex(color)).lerp(_cb.setHex(under), smooth((nrm.z + 1) / 2) * 0.85));
    geos.push(cyl);
    if (suckers) {
      const step = Math.max(0.22, length / 14);
      let row = 0;
      for (let y = step * 0.9; y < length - step * 0.4; y += step, row++) {
        const r = radius + (tipRadius - radius) * (y / length);
        const sr = Math.max(0.035, r * 0.42);
        for (const sx of (r > 0.1 ? [-1, 1] : [row % 2 ? -1 : 1])) {
          const s = new THREE.SphereGeometry(sr, 8, 6);
          s.scale(1, 1, 0.5);
          s.translate(sx * r * 0.42, y, r * 0.9);
          paint(s, (p, nrm) => _c.copy(_ca.setHex(sucker)).lerp(_cb.setHex(suckerDark), Math.pow(Math.max(0, nrm.z), 3)));
          geos.push(s);
        }
      }
    }
    const geo = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    // pesos de pele por altura: entre o osso i e o i+1
    const pos = geo.attributes.position, cnt = pos.count;
    const si = new Uint16Array(cnt * 4), sw = new Float32Array(cnt * 4);
    for (let i = 0; i < cnt; i++) {
      const t = pos.getY(i) / this.segLen;
      const i0 = Math.max(0, Math.min(this.n, Math.floor(t))), i1 = Math.min(this.n, i0 + 1);
      const w1 = Math.max(0, Math.min(1, t - i0));
      si[i * 4] = i0; si[i * 4 + 1] = i1; sw[i * 4] = 1 - w1; sw[i * 4 + 1] = w1;
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));

    this.bones = [];
    for (let k = 0; k <= this.n; k++) {
      const b = new THREE.Bone();
      b.position.y = k === 0 ? 0 : this.segLen;
      if (k) this.bones[k - 1].add(b);
      this.bones.push(b);
    }
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness });
    this.mesh = new THREE.SkinnedMesh(geo, this.material);
    this.mesh.castShadow = true; this.mesh.frustumCulled = false;
    this.mesh.add(this.bones[0]);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(this.bones), new THREE.Matrix4());
    this.pts = Array.from({ length: this.n + 1 }, () => new THREE.Vector3());
  }

  get object() { return this.mesh; }
  get tip() { return this.bones[this.n]; }

  // pontos (n+1, no espaço do pai da mesh) → ossos. up = para onde as ventosas viram (padrão: câmera)
  setPoints(pts, up = UP_Z) {
    const b = this.bones, n = this.n;
    b[0].position.copy(pts[0]);
    _acc.identity();
    for (let k = 0; k < n; k++) {
      _d.subVectors(pts[k + 1], pts[k]);
      const len = _d.length() || 1e-4;
      _d.divideScalar(len);
      _z.copy(up).addScaledVector(_d, -up.dot(_d));
      if (_z.lengthSq() < 1e-4) _z.set(0, 1, 0).addScaledVector(_d, -_d.y);
      _z.normalize();
      _x.crossVectors(_d, _z);
      _m.makeBasis(_x, _d, _z);
      _q.setFromRotationMatrix(_m);         // orientação absoluta do osso k
      _inv.copy(_acc).invert();
      b[k].quaternion.copy(_inv.multiply(_q)); // local = inv(pai) * absoluta
      _acc.copy(_q);
      b[k + 1].position.y = len;
    }
    b[n].quaternion.identity();
  }

  // amostra uma curva (CatmullRom) em n+1 pontos igualmente espaçados e aplica
  setCurve(curve, up) {
    const s = curve.getSpacedPoints(this.n);
    for (let i = 0; i <= this.n; i++) this.pts[i].copy(s[i]);
    this.setPoints(this.pts, up);
    return this.pts;
  }

  dispose() { this.mesh.geometry.dispose(); this.material.dispose(); }
}

const UP_Z = new THREE.Vector3(0, 0, 1);
const smooth = (x) => x * x * (3 - 2 * x);
function paint(geo, fn) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal, cnt = pos.count;
  const col = new Float32Array(cnt * 3);
  const p = new THREE.Vector3(), nv = new THREE.Vector3();
  for (let i = 0; i < cnt; i++) {
    p.fromBufferAttribute(pos, i); nv.fromBufferAttribute(nrm, i);
    const c = fn(p, nv);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// utilitários de curva: lerp entre dois conjuntos de pontos (mesmo tamanho)
export function lerpPoints(out, a, b, k) {
  for (let i = 0; i < out.length; i++) out[i].lerpVectors(a[i], b[i], k);
  return out;
}
