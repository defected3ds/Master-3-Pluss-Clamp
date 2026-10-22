import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {prepareRatchet} from './ratchet-model.js?v=1';
import {InstallationHotspots} from './installation-hotspots.js?v=19';
import {AssemblyHardware,stages,timing,ease,explodedOffset,partOffset} from './assembly.js?v=19';
const $=id=>document.getElementById(id), state={config:'double',mode:'explore',amount:0,target:0,playing:false,wall:true,pipe:true,inspect:false,tools:true,speed:2,autofit:true,follow:true,iso:true,hotspots:true};
const descriptions={double:['Acoustic double clamp','A specially designed rubber connection transfers vibrations from the upper to the lower clamp. A guiding rib keeps the lower clamp separate from the pipe.'],single:['Acoustic single clamp','The rubber inlay helps absorb structure-borne sound at the connection between the pipe and building. The lightweight PA plastic shell is corrosion resistant.'],loose:['Loose clamp','A loose clamp guides the pipe while allowing movement. Its inlay and connection differ from the acoustic single clamp. Follow the detail shown on page 5 of the assembly instructions.']};
const steps=Object.fromEntries(Object.entries(stages).map(([key,rows])=>[key,rows.map(r=>[r[1],r[2]])]));
const host=$('canvas');let renderer,webgl=true;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){webgl=false;renderer={domElement:document.createElement('canvas'),setPixelRatio(){},setClearColor(){},setSize(){},render(){}};const fallback=document.createElement('img');fallback.id='fallback';fallback.alt='Clamp reference illustration';host.appendChild(fallback);$('loading').textContent='Reference view · WebGL is unavailable in this browser';$('loading').classList.add('fallback-notice');['reset','projection','pipe','tools','follow','labels','wall'].forEach(id=>$(id).disabled=true);}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;host.appendChild(renderer.domElement);
const scene=new THREE.Scene(),perspectiveCamera=new THREE.PerspectiveCamera(35,1,.5,1000),isoCamera=new THREE.OrthographicCamera(-20,20,20,-20,.5,1000);
let camera=isoCamera;
const controls=new OrbitControls(camera,renderer.domElement);controls.minZoom=.3;controls.maxZoom=6;controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=18;controls.maxDistance=260;controls.maxPolarAngle=Math.PI*.92;
if(webgl){const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;}
scene.add(new THREE.HemisphereLight(0xffffff,0x566777,1.1));const key=new THREE.DirectionalLight(0xffffff,2.8);key.position.set(-12,25,20);scene.add(key);const rim=new THREE.DirectionalLight(0xc8e0ff,1.5);rim.position.set(20,10,-15);scene.add(rim);
const rig=new THREE.Group();scene.add(rig);let parts=[],allLoaded=false;const originalMaterials=new Map();
const pipeMaterial=new THREE.MeshPhysicalMaterial({color:0x080b10,roughness:.14,metalness:.06,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.4,side:THREE.DoubleSide});
// Hollow pipe with real wall thickness and open ends.
const profile=[new THREE.Vector2(5.20,-16),new THREE.Vector2(5.50,-16),new THREE.Vector2(5.50,16),new THREE.Vector2(5.20,16),new THREE.Vector2(5.20,-16)];
const pipe=new THREE.Mesh(new THREE.LatheGeometry(profile,128),pipeMaterial);rig.add(pipe);pipe.userData.label='Glossy black pipe · DN110';
const hardware=new AssemblyHardware(rig);
const wall=new THREE.Mesh(new THREE.BoxGeometry(30,40,9),new THREE.MeshStandardMaterial({color:0xe4e5e7,roughness:1}));
wall.position.set(0,0,-12.9);wall.userData.label='Wall (illustrative)';rig.add(wall);

new GLTFLoader().load('./assets/ratchet-wrench.glb',g=>{
  const model=prepareRatchet(g.scene);
  for(const child of [...hardware.socket.children]){hardware.socket.remove(child);child.traverse(n=>{if(n.isMesh)n.geometry.dispose();});}
  hardware.socket.add(model);hardware.socket.userData.socketPart=model.userData.socketPart;
  hardware.socket.userData.tipOffset=.32;hardware.socket.userData.label='Ratchet wrench and removable socket';
},undefined,error=>console.warn('The supplied ratchet could not load; using the fallback.',error));
const installationLabels=new InstallationHotspots(host,()=>{state.playing=false;state.target=state.amount;updateTimeline();});
function visibleBounds(){
  const box=new THREE.Box3();
  // Frame the complete visible assembly in both Explore and Installation.
  for(const n of [...parts,...hardware.inspectables])if(n.visible&&!n.userData.parked)box.union(new THREE.Box3().setFromObject(n));
  if(pipe.visible)box.union(new THREE.Box3().setFromObject(pipe));
  return box;
}
function fitCamera(instant=false,dt=.016){
  const box=visibleBounds();if(box.isEmpty())return;
  const activeTool=state.mode==='install'&&state.follow?(hardware.socket.visible?hardware.socket:hardware.spanner.visible?hardware.spanner:null):null;
  const mountingFocus=state.mode==='install'&&state.amount<timing(state.config).rear[0];
  if(mountingFocus){box.makeEmpty();for(const n of parts)if(n.visible)box.union(new THREE.Box3().setFromObject(n));box.union(new THREE.Box3().setFromObject(hardware.rod));box.expandByScalar(2);}
  if(activeTool){box.setFromObject(activeTool);box.expandByScalar(1.8);}
  const center=box.getCenter(new THREE.Vector3()),aspect=host.clientWidth/Math.max(host.clientHeight,1);
  const alpha=instant?1:1-Math.exp(-8*dt);
  const direction=camera.position.clone().sub(controls.target).normalize();
  if(state.iso)direction.copy(new THREE.Vector3(1,1,1).normalize());
  else if(state.mode==='install'&&state.follow){
    const desired=mountingFocus?new THREE.Vector3(1,.35,.65):activeTool===hardware.spanner?new THREE.Vector3(-.8,.35,-1):new THREE.Vector3(.55,.35,1);
    direction.lerp(desired.normalize(),1-Math.exp(-5*dt)).normalize();
  }
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
  const up=new THREE.Vector3().crossVectors(direction,right).normalize();
  let halfWidth=0,halfHeight=0,distance=0;
  const tanY=Math.tan(THREE.MathUtils.degToRad(35/2)),tanX=tanY*aspect;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const p=new THREE.Vector3(x,y,z).sub(center),px=Math.abs(p.dot(right)),py=Math.abs(p.dot(up)),pz=p.dot(direction);
    halfWidth=Math.max(halfWidth,px);halfHeight=Math.max(halfHeight,py);
    distance=Math.max(distance,pz+Math.max(px/tanX,py/tanY)*1.16);
  }
  controls.target.lerp(center,alpha);
  if(state.iso){
    const half=Math.max(halfHeight,halfWidth/aspect)*1.16;
    const current=(camera.top-camera.bottom)/2;
    const span=THREE.MathUtils.lerp(current,Math.max(half,3),alpha);
    camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;
    camera.zoom=1;camera.updateProjectionMatrix();
    camera.position.copy(controls.target).addScaledVector(direction,180);
  }else{
    const current=camera.position.distanceTo(controls.target);
    camera.position.copy(controls.target).addScaledVector(direction,THREE.MathUtils.lerp(current,Math.max(distance,activeTool?20:27),alpha));
  }
}
function resetCamera(){camera.position.copy(state.iso?new THREE.Vector3(1,1,1).multiplyScalar(100):new THREE.Vector3(23,11,42));controls.target.set(0,0,0);fitCamera(true);state.autofit=true;controls.update();}
controls.addEventListener('start',()=>state.autofit=false);
resetCamera();
new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);if(camera.isPerspectiveCamera)camera.aspect=w/h;else{const half=camera.top;camera.left=-half*w/h;camera.right=half*w/h;}camera.updateProjectionMatrix();}).observe(host);
new GLTFLoader().load('./assets/clamp.glb',g=>{
  g.scene.traverse(n=>{
    if(!n.isMesh)return;
    const data=n.userData;n.userData={...data,base:n.position.clone()};
    originalMaterials.set(n,n.material);n.material.envMapIntensity=1.05;
    if(data.kind==='front'||data.kind==='rear'){n.material.color.set(0x181818);n.material.roughness=.38;n.material.metalness=0;n.material.envMapIntensity=.85;}
    if(data.kind==='rubber'||data.kind==='inlay'){n.material.color.set(0x101010);n.material.roughness=.64;n.material.metalness=0;n.material.envMapIntensity=.65;}
    if(data.kind==='stripe'){n.material.color.set(0x003088);n.material.roughness=.46;n.material.metalness=0;n.userData.label='Blue identification marking';}
    parts.push(n);
  });
  rig.add(g.scene);allLoaded=true;
  if(webgl)$('loading').hidden=true;
  applyConfig();
},undefined,e=>{$('loading').textContent='The model could not load. Refresh to retry, or use the assembly PDF.';console.error(e);});
function activePart(n){return state.config==='double'||(state.config==='single'?n.userData.upper:!n.userData.upper);}
function updateFallback(){if(!webgl){$('fallback').src=state.mode==='install'?`assets/instructions-${state.config==='double'?(state.amount>.9?3:2):state.config==='single'?4:5}.webp`:`assets/${state.config}.webp`;}}
function applyConfig(){updateFallback();parts.forEach(n=>n.visible=activePart(n));document.querySelectorAll('.config').forEach(n=>(n.classList.toggle('active',n.dataset.config===state.config),n.setAttribute('aria-pressed',String(n.dataset.config===state.config))));$('config-label').textContent=descriptions[state.config][0].toUpperCase();$('part-label').style.display='none';state.playing=false;state.autofit=true;state.amount=state.target=0;updateText();updatePositions();resetCamera();}
function updateText(){const isInstall=state.mode==='install';if(!webgl){['explode','play','previous','next','progress'].forEach(id=>$(id).disabled=!isInstall);document.querySelector('.model-note').textContent='Reference illustrations · 3D requires WebGL';}$('explore').classList.toggle('active',!isInstall);$('install').classList.toggle('active',isInstall);$('explore').setAttribute('aria-pressed',String(!isInstall));$('install').setAttribute('aria-pressed',String(isInstall));$('explode').textContent=isInstall?'Restart':state.target>.5?'Assemble':'Explode view';$('stage-heading').textContent=isInstall?'Step-by-step installation':'Interactive 3D explorer';$('timeline-label').textContent=isInstall?'GUIDED INSTALLATION':'ASSEMBLY EXPLORER';$('start-label').textContent=isInstall?'Prepare':'Assembled';$('end-label').textContent=isInstall?'Complete':'Exploded';{const s=steps[state.config];$('step-list').innerHTML=s.map((x,i)=>`<button class="step" data-step="${i}"><span>0${i+1}</span>${x[0]}</button>`).join('');$('step-list').querySelectorAll('button').forEach(b=>b.onclick=()=>{const index=+b.dataset.step;if(state.mode!=='install')mode('install');state.target=stages[state.config][index][0];state.playing=false;state.autofit=true;});}updateTimeline();}
function updateTimeline(){updateFallback();const install=state.mode==='install';$('progress').value=Math.round(state.amount*1000);$('percent').value=Math.round(state.amount*100)+'%';$('play').dataset.playing=String(state.playing);$('play').setAttribute('aria-label',state.playing?'Pause animation':'Play animation');if(install){const s=steps[state.config],i=Math.max(0,stages[state.config].findLastIndex(row=>state.amount>=row[0]-.001));$('timeline-title').textContent=`${i+1} / ${s.length} · ${s[i][0]}`;$('step-list').querySelectorAll('button').forEach(b=>b.classList.toggle('active',+b.dataset.step===i));}else {$('timeline-title').textContent=state.amount<.01?'Assembled':state.amount>.99?'Exploded view':'Exploring the components';$('step-list').querySelectorAll('button').forEach(b=>b.classList.remove('active'));}}
function updatePositions(){
  const tm=timing(state.config),installing=state.mode==='install';
  const pipeStart=tm.rear[0],pipeEnd=tm.rear[1];
  parts.forEach(n=>{
    const u=n.userData;
    n.visible=activePart(n)&&(!installing||((!u.front||state.amount>=pipeEnd)&&(!(state.config==='double'&&u.upper)||state.amount>=tm.upper[0])));
    if(n.visible)n.position.copy(u.base).add(partOffset(u,state));
  });
  hardware.update(state);pipe.visible=state.pipe&&(!installing||state.amount>=pipeStart);
  pipe.position.z=installing?14*(1-ease(pipeStart,pipeEnd,state.amount)):0;
  wall.visible=state.wall;wall.position.z=state.mode==='explore'?-12.9-55*ease(0,1,state.amount):-12.9;
  $('assembly-note').hidden=state.mode!=='install';
  $('hotspots').hidden=state.mode!=='install';$('hotspots').disabled=!webgl;
}

function mode(m){state.mode=m;state.playing=false;state.autofit=true;state.amount=state.target=0;$('part-label').style.display='none';updateText();updatePositions();resetCamera();}
$('explore').onclick=()=>mode('explore');$('install').onclick=()=>mode('install');document.querySelectorAll('.config').forEach(b=>b.onclick=()=>{state.config=b.dataset.config;applyConfig();});$('reset').onclick=resetCamera;
$('pipe').onclick=()=>{state.pipe=!state.pipe;$('pipe').setAttribute('aria-pressed',state.pipe);$('pipe').querySelector('span').textContent=`${state.pipe?'Hide':'Show'} pipe`;};$('labels').onclick=()=>{state.inspect=!state.inspect;$('labels').setAttribute('aria-pressed',state.inspect);$('part-label').textContent='Click a component to identify it.';$('part-label').style.display=state.inspect?'block':'none';};
$('explode').onclick=()=>{state.playing=false;state.autofit=true;state.target=state.mode==='install'?0:state.target>.5?0:1;updateText();};$('progress').oninput=e=>{state.playing=false;state.autofit=true;state.amount=state.target=+e.target.value/1000;};$('play').onclick=()=>{state.autofit=true;if(state.amount>.999)state.amount=state.target=0;state.playing=!state.playing;};function step(d){state.playing=false;if(state.mode==='install'){const rows=stages[state.config];state.target=d>0?(rows.find(r=>r[0]>state.target+.002)?.[0]??1):([...rows].reverse().find(r=>r[0]<state.target-.002)?.[0]??0);}else state.target=THREE.MathUtils.clamp((Math.round(state.target*4)+d)/4,0,1);} $('next').onclick=()=>step(1);$('previous').onclick=()=>step(-1);
$('fullscreen').onclick=async()=>{
 const stage=$('stage');
 if(document.fullscreenElement){await document.exitFullscreen();return;}
 if(stage.classList.contains('expanded-view')){stage.classList.remove('expanded-view');document.body.classList.remove('viewer-expanded');$('fullscreen').setAttribute('aria-label','Fullscreen');return;}
 try{if(!stage.requestFullscreen)throw new Error('Fallback');await stage.requestFullscreen();}catch{stage.classList.add('expanded-view');document.body.classList.add('viewer-expanded');}
 $('fullscreen').setAttribute('aria-label','Exit fullscreen');
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('stage').classList.remove('expanded-view');document.body.classList.remove('viewer-expanded');}});
$('wall').onclick=()=>{state.wall=!state.wall;$('wall').setAttribute('aria-pressed',state.wall);$('wall').querySelector('span').textContent=state.wall?'Hide wall':'Show wall';};

let down;renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);renderer.domElement.addEventListener('pointerup',e=>{if(!state.inspect||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects([...parts.filter(n=>n.visible),...hardware.inspectables.filter(n=>n.visible),...(pipe.visible?[pipe]:[])],true)[0];if(hit){let picked=hit.object;while(!picked.userData.label&&picked.parent)picked=picked.parent;$('part-label').textContent=picked.userData.label||'Assembly component';$('part-label').style.display='block';}});
$('tools').onclick=()=>{state.tools=!state.tools;$('tools').setAttribute('aria-pressed',state.tools);$('tools').querySelector('span').textContent=`${state.tools?'Hide':'Show'} tools`;};
$('hotspots').onclick=()=>{state.hotspots=!state.hotspots;$('hotspots').setAttribute('aria-pressed',state.hotspots);$('hotspots').textContent=state.hotspots?'Hotspots on':'Hotspots off';};

$('projection').onclick=()=>{state.iso=!state.iso;const position=camera.position.clone();camera=state.iso?isoCamera:perspectiveCamera;camera.position.copy(position);controls.object=camera;controls.minZoom=.3;controls.maxZoom=6;state.autofit=true;resetCamera();$('projection').setAttribute('aria-pressed',state.iso);$('projection').querySelector('span').textContent=`${state.iso?'Isometric':'Perspective'}`;};
$('follow').onclick=()=>{state.follow=!state.follow;state.autofit=true;$('follow').setAttribute('aria-pressed',state.follow);};

let hintTimer;
renderer.domElement.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey){e.stopImmediatePropagation();$('zoom-hint').hidden=false;clearTimeout(hintTimer);hintTimer=setTimeout(()=>$('zoom-hint').hidden=true,1800);}}, {capture:true,passive:true});
const touch=matchMedia('(pointer:coarse)').matches;
function activateViewer(active){if(!touch)return;controls.enabled=active;renderer.domElement.style.touchAction=active?'none':'pan-y';$('touch-activate').hidden=active;$('touch-exit').hidden=!active;}
activateViewer(false);$('touch-activate').onclick=()=>activateViewer(true);$('touch-exit').onclick=()=>activateViewer(false);
document.addEventListener('pointerdown',e=>{if(!host.contains(e.target)&&!$('touch-activate').contains(e.target))activateViewer(false);});
let prev=performance.now();function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-prev)/1000,.05);prev=now;if(state.playing){state.target=state.amount=Math.min(1,state.amount+dt*state.speed/(state.mode==='install'?(state.config==='double'?55:40):10));if(state.amount>=1)state.playing=false;}else state.amount=THREE.MathUtils.damp(state.amount,state.target,6,dt);if(Math.abs(state.target-state.amount)<.0005)state.amount=state.target;updatePositions();updateTimeline();if(state.autofit)fitCamera(false,dt);controls.update();installationLabels.update(state,parts,hardware,camera,webgl&&allLoaded);renderer.render(scene,camera);}updateText();requestAnimationFrame(loop);
