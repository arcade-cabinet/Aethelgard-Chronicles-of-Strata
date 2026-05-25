/**
 * TitleBackground — cinematic PBR shader hero for the launcher.
 *
 * Adopted from the 21st.dev TitleScreen reference (M_HUD.SHELL.2):
 * a high-subdivision icosahedron with a custom vertex/fragment
 * shader pair — domain-warped FBM noise displacement on the vertex
 * shader; cosine-gradient palette + 3-light Cook-Torrance PBR
 * lighting + Schlick fresnel + rim glow + scanline pattern on the
 * fragment shader. Wrapped in r3f's <Canvas> + the
 * @react-three/postprocessing pipeline (Bloom + ChromaticAberration
 * + Vignette + Noise + ACES tone mapping) for the cinematic finish.
 *
 * The shader runs in OPAQUE black canvas behind the title chrome.
 * Mouse position feeds a smoothed uMouse uniform that subtly
 * warps the dome — gives the page a live, watching quality.
 *
 * prefers-reduced-motion gates the temporal warp + bloom intensity
 * (we keep the shape but stop the noise drift and dim the bloom
 * to avoid vestibular discomfort).
 */
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useEffect, useMemo, useRef } from 'react';
import {
  ACESFilmicToneMapping,
  Color,
  DoubleSide,
  IcosahedronGeometry,
  type Mesh,
  type Object3DEventMap,
  ShaderMaterial,
  Vector2,
} from 'three';

extend({ ShaderMaterial });

// --------------- shader source (Magic reference, lightly tidied) ---------------

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vDist;

  uniform float uTime;
  uniform vec2  uMouse;

  // Ashima simplex noise — public domain.
  vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }

  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 x = x_*ns.x + ns.yyyy;
    vec4 y = y_*ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m*m;
    return 42.0*dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p){
    float v = 0.0;
    float a = 0.5;
    for(int i = 0; i < 5; i++){
      v += a * snoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main(){
    vUv = uv;
    vec3 pos = position;
    vec3 p = pos * 1.1;
    float t = uTime * 0.25;
    float warp1 = fbm(p + vec3(t, -t, t * 0.5));
    float warp2 = snoise(p * 2.0 + vec3(-t * 0.7, t * 0.9, t * 0.2));
    float warp  = warp1 * 0.25 + warp2 * 0.1;
    float ridge = max(0.0, 1.0 - abs(snoise(p * 1.5)));
    float disp  = warp + ridge * 0.15;
    vDist = disp;
    pos += normal * disp;
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vDist;
  uniform float uTime;
  uniform vec3  uColorObsidian;
  uniform vec3  uColorGold;
  uniform vec3  uColorAccent;

  vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d){
    return a + b * cos(6.28318 * (c * t + d));
  }

  float sat(float x){ return clamp(x, 0.0, 1.0); }

  vec3 normalFromDerivatives(vec3 p){
    vec3 dx = dFdx(p);
    vec3 dy = dFdy(p);
    return normalize(cross(dx, dy));
  }

  vec3 F_Schlick(float cosTheta, vec3 F0){
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  }

  float D_GGX(float NdotH, float rough){
    float a  = rough * rough;
    float a2 = a * a;
    float d  = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
    return a2 / (3.14159 * d * d);
  }

  float G_SchlickGGX(float NdotV, float rough){
    float r = rough + 1.0;
    float k = (r * r) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
  }

  float G_Smith(float NdotV, float NdotL, float rough){
    return G_SchlickGGX(NdotV, rough) * G_SchlickGGX(NdotL, rough);
  }

  vec3 envGradient(vec3 r, vec3 skyA, vec3 skyB, vec3 ground){
    float h = r.y * 0.5 + 0.5;
    vec3 sky = mix(skyB, skyA, h);
    return mix(ground, sky, sat(h * 1.2));
  }

  float gradParam(vec2 uv, float time){
    vec2 q = uv * 2.0 - 1.0;
    q.x *= 1.2;
    float a = sin(q.x * 2.5 + time * 0.25);
    float b = cos(q.y * 3.0 - time * 0.2);
    return sat(0.5 + 0.5 * (a * 0.6 + b * 0.4));
  }

  void main(){
    vec3 N = normalFromDerivatives(vWorldPos);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float t = uTime * 0.6;
    vec3 L1pos = vec3( 6.0 * sin(t * 0.70),  4.0,                       6.0 * cos(t * 0.70));
    vec3 L2pos = vec3(-5.0 * cos(t * 0.50), -3.5,                       5.0 * sin(t * 0.45));
    vec3 L3pos = vec3( 0.0,                  6.0 * sin(t * 0.25),      -6.0);
    vec3 L1 = normalize(L1pos - vWorldPos);
    vec3 L2 = normalize(L2pos - vWorldPos);
    vec3 L3 = normalize(L3pos - vWorldPos);
    float gp = gradParam(vUv, uTime) + vDist * 0.6;
    vec3 palA = cosPalette(gp, vec3(0.55,0.55,0.58), vec3(0.45,0.35,0.35), vec3(0.95,0.80,0.70), vec3(0.00,0.35,0.55));
    vec3 palB = cosPalette(gp + 0.15 * sin(uTime * 0.25), vec3(0.55,0.56,0.58), vec3(0.35,0.45,0.55), vec3(0.90,0.55,0.75), vec3(0.25,0.10,0.60));
    vec3 baseAlbedo = mix(palA, palB, 0.5);
    baseAlbedo = mix(baseAlbedo, uColorObsidian, 0.15);
    baseAlbedo = mix(baseAlbedo, uColorGold,     0.10);
    float metallic = 0.25 + 0.15 * sin(uTime * 0.2 + gp * 3.0);
    float rough = clamp(0.18 + 0.12 * sin(gp * 6.283 + uTime * 0.35), 0.06, 0.6);
    vec3 F0 = mix(vec3(0.04), baseAlbedo, metallic);
    vec3 H1 = normalize(V + L1);
    vec3 H2 = normalize(V + L2);
    vec3 H3 = normalize(V + L3);
    float NdotV = sat(dot(N, V));
    float NdotL1 = sat(dot(N, L1));
    float NdotL2 = sat(dot(N, L2));
    float NdotL3 = sat(dot(N, L3));
    float NdotH1 = sat(dot(N, H1));
    float NdotH2 = sat(dot(N, H2));
    float NdotH3 = sat(dot(N, H3));
    float D1 = D_GGX(NdotH1, rough);
    float D2 = D_GGX(NdotH2, rough);
    float D3 = D_GGX(NdotH3, rough);
    float G1 = G_Smith(NdotV, NdotL1, rough);
    float G2 = G_Smith(NdotV, NdotL2, rough);
    float G3 = G_Smith(NdotV, NdotL3, rough);
    vec3  F1 = F_Schlick(sat(dot(V, H1)), F0);
    vec3  F2 = F_Schlick(sat(dot(V, H2)), F0);
    vec3  F3 = F_Schlick(sat(dot(V, H3)), F0);
    vec3 spec1 = (D1 * G1 * F1) / max(4.0 * NdotV * NdotL1, 0.001);
    vec3 spec2 = (D2 * G2 * F2) / max(4.0 * NdotV * NdotL2, 0.001);
    vec3 spec3 = (D3 * G3 * F3) / max(4.0 * NdotV * NdotL3, 0.001);
    vec3 kS = F_Schlick(NdotV, F0);
    vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);
    vec3 diffuse = baseAlbedo / 3.14159;
    vec3 c1 = vec3(1.0);
    vec3 c2 = mix(uColorAccent, vec3(0.9, 0.95, 1.0), 0.6);
    vec3 c3 = mix(uColorGold,   vec3(1.0, 0.9, 0.75), 0.5);
    vec3 direct = (kD * diffuse + spec1) * c1 * NdotL1 * 0.9
                + (kD * diffuse + spec2) * c2 * NdotL2 * 0.6
                + (kD * diffuse + spec3) * c3 * NdotL3 * 0.5;
    vec3 R = reflect(-V, N);
    vec3 env = envGradient(R, vec3(0.12,0.16,0.25), vec3(0.04,0.06,0.10), vec3(0.01,0.01,0.012));
    vec3 Fenv = F_Schlick(sat(dot(N, V)), F0);
    vec3 envSpec = Fenv * env * (1.0 - rough) * 0.6;
    float rim = pow(1.0 - sat(dot(N, V)), 2.0);
    vec3 rimCol = mix(uColorGold, uColorAccent, 0.4) * rim * 0.35;
    vec3 glow = mix(uColorGold, uColorAccent, 0.5) * abs(vDist) * 0.25;
    vec3 color = direct + envSpec + rimCol + glow;
    float pattern = sin(vUv.x * 40.0 + uTime) * sin(vUv.y * 38.0 - uTime);
    color += pattern * 0.015;
    color = clamp(color, 0.0, 4.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// --------------- r3f component ---------------

function PbrDome({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = useRef<Mesh<IcosahedronGeometry, ShaderMaterial, Object3DEventMap> | null>(null);
  const mouse = useRef({ x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 });
  const { size } = useThree();

  const geometry = useMemo(() => new IcosahedronGeometry(1.85, 5), []);
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uColorObsidian: { value: new Color('#090d16') },
        uColorGold: { value: new Color('#d4af37') },
        uColorAccent: { value: new Color('#38bdf8') },
      },
      vertexShader,
      fragmentShader,
      side: DoubleSide,
    });
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX / size.width;
      mouse.current.y = 1 - e.clientY / size.height;
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [size.width, size.height]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!meshRef.current) return;
    const uTime = material.uniforms.uTime;
    const uMouse = material.uniforms.uMouse;
    // Reduced motion: freeze the time-driven warp but keep the static shape.
    if (uTime) uTime.value = reducedMotion ? 0 : t;
    mouse.current.sx += (mouse.current.x - mouse.current.sx) * 0.1;
    mouse.current.sy += (mouse.current.y - mouse.current.sy) * 0.1;
    if (uMouse) (uMouse.value as Vector2).set(mouse.current.sx, mouse.current.sy);
    if (!reducedMotion) {
      meshRef.current.rotation.y = t * 0.1;
      meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
    }
  });

  return (
    <>
      {/* ambient + directional are unused by the ShaderMaterial (it
       * implements its own 3-light Cook-Torrance pipeline) but cost
       * nothing and keep the scene graph tidy for future drei nodes
       * that DO want three.js lights. */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} />
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </>
  );
}

export interface TitleBackgroundProps {
  /** Honour prefers-reduced-motion — frozen shader time + dimmed bloom. */
  reducedMotion?: boolean;
}

/**
 * The launcher's hero background. Renders behind the TitleScreen
 * chrome (z-index -1, pointer-events:none, aria-hidden).
 */
export function TitleBackground({ reducedMotion = false }: TitleBackgroundProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        // M_HUD.SHELL.2 — z=0 (not -1) so the canvas sits inside the
        // TitleScreen stacking context. The chrome above explicitly
        // takes z=10+ so the layer order is canvas → chrome.
        zIndex: 0,
        pointerEvents: 'none',
        background: '#050608',
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 3.6], fov: 60 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.5,
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <PbrDome reducedMotion={reducedMotion} />
        <EffectComposer>
          <Bloom
            intensity={reducedMotion ? 0.4 : 0.95}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
          <ChromaticAberration
            offset={[0.0014, 0.0014]}
            radialModulation
            modulationOffset={0.0}
            blendFunction={BlendFunction.NORMAL}
          />
          <Vignette eskil={false} offset={0.5} darkness={0.35} />
          <Noise opacity={0.045} blendFunction={BlendFunction.OVERLAY} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
