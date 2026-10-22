import * as THREE from 'three';

export const stages={
  double:[
    [0,'Mount the wall-side clamp half','Position the rear half on the wall connection first. Keep the pipe and front half aside.'],
    [.08,'Secure the rear half to the wall','The threaded wall connection moves into place. Wall anchoring depends on the substrate; see the original instructions.'],
    [.18,'Insert the pipe','With the rear half secured to the wall, bring the pipe into the inlay before closing the clamp.'],
    [.28,'Close the lower clamp','Bring the lower front shell around the pipe and engage both click connections.'],
    [.39,'Position the upper clamp','Lower the acoustic clamp onto the rubber connection, directly above the lower clamp.'],
    [.50,'Close the upper clamp','Bring the front shell into place and engage both click connections.'],
    [.61,'Insert the four bolts','The fastening bolts enter the side tabs one at a time. See assembly instructions, page 3.'],
    [.75,'Tighten the fasteners','The socket wrench engages each bolt, turns and withdraws. Tool movement is illustrative; no tightening torque is specified here.'],
    [.96,'Assembly complete','Check the connection between clamps and the lower-clamp clearance. Confirm all details against the assembly PDF.']
  ],
  single:[
    [0,'Mount the wall-side clamp half','Position the rear half on the wall connection first. Keep the pipe and front half aside.'],
    [.10,'Secure the rear half to the wall','Position the threaded wall connection as shown on page 4 of the assembly instructions.'],
    [.24,'Insert the pipe','With the rear half secured to the wall, bring the pipe into the inlay before closing the clamp.'],
    [.40,'Close the acoustic clamp','Bring the front shell around the pipe. Keep the inlay seated and engage both click connections.'],
    [.56,'Insert the two bolts','Insert both fastening bolts through the aligned side tabs, following page 4.'],
    [.73,'Tighten the fasteners','The socket wrench engages each bolt in sequence. Tool movement is illustrative; use the manufacturer’s installation guidance.'],
    [.96,'Assembly complete','Check the inlay, click connections and fasteners. Open the specifications for spacing by pipe diameter.']
  ],
  loose:[
    [0,'Mount the wall-side clamp half','Position the rear half on the wall connection first. Keep the pipe and front half aside.'],
    [.10,'Secure the rear half to the wall','Position the threaded wall connection shown on page 5 of the assembly instructions.'],
    [.24,'Insert the pipe','With the rear half secured to the wall, bring the pipe into the inlay before closing the clamp.'],
    [.40,'Engage the click connections','Bring the front shell into place. Preserve the clearance in the enlarged page 5 detail; do not clamp the pipe rigidly.'],
    [.56,'Insert the two bolts','The illustrative bolts enter the aligned side tabs one at a time. Preserve the designed loose-clamp clearance.'],
    [.73,'Seat the fasteners','The ratchet engages each illustrative fastener, turns and withdraws. Preserve pipe clearance and follow the original assembly PDF; no torque is specified here.'],
    [.96,'Check free movement','Check the designed clearance and confirm the pipe can move. Compare the finished connection with page 5 of the assembly PDF.']
  ]
};
export const ease=(a,b,t)=>THREE.MathUtils.smoothstep(t,a,b);
export function explodedOffset(kind,upper,front,config,t){
  // Straight, bounded exploded layout matching the supplied reference.
  // Fasteners clear their bores before the nested layers begin to separate.
  const release=ease(.10,1,t);
  const radial={front:32,rear:32,rubber:23,stripe:15,inlay:7,mount:43}[kind]??32;
  return new THREE.Vector3(0,0,(front?1:-1)*radial*release);
}
export function timing(config){return config==='double'?{wall:[.08,.18],rear:[.18,.28],lower:[.28,.39],upper:[.39,.50],front:[.50,.61],bolts:[.61,.75],tool:[.75,.96]}:config==='single'?{wall:[.10,.24],rear:[.24,.40],front:[.40,.56],bolts:[.56,.73],tool:[.73,.96]}:{wall:[.10,.24],rear:[.24,.40],front:[.40,.56],bolts:[.56,.73],tool:[.73,.96]};}
export function partOffset(u,state){
  const c=state.config,t=state.amount,tm=timing(c),p=new THREE.Vector3(0,c==='single'?-1.90:c==='loose'?1.89:0,0);
  if(state.mode==='explore')return p.add(explodedOffset(u.kind,u.upper,u.front,c,t));
  if(c==='double'&&u.upper){p.y+=8*(1-ease(...tm.upper,t));if(u.front)p.z+=11*(1-ease(...tm.front,t));}
  else if(u.front)p.z+=11*(1-ease(...(c==='double'?tm.lower:tm.front),t));
  else p.z+=4*(1-ease(...tm.wall,t));
  
  return p;
}

const steel=new THREE.MeshStandardMaterial({color:0xaab3bd,metalness:.88,roughness:.24});
const polished=new THREE.MeshStandardMaterial({color:0xd1d8df,metalness:.92,roughness:.19});
const grip=new THREE.MeshStandardMaterial({color:0x123d78,metalness:.05,roughness:.48});
const dark=new THREE.MeshStandardMaterial({color:0x171c23,metalness:.3,roughness:.35});
function mesh(g,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;}
function cylinder(g,r,length,z,segments=32,mat=steel){const m=mesh(g,new THREE.CylinderGeometry(r,r,length,segments),mat,0,0,z);m.rotation.x=Math.PI/2;return m;}
function hollow(g,outer,inner,length,z,sides=48,mat=steel){
  const s=new THREE.Shape();for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2;i?s.lineTo(Math.cos(a)*outer,Math.sin(a)*outer):s.moveTo(outer,0);}
  const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);s.holes.push(hole);
  const m=mesh(g,new THREE.ExtrudeGeometry(s,{depth:length,bevelEnabled:false,curveSegments:32}),mat,0,0,z);return m;
}
function thread(g,r,length,z,pitch=.16){
  const points=[],turns=length/pitch;
  for(let i=0;i<=Math.ceil(turns*20);i++){const f=i/Math.ceil(turns*20),a=f*turns*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,z-f*length));}
  mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.ceil(turns*20),.025,4,false),steel);
}
function bolt(){const g=new THREE.Group();g.userData.label='Fastening bolt (illustrative)';cylinder(g,.28,1.9,-.85);thread(g,.285,1.8,.05);cylinder(g,.65,.12,.10,48);cylinder(g,.48,.46,.38,6);return g;}
function nut(){const g=new THREE.Group();g.userData.label='Fastening nut (illustrative)';hollow(g,.55,.29,.42,0,6);return g;}
function socket(){
  const g=new THREE.Group();g.userData.label='Socket ratchet (illustrative)';
  // Narrow socket at the hex head, with an extension keeping the ratchet
  // and handle well outside the clamp body. The handle points radially out.
  hollow(g,.62,.55,.8,0,48,polished);cylinder(g,.23,3.0,2.3,24,polished);
  cylinder(g,.72,.38,4.0,48,polished);cylinder(g,.27,.08,4.24,32,dark);
  mesh(g,new THREE.BoxGeometry(.45,3.9,.34),polished,0,-2.0,4.0);
  mesh(g,new THREE.CapsuleGeometry(.36,2.5,6,12),grip,0,-4.3,4.0);
  return g;
}
function spanner(){
  const g=new THREE.Group();g.userData.label='Mounting spanner (illustrative)';
  const shape=new THREE.Shape();
  // Open jaw with parallel flats; it can slide onto the external hex nut.
  [[1.05,1.12],[-.5,1.12],[-1.1,.6],[-1.1,-.6],[-.5,-1.12],[1.05,-1.12],[1.05,-.81],[-.53,-.81],[-.94,0],[-.53,.81],[1.05,.81]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  mesh(g,new THREE.ExtrudeGeometry(shape,{depth:.25,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:2}),polished);
  mesh(g,new THREE.BoxGeometry(4.8,.54,.28),polished,-3.2,0,.13);
  mesh(g,new THREE.CapsuleGeometry(.35,1.8,4,12),grip,-5.7,0,.13).rotation.z=Math.PI/2;
  return g;
}

export class AssemblyHardware{
  constructor(rig){
    this.items=[];this.inspectables=[];
    for(const upper of [false,true])for(const side of [-1,1]){
      const b=bolt(),n=nut();rig.add(b,n);this.items.push({upper,side,bolt:b,nut:n});this.inspectables.push(b,n);
    }
    this.socket=socket();this.spanner=spanner();rig.add(this.socket,this.spanner);this.socket.visible=this.spanner.visible=false;
    this.inspectables.push(this.socket,this.spanner);
    this.rod=new THREE.Group();this.rod.userData.label='M10 threaded wall connection (illustrative)';
    cylinder(this.rod,.46,5,-2.5);rig.add(this.rod);this.inspectables.push(this.rod);
    this.locknut=new THREE.Group();this.locknut.userData.label='External M10 locknut (illustrative)';
    hollow(this.locknut,.9,.51,.45,0,6);rig.add(this.locknut);this.inspectables.push(this.locknut);
    this.upperRod=this.rod.clone();this.upperRod.userData.label='Upper M10 wall mounting bolt (illustrative)';
    this.upperLocknut=this.locknut.clone();this.upperLocknut.userData.label='Upper M10 locknut (illustrative)';
    rig.add(this.upperRod,this.upperLocknut);this.inspectables.push(this.upperRod,this.upperLocknut);
  }
  update(state){
    const t=state.amount,c=state.config,install=state.mode==='install',tm=timing(c),offset=c==='single'?-1.90:c==='loose'?1.89:0;
    const exp=install?0:t, list=this.items.filter(o=>c==='double'||(c==='single'?o.upper:!o.upper));
    const rearY=c==='double'?-1.89:0;
    const shellShift=explodedOffset('rear',c==='single',false,c,exp);
    this.rod.position.set(0,rearY+(install?0:shellShift.y),-7.5-(install?0:55*ease(0,1,exp)));
    const mountStart=tm.rear[0]+.5*(tm.rear[1]-tm.rear[0]);
    const mountLocal=(t-mountStart)/(tm.rear[1]-mountStart);
    const mountTurn=-.48*ease(.25,.7,mountLocal);
    this.locknut.position.copy(this.rod.position).add(new THREE.Vector3(install?0:-5*ease(.025,.06,exp),0,-3.2+(install?.15*ease(.25,.7,mountLocal):-6*ease(0,.025,exp))));
    this.locknut.rotation.z=install?mountTurn:0;
    this.upperRod.visible=this.upperLocknut.visible=c==='double'&&(!install||t>=tm.upper[0]);
    this.upperRod.position.copy(this.rod.position);
    this.upperRod.position.y=1.90+(install&&c==='double'?8*(1-ease(...tm.upper,t)):0);
    this.upperLocknut.position.copy(this.locknut.position);
    this.upperLocknut.position.y=this.upperRod.position.y;
    this.upperLocknut.rotation.copy(this.locknut.rotation);
    this.socket.visible=false;this.spanner.visible=false;
    this.items.forEach(o=>{o.bolt.visible=o.nut.visible=list.includes(o)&&(!install||t>=tm.bolts[0]);});
    list.forEach((o,i)=>{
      const y=(o.upper?1.90:-1.89)+offset+explodedOffset('front',o.upper,true,c,exp).y+(install&&c==='double'&&o.upper?8*(1-ease(...tm.upper,t)):0);
      const begin=tm.bolts[0]+(tm.bolts[1]-tm.bolts[0])*i/list.length,end=begin+(tm.bolts[1]-tm.bolts[0])/list.length;
      const phase=(t-begin)/(end-begin);
      const align=install?ease(0,.32,phase):1;
      const seat=install?ease(.36,1,phase):1;
      const segment=(tm.tool[1]-tm.tool[0])/list.length,local=(t-tm.tool[0]-i*segment)/segment;
      const turn=ease(.18,.78,local);
      const cycle=turn*5,whole=Math.floor(cycle),fraction=cycle-whole;
      // Ratchet advances the bolt only on the working half of each stroke.
      const drive=(whole+ease(0,.5,fraction))*.95;
      const handle=(fraction<.5?ease(0,.5,fraction):1-ease(.5,1,fraction))*.95;
      // Always clear the shaft axially before moving it sideways.
      const withdraw=ease(0,.10,exp),spread=ease(.10,1,exp),park=0;
      const threadTravel=install?.12*(1-drive/4.75)*seat:0;
      o.bolt.position.set(o.side*(7.475+5.5*park+(install?6*(1-align):0)),y,1.10+3*withdraw+44*spread+(1-seat)*11+threadTravel);
      o.bolt.userData.parked=install&&align<1;
      o.bolt.rotation.z=install?-drive:0;
      const nutSeat=install?ease(.34,.62,phase):1;
      o.nut.position.set(o.side*(7.475+5.5*park+(install?6*(1-align):0)),y,-.75-3*withdraw-42*spread-(1-nutSeat)*11);
      o.nut.userData.parked=install&&align<1;
      o.nut.rotation.z=install?nutSeat*Math.PI*2:0;
      if(install&&state.tools&&local>=0&&local<1){
        const arrive=ease(0,.18,local),leave=ease(.80,1,local),away=1-arrive+leave;
        this.socket.visible=true;
        // Straight coaxial engagement: the socket never approaches diagonally
        // through the side tab. Every working stroke stays outside the pipe.
        this.socket.position.copy(o.bolt.position).add(new THREE.Vector3(0,0,(this.socket.userData.tipOffset??.15)+away*7));
        this.socket.rotation.z=o.side*Math.PI/2+.45-handle;
        // The removable socket advances with the bolt; the handle returns freely.
        if(this.socket.userData.socketPart)this.socket.userData.socketPart.rotation.z=o.bolt.rotation.z-this.socket.rotation.z;
      }
    });

  }
}
