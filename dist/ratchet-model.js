import * as THREE from 'three';

export function prepareRatchet(source){
  source.updateMatrixWorld(true);
  const root=new THREE.Group(),handle=new THREE.Group(),socket=new THREE.Group();
  root.add(handle,socket);const scale=50;
  source.traverse(n=>{
    if(!n.isMesh)return;
    const isSocket=n.name==='Removable_Socket'||n.userData.part==='Removable_Socket';
    const geometry=n.geometry.clone().applyMatrix4(n.matrixWorld);
    // The file places its removable socket beside the ratchet for inspection.
    if(isSocket)geometry.translate(-.06,0,0);
    geometry.rotateY(Math.PI).scale(scale,scale,scale);
    geometry.translate(0,0,isSocket?.034*scale:.034*scale+.78);
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,n.material.clone());mesh.name=n.name;(isSocket?socket:handle).add(mesh);
  });
  root.userData.socketPart=socket;root.userData.handlePart=handle;
  root.userData.label='Ratchet wrench and removable socket';
  return root;
}
