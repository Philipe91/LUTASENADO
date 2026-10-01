// "Look" do jogo (ver ARTE.md §3): luz de recorte, sombras suaves, cena em HDR → bloom barato (1/4 da
// resolução) → passe final com tone mapping (ACES ou AgX), exposição, grading leve e vinheta.
// Desliga tudo com ?look=0. Testes: ?tm=agx · ?bloom=0 · ?msaa=0|2|4 · ?exp=1.1 · ?stats=1 (mostra o custo).
// Não mexe em arena/câmera: entra por cima do stage.render e adiciona luzes próprias na cena.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// extrai só o que passa de branco (threshold com joelho suave), já em 1/4 da resolução
const BRIGHT = /* glsl */`
  uniform sampler2D tSrc; uniform vec2 texel; uniform float threshold; uniform float knee;
  varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tSrc, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + texel * vec2(1.0, -1.0)).rgb
           + texture2D(tSrc, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + texel * vec2(1.0, 1.0)).rgb;
    c *= 0.25;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float k = smoothstep(threshold - knee, threshold + knee, l);
    gl_FragColor = vec4(c * k, 1.0);
  }`;

// gaussiano separável de 9 taps em 5 leituras (amostragem linear)
const BLUR = /* glsl */`
  uniform sampler2D tSrc; uniform vec2 dir;
  varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tSrc, vUv).rgb * 0.2270;
    c += (texture2D(tSrc, vUv + dir * 1.3846).rgb + texture2D(tSrc, vUv - dir * 1.3846).rgb) * 0.3162;
    c += (texture2D(tSrc, vUv + dir * 3.2308).rgb + texture2D(tSrc, vUv - dir * 3.2308).rgb) * 0.0703;
    gl_FragColor = vec4(c, 1.0);
  }`;

// passe final: cena HDR + bloom → tone mapping do renderer (ACES/AgX, chunk do three) → grading → vinheta → sRGB
const FINAL = /* glsl */`
  uniform sampler2D tScene; uniform sampler2D tBloom; uniform float bloomStrength;
  uniform float contrast; uniform float saturation; uniform vec3 lift; uniform vec3 gain;
  uniform float vignette; uniform vec3 vignetteColor; uniform float aspect;
  varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * bloomStrength;
    #ifdef TONE_MAPPING
      c = toneMapping(c);
    #endif
    // grading num espaço ~perceptual (gamma 2.2), em cima do resultado já mapeado
    vec3 g = pow(max(c, 0.0), vec3(1.0 / 2.2));
    g = (g - 0.5) * contrast + 0.5;
    float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
    g = mix(vec3(l), g, saturation);
    g = g * gain + lift * (1.0 - l);          // sombras ganham o lift, altas luzes o gain
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
    float d = length(p) / length(vec2(aspect, 1.0) * 0.5);
    float v = smoothstep(0.45, 1.15, d) * vignette;
    g = mix(g, vignetteColor, v);
    gl_FragColor = vec4(pow(clamp(g, 0.0, 1.0), vec3(2.2)), 1.0);
    #include <colorspace_fragment>
  }`;

export class Look {
  constructor(stage, params = new URLSearchParams()) {
    this.stage = stage;
    this.enabled = params.get('look') !== '0';
    this.label = this.enabled ? 'look on' : 'look off';
    if (!this.enabled) return;
    const r = stage.renderer;
    this.renderer = r;
    this.mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 500;

    // tone mapping + exposição (o passe final usa o chunk do three, então respeita renderer.toneMapping)
    r.toneMapping = params.get('tm') === 'agx' ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = Number(params.get('exp') || 0.95);
    r.info.autoReset = false; // o ?stats=1 soma todos os passes, não só o último

    // sombras suaves: VSM com blur (barato: o blur é na resolução do shadow map)
    r.shadowMap.type = THREE.VSMShadowMap;
    stage.scene.traverse((o) => {
      if (o.isDirectionalLight && o.castShadow) {
        o.shadow.mapSize.setScalar(this.mobile ? 1024 : 2048);
        o.shadow.radius = 5; o.shadow.blurSamples = 8; o.shadow.bias = -0.0002;
        if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
      }
    });

    // luz de recorte (rim) por trás/direita + preenchimento frio da frente/direita (ARTE.md §3)
    // (intensidade contida: luz direcional também cai no chão claro; o recorte forte vem do fresnel abaixo)
    const rim = new THREE.DirectionalLight(0xfff0d8, 1.4);
    rim.position.set(6, 5, -7);
    const fill = new THREE.DirectionalLight(0x9fb8ff, 0.3);
    fill.position.set(7, 3, 9);
    this.lights = new THREE.Group();
    this.lights.name = 'look-lights';
    this.lights.add(rim, fill);
    stage.scene.add(this.lights);

    // alvos de render
    this.bloomOn = params.get('bloom') !== '0';
    const msaa = params.has('msaa') ? Number(params.get('msaa')) : this.mobile ? 2 : 4;
    this.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: msaa, depthBuffer: true, stencilBuffer: false });
    this.rt.texture.name = 'look-scene';
    const small = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.bA = small(); this.bB = small();

    const mat = (frag, uniforms, toneMapped = false) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped });
    this.bright = mat(BRIGHT, { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 1.1 }, knee: { value: 0.3 } });
    this.blur = mat(BLUR, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
    this.final = mat(FINAL, {
      tScene: { value: this.rt.texture }, tBloom: { value: this.bA.texture }, bloomStrength: { value: this.bloomOn ? 0.45 : 0 },
      contrast: { value: 1.05 }, saturation: { value: 1.12 },
      lift: { value: new THREE.Vector3(0.035, 0.015, 0.05) },   // sombras levemente roxas
      gain: { value: new THREE.Vector3(1.0, 0.985, 0.955) },    // altas luzes levemente quentes
      vignette: { value: 0.42 }, vignetteColor: { value: new THREE.Vector3(0.09, 0.05, 0.12) }, aspect: { value: 1 },
    }, true);
    this.quad = new FullScreenQuad(this.final);
    this.size = new THREE.Vector2();
    this.ms = 0;
    this.frame = 0;

    // entra por cima do stage.render (Stage.js é do agente de câmera; aqui só o render final)
    stage.look = this;
    stage.render = () => this.render();
    this.label = `look on · ${r.toneMapping === THREE.AgXToneMapping ? 'agx' : 'aces'} · bloom ${this.bloomOn ? '1/4' : 'off'} · msaa ${msaa}`;
  }

  fit() {
    const r = this.renderer, s = r.getDrawingBufferSize(this.size);
    if (this.rt.width === s.x && this.rt.height === s.y) return;
    this.rt.setSize(s.x, s.y);
    const bw = Math.max(2, Math.round(s.x / 4)), bh = Math.max(2, Math.round(s.y / 4));
    this.bA.setSize(bw, bh); this.bB.setSize(bw, bh);
    this.bright.uniforms.texel.value.set(1 / s.x, 1 / s.y);
    this.final.uniforms.aspect.value = s.x / s.y;
    this.bw = bw; this.bh = bh;
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.quad.render(this.renderer);
  }

  // Recorte de brinquedo: fresnel claro na borda dos LUTADORES (skinned = GLB; toon = placeholder), nunca no cenário.
  // Entra por onBeforeCompile, então vale para qualquer material clonado pelo GLBModel.
  rimify(scene) {
    scene.traverse((o) => {
      if (!o.isMesh) return;
      if (!(o.isSkinnedMesh || o.material?.isMeshToonMaterial)) return;
      for (const m of [].concat(o.material)) {
        if (!m || m.userData.rim || !(m.isMeshStandardMaterial || m.isMeshToonMaterial)) continue;
        m.userData.rim = true;
        m.onBeforeCompile = (sh) => {
          sh.uniforms.rimColor = { value: new THREE.Color(0xfff2dc) };
          sh.uniforms.rimStrength = { value: 0.55 };
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 rimColor; uniform float rimStrength;')
            .replace('#include <opaque_fragment>', `
              { float fr = 1.0 - saturate(dot(normalize(vViewPosition), normal));
                fr = pow(fr, 3.0) * (0.55 + 0.45 * saturate(normal.y + 0.3)); // mais forte em cima (ombro, cabeça)
                outgoingLight += rimColor * fr * rimStrength; }
              #include <opaque_fragment>`);
        };
        m.needsUpdate = true;
      }
    });
  }

  render() {
    const t0 = performance.now();
    const r = this.renderer, { scene, camera } = this.stage;
    r.info.reset();
    if (this.frame++ % 20 === 0) this.rimify(scene);
    this.fit();
    r.setRenderTarget(this.rt);
    r.render(scene, camera);
    if (this.bloomOn) {
      this.bright.uniforms.tSrc.value = this.rt.texture;
      this.pass(this.bright, this.bA);
      this.blur.uniforms.tSrc.value = this.bA.texture; this.blur.uniforms.dir.value.set(1 / this.bw, 0);
      this.pass(this.blur, this.bB);
      this.blur.uniforms.tSrc.value = this.bB.texture; this.blur.uniforms.dir.value.set(0, 1 / this.bh);
      this.pass(this.blur, this.bA);
    }
    this.pass(this.final, null);
    const now = performance.now();
    this.ms += (now - t0 - this.ms) * 0.05; // média móvel do custo de CPU do render (GPU é assíncrona)
    // guarda de celular: se o quadro inteiro passa de ~30 ms nos primeiros segundos, derruba o bloom (fica rim+tone+vinheta)
    if (this.mobile && this.bloomOn && this.lastT) {
      this.frameMs = (this.frameMs ?? 16) + (now - this.lastT - (this.frameMs ?? 16)) * 0.05;
      if (this.frame > 120 && this.frame < 400 && this.frameMs > 30) { this.bloomOn = false; this.final.uniforms.bloomStrength.value = 0; this.label += ' → bloom off (fps)'; }
    }
    this.lastT = now;
  }

  // ?stats=1
  get stats() { return this.enabled ? `${this.label} · render ${this.ms.toFixed(1)}ms` : this.label; }

  dispose() {
    if (!this.enabled) return;
    this.stage.scene.remove(this.lights);
    for (const x of [this.rt, this.bA, this.bB, this.bright, this.blur, this.final]) x.dispose();
    this.quad.dispose();
    delete this.stage.render;
  }
}
