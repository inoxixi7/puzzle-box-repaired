import * as THREE from "three";

export type BoxMaterials = {
  wood: THREE.MeshStandardMaterial;
  woodInset: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  brassDark: THREE.MeshStandardMaterial;
};

export function createBoxMaterials(): BoxMaterials {
  return {
    wood: new THREE.MeshStandardMaterial({
      color: 0x6a4327,
      roughness: 0.78,
      metalness: 0.03,
    }),

    woodInset: new THREE.MeshStandardMaterial({
      color: 0x54341f,
      roughness: 0.82,
      metalness: 0.02,
    }),

    woodDark: new THREE.MeshStandardMaterial({
      color: 0x2a1b13,
      roughness: 0.88,
      metalness: 0.01,
    }),

    brass: new THREE.MeshStandardMaterial({
      color: 0xb58a4b,
      roughness: 0.34,
      metalness: 0.72,
    }),

    brassDark: new THREE.MeshStandardMaterial({
      color: 0x6d4e29,
      roughness: 0.4,
      metalness: 0.62,
    }),
  };
}
