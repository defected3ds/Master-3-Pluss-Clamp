import * as THREE from 'three';

// The supplied asset lies in X/Z. Move the jaw center to the origin,
// turn the opening toward +X, and align the jaw flats with the hex nut.
export function prepareWrench(source){
  source.updateMatrixWorld(true);
  const model=new THREE.Group(),angle=THREE.MathUtils.degToRad(22),c=Math.cos(angle),s=Math.sin(angle),scale=.60;
  const basis=new THREE.Matrix4().set(-c,0,s,0,-s,0,-c,0,0,-1,0,0,0,0,0,1);
  const transform=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(basis).multiply(new THREE.Matrix4().makeTranslation(12.6,0,-.62));
  source.traverse(n=>{
    if(!n.isMesh)return;
    const geometry=n.geometry.clone().applyMatrix4(n.matrixWorld).applyMatrix4(transform).translate(-.10,-.23,0);
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const material=new THREE.MeshStandardMaterial({color:n.name==='Object_5'?0x929ca5:0xbac2ca,metalness:.88,roughness:n.name==='Object_5'?.33:.25,envMapIntensity:1.1});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=n.name;model.add(mesh);
  });
  model.userData.label='Adjustable wrench';
  return model;
}
