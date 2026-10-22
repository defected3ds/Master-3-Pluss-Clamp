import * as THREE from 'three';

// Visible-surface contours: no wireframe overlay, coincident lines or back edges.
// Normals and depth are sampled in screen space so line weight survives zooming.
export class TechnicalRenderer {
  constructor(renderer) {
    this.renderer=renderer;
    this.target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
    this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    this.normals=new THREE.MeshNormalMaterial({side:THREE.DoubleSide});
    this.scene=new THREE.Scene();
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.material=new THREE.ShaderMaterial({
      depthTest:false,depthWrite:false,toneMapped:false,
      uniforms:{normalMap:{value:this.target.texture},depthMap:{value:this.target.depthTexture},pixel:{value:new THREE.Vector2(1,1)},nearPlane:{value:1},farPlane:{value:200},orthographic:{value:0}},
      vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
      fragmentShader:`
        precision highp float;
        uniform sampler2D normalMap, depthMap;
        uniform vec2 pixel;
        uniform float nearPlane,farPlane,orthographic;
        varying vec2 vUv;
        float depthAt(vec2 uv){float d=texture2D(depthMap,uv).x;return mix(nearPlane*farPlane/(farPlane-d*(farPlane-nearPlane)),nearPlane+d*(farPlane-nearPlane),orthographic);}
        vec3 normAt(vec2 uv){return normalize(texture2D(normalMap,uv).rgb*2.0-1.0);}
        void main(){
          float raw=texture2D(depthMap,vUv).x;
          float d=depthAt(vUv);
          vec3 n=normAt(vUv);
          float edge=0.0;
          for(int i=0;i<4;i++){
            vec2 off=i==0?vec2(pixel.x,0.0):i==1?vec2(0.0,pixel.y):i==2?vec2(pixel.x,pixel.y)*.7071:vec2(pixel.x,-pixel.y)*.7071;
            float a=texture2D(depthMap,vUv+off).x,b=texture2D(depthMap,vUv-off).x;
            float silhouette=abs(step(.99999,a)-step(.99999,b));
            float crease=1.0-dot(normAt(vUv+off),normAt(vUv-off));
            // Second depth difference rejects ordinary perspective slopes.
            float discontinuity=abs(depthAt(vUv+off)+depthAt(vUv-off)-2.0*d);
            float visible=1.0-step(.99999,max(a,b));
            edge=max(edge,max(silhouette,visible*max(smoothstep(.18,.48,crease),smoothstep(.12,.42,discontinuity))));
          }
          // Pure white faces and neutral black visible lines, matching the technical reference.
          vec3 paper=vec3(1.0);
          vec3 face=vec3(1.0);
          vec3 base=mix(face,paper,step(.99999,raw));
          gl_FragColor=vec4(mix(base,vec3(.025),edge*.96),1.0);
        }`
    });
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material);
    this.scene.add(this.quad);
    this.inkTarget=new THREE.WebGLRenderTarget(1,1);
    this.antialias=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
      uniforms:{image:{value:this.inkTarget.texture},texel:{value:new THREE.Vector2()}},
      vertexShader:this.material.vertexShader,
      fragmentShader:`precision highp float; varying vec2 vUv; uniform sampler2D image; uniform vec2 texel;
        float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
        void main(){
          vec3 m=texture2D(image,vUv).rgb;
          float nw=lum(texture2D(image,vUv+vec2(-1.,-1.)*texel).rgb),ne=lum(texture2D(image,vUv+vec2(1.,-1.)*texel).rgb);
          float sw=lum(texture2D(image,vUv+vec2(-1.,1.)*texel).rgb),se=lum(texture2D(image,vUv+vec2(1.,1.)*texel).rgb),mid=lum(m);
          float low=min(mid,min(min(nw,ne),min(sw,se))),high=max(mid,max(max(nw,ne),max(sw,se)));
          vec2 dir=vec2(-((nw+ne)-(sw+se)),(nw+sw)-(ne+se));
          float reduce=max((nw+ne+sw+se)*.03125,.0078125);
          dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),vec2(-8.),vec2(8.))*texel;
          vec3 a=.5*(texture2D(image,vUv+dir*(-1./6.)).rgb+texture2D(image,vUv+dir*(1./6.)).rgb);
          vec3 b=a*.5+.25*(texture2D(image,vUv+dir*(-.5)).rgb+texture2D(image,vUv+dir*.5).rgb);
          float l=lum(b);gl_FragColor=vec4(l<low||l>high?a:b,1.);
        }`
    });
    this.size=new THREE.Vector2();
  }
  render(scene,camera){
    const r=this.renderer;r.getDrawingBufferSize(this.size);
    if(this.target.width!==this.size.x||this.target.height!==this.size.y){this.target.setSize(this.size.x,this.size.y);this.inkTarget.setSize(this.size.x,this.size.y);}
    // 0.72 CSS px sampling radius makes a ~1.4 CSS px technical stroke.
    const radius=.72*r.getPixelRatio();
    this.material.uniforms.pixel.value.set(radius/this.size.x,radius/this.size.y);
    this.material.uniforms.nearPlane.value=camera.near;this.material.uniforms.farPlane.value=camera.far;
    this.material.uniforms.orthographic.value=camera.isOrthographicCamera?1:0;
    const oldOverride=scene.overrideMaterial,oldBackground=scene.background;
    scene.overrideMaterial=this.normals;scene.background=new THREE.Color(0x8080ff);
    r.setRenderTarget(this.target);r.clear();r.render(scene,camera);
    scene.overrideMaterial=oldOverride;scene.background=oldBackground;
    this.quad.material=this.material;r.setRenderTarget(this.inkTarget);r.render(this.scene,this.camera);
    this.antialias.uniforms.texel.value.set(1/this.size.x,1/this.size.y);
    this.quad.material=this.antialias;r.setRenderTarget(null);r.render(this.scene,this.camera);
  }
}
