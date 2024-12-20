import * as THREE from "three";

export class Planet {
  constructor({ name, radius, texture, distanceFromCenter, rotationSpeed }) {
    this.name = name;
    this.radius = radius;
    this.texture = texture;
    this.distanceFromCenter = distanceFromCenter;
    this.rotationSpeed = rotationSpeed;

    // Cria a geometria e a textura
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load(this.texture),
    });

    // Mesh do planeta
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.x = this.distanceFromCenter;
  }

  // Atualizar rotação
  update() {
    this.mesh.rotation.y += this.rotationSpeed;
  }
}
