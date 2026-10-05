// Corpo esculpido no Meshy (GLB estático, sem rig) para as ultimates procedurais.
// Carrega por cima do boneco procedural: enquanto baixa (ou se o arquivo não existe) o procedural segue em cena;
// quando chega, as partes procedurais somem e o GLB entra no lugar. A animação vem do grupo (avanço, giro, rolo,
// inclinação) + "borracha" (respira, encolhe/estica no bote) aplicada em pose().
import * as THREE from 'three';
import { loadGLTF } from '../models/GLBModel.js';

export class MeshyBody {
  // parent: grupo do boneco (+X = frente) · height: altura final em unidades do parent
  // yaw: giro do arquivo para a frente dele ficar em +Z (Meshy já sai assim)
  constructor(parent, url, { height, yaw = 0, onReady } = {}) {
    this.group = new THREE.Group(); this.group.visible = false; parent.add(this.group);
    this.inner = new THREE.Group(); this.group.add(this.inner);
    this.ready = false;
    loadGLTF(url).then((g) => {
      const obj = g.scene.clone(true);
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); } });
      obj.rotation.y = yaw;
      const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
      const s = height / size.y;
      obj.scale.setScalar(s);
      const c = box.getCenter(new THREE.Vector3());
      obj.position.set(-c.x * s, -box.min.y * s, -c.z * s); // pé no chão, centrado no pivô
      this.inner.add(obj);
      this.group.visible = true; this.ready = true;
      onReady?.(this);
    }).catch(() => {});
  }

  // lean: inclina para frente (+) · squash: <0 amassa, >0 estica · pivô no pé
  // turn: ¾ de frente para a câmera (0 = perfil puro); facing compensa o giro de 180° do pai quando olha para a esquerda
  pose({ lean = 0, squash = 0, x = 0, y = 0, facing = 1, turn = 0.55 } = {}) {
    this.group.rotation.z = -lean;
    const sy = 1 + squash, sxz = 1 / Math.sqrt(Math.max(0.2, sy));
    this.group.scale.set(sxz, sy, sxz);
    this.group.position.set(x, y, 0);
    this.inner.rotation.y = Math.PI / 2 - facing * turn;
  }
}
