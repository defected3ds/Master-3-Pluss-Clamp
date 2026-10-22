import * as THREE from 'three';
import {stages,timing} from './assembly.js?v=19';

// Each installation stage identifies a real object in the animated scene.
export function installationHotspot(state,parts,hardware){
  if(state.mode!=='install')return null;
  const c=state.config,t=state.amount,rows=stages[c],tm=timing(c);
  const step=Math.max(0,rows.findLastIndex(row=>t>=row[0]-.001));
  const select=(kind,upper=c!=='loose',front=true)=>parts.find(n=>n.visible&&n.userData.kind===kind&&n.userData.upper===upper&&(kind==='mount'||n.userData.front===front));
  let object,title,detail,local=new THREE.Vector3(),item='';
  if(t<tm.rear[0]){
    object=select('rear',c==='single',false);title='Mount rear half first';
    detail='Position the wall-side half on the mounting connection and secure it before bringing in the pipe or front half.';
  }else if(t<tm.rear[1]){
    object=select('rear',c==='single',false);title='Insert the pipe';detail='With the rear half mounted to the wall, position the pipe in its inlay before closing the front half.';
  }else if(t>=.96){
    object=select('inlay',c==='single')||select('front');title=c==='loose'?'Pipe clearance':'Final connection';
    detail=c==='loose'?'Preserve the designed clearance so the pipe can move. Check the enlarged detail on page 5 of the assembly PDF.':c==='double'?'Check the connection between both clamps and the lower-clamp clearance. Compare the completed assembly with page 3 of the assembly PDF.':'Check that the acoustic inlay is seated and both click connections are engaged. See page 4 of the assembly PDF.';
  }else if(t>=tm.bolts[0]){
    const tightening=t>=tm.tool[0],range=tightening?tm.tool:tm.bolts;
    const list=hardware.items.filter(o=>o.bolt.visible);
    const index=Math.min(list.length-1,Math.max(0,Math.floor((t-range[0])/(range[1]-range[0])*list.length)));
    object=list[index]?.bolt;local.set(0,0,.62);item=`${index+1}/${list.length}`;
    title=tightening?(c==='loose'?'Seat fastener':'Tighten bolt'):'Insert bolt';
    detail=tightening?'The socket engages the bolt head, turns, then withdraws before moving to the next fastener. The tool movement is illustrative; no tightening torque is specified here.':'Align the bolt with its tab hole and insert it straight through the aligned tabs. The nut meets it from the opposite side.';
  }else if(t>=tm.rear[0]&&t<tm.rear[1]){
    object=select('mount',c==='single');title='Mounting connection';
    detail='Seat the captured mounting nut and rear shell before closing the clamp.';local.z=.3;
  }else if(t>=tm.wall[0]&&t<tm.wall[1]){
    object=hardware.rod;local.set(0,0,-2);title='M10 connection';
    detail='Position the threaded connection behind the clamp. Choose the wall anchoring for the substrate and follow the original assembly instructions.';
  }else if(c==='double'&&t>=tm.upper[0]&&t<tm.upper[1]){
    object=select('rubber',true,true)||select('front',true);title='Acoustic connection';
    detail='Lower the upper clamp onto the rubber connection above the lower clamp. Keep the two assemblies aligned.';
  }else if(t>= (c==='double'?tm.lower[0]:tm.front[0])){
    const upper=c==='single'||(c==='double'&&t>=tm.front[0]);object=select('front',upper);
    title=c==='double'?(upper?'Upper clamp':'Lower clamp'):'Click connections';
    detail=c==='loose'?'Bring the front shell into position and engage both click connections while preserving the designed pipe clearance.':'Bring the front shell around the pipe, keep the inlay seated, and engage both click connections.';
  }else{
    object=select('inlay')||select('front');title=c==='loose'?'Loose-clamp inlay':'Acoustic inlay';
    detail=c==='loose'?'Identify the loose-clamp inlay and mounting connection before assembly. This clamp guides the pipe while allowing movement.':'Identify the inlay, shells and fasteners before assembly. Keep the inlay correctly seated inside the shell.';
  }
  if(c==='loose'&&t>=tm.bolts[0]&&t<.96)detail+=' Preserve the designed pipe clearance; this fastener movement is illustrative.';
  if(!object)return null;
  if(object.isMesh){
    if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();const box=object.geometry.boundingBox;
    box.getCenter(local);local.z=object.userData.front?box.max.z:box.min.z;
  }
  return {object,local,title,detail,item,step:step+1,total:rows.length,key:`${c}:${step}:${title}:${item}`};
}

export class InstallationHotspots{
  constructor(host,onOpen){
    this.host=host;this.onOpen=onOpen;this.open=false;this.key='';
    this.layer=document.createElement('div');this.layer.className='installation-hotspots';this.layer.hidden=true;
    this.layer.innerHTML='<svg class="hotspot-leader" aria-hidden="true"><path/><circle r="12"/><circle class="hotspot-center" r="3"/></svg><div class="hotspot-callout"><button class="hotspot-pill" aria-expanded="false" aria-controls="hotspot-explanation"><span class="hotspot-dot"></span><b></b><span class="hotspot-count"></span><span class="hotspot-step"></span><span class="hotspot-expand" aria-hidden="true">+</span></button><div class="hotspot-explanation" id="hotspot-explanation" hidden><p></p><span>Tap the label to close · Play to continue</span></div></div>';
    host.appendChild(this.layer);this.callout=this.layer.querySelector('.hotspot-callout');this.button=this.layer.querySelector('button');this.panel=this.layer.querySelector('.hotspot-explanation');
    this.button.onclick=()=>{this.open=!this.open;this.setOpen();if(this.open)this.onOpen();};
    this.layer.addEventListener('keydown',e=>{if(e.key==='Escape'){this.open=false;this.setOpen();this.button.focus();}});
    this.point=new THREE.Vector3();this.viewPoint=new THREE.Vector3();
  }
  setOpen(){this.panel.hidden=!this.open;this.button.setAttribute('aria-expanded',String(this.open));this.layer.querySelector('.hotspot-expand').textContent=this.open?'−':'+';}
  update(state,parts,hardware,camera,enabled){
    if(!enabled||!state.hotspots||state.mode!=='install'){this.layer.hidden=true;return;}
    const data=installationHotspot(state,parts,hardware);if(!data){this.layer.hidden=true;return;}
    if(data.key!==this.key){
      this.key=data.key;this.open=false;this.setOpen();
      this.button.querySelector('b').textContent=data.title;
      this.button.querySelector('.hotspot-count').textContent=data.item;
      this.button.querySelector('.hotspot-step').textContent=`${data.step}/${data.total}`;
      this.button.setAttribute('aria-label',`${data.title}${data.item?' '+data.item:''}, step ${data.step} of ${data.total}. Show explanation`);
      this.panel.querySelector('p').textContent=data.detail;
    }
    if(state.playing&&this.open){this.open=false;this.setOpen();}
    data.object.updateWorldMatrix(true,false);camera.updateMatrixWorld();
    this.point.copy(data.local).applyMatrix4(data.object.matrixWorld);
    this.viewPoint.copy(this.point).applyMatrix4(camera.matrixWorldInverse);
    this.point.project(camera);
    const w=this.host.clientWidth,h=this.host.clientHeight;
    if(this.viewPoint.z>=0||Math.abs(this.point.x)>1||Math.abs(this.point.y)>1||Math.abs(this.point.z)>1||w<100||h<80){this.layer.hidden=true;return;}
    this.layer.hidden=false;
    const x=(this.point.x+1)*w/2,y=(1-this.point.y)*h/2;
    // Keep labels inside the model viewport and left of the view controls.
    const toolbar=document.querySelector('.view-tools').getBoundingClientRect(),hostRect=this.host.getBoundingClientRect();
    const right=w-10;
    this.callout.style.maxWidth=`${right-10}px`;
    const cw=this.callout.offsetWidth,ch=this.callout.offsetHeight;
    const left=THREE.MathUtils.clamp(x-cw/2,10,Math.max(10,right-cw));
    let top=y-ch-26;if(top<8)top=y+26;
    top=THREE.MathUtils.clamp(top,8,Math.max(8,h-ch-8));
    this.callout.style.transform=`translate(${left}px,${top}px)`;
    const endX=THREE.MathUtils.clamp(x,left+14,left+cw-14),endY=top>y?top:top+ch;
    this.layer.querySelector('path').setAttribute('d',`M ${x} ${y} L ${endX} ${endY}`);
    this.layer.querySelectorAll('circle').forEach(n=>{n.setAttribute('cx',x);n.setAttribute('cy',y);});
  }
}
