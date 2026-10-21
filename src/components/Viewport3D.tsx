import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParsedPolyhedron, AmsSlot } from '../types';
import { Eye, Focus, Grid, Layers, RotateCcw, Maximize2 } from 'lucide-react';

interface Viewport3DProps {
  model: ParsedPolyhedron | null;
  amsSlots: AmsSlot[];
  rendering: boolean;
  elapsedMs: number;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  model,
  amsSlots,
  rendering,
  elapsedMs,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  const [wireframe, setWireframe] = useState(false);
  const [showPlate, setShowPlate] = useState(true);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x18181b);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(160, 160, 160);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 10);
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(150, 200, 150);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x90b0d0, 0.4);
    dirLight2.position.set(-150, -100, -150);
    scene.add(dirLight2);

    // Build Plate (Bambu Lab 256 x 256 mm PEI textured bed style)
    const plateGroup = new THREE.Group();
    plateGroup.name = 'bambu-plate';

    // Bed surface
    const bedGeo = new THREE.PlaneGeometry(256, 256);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x222225,
      roughness: 0.8,
      metalness: 0.2,
      depthWrite: true,
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.rotation.x = -Math.PI / 2;
    bedMesh.position.y = -0.1;
    bedMesh.receiveShadow = true;
    plateGroup.add(bedMesh);

    // Major & Minor Grid
    const gridHelper = new THREE.GridHelper(256, 25.6, 0x00ae42, 0x3a3a40);
    gridHelper.position.y = 0;
    plateGroup.add(gridHelper);

    // Bed Border Frame
    const borderGeo = new THREE.EdgesGeometry(bedGeo);
    const borderMat = new THREE.LineBasicMaterial({ color: 0x00ae42, linewidth: 2 });
    const borderMesh = new THREE.LineSegments(borderGeo, borderMat);
    borderMesh.rotation.x = -Math.PI / 2;
    plateGroup.add(borderMesh);

    scene.add(plateGroup);

    // Model Container
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Animation loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Update Plate Visibility
  useEffect(() => {
    if (!sceneRef.current) return;
    const plate = sceneRef.current.getObjectByName('bambu-plate');
    if (plate) {
      plate.visible = showPlate;
    }
  }, [showPlate]);

  // Update material colors directly when amsSlots changes without rebuilding geometries
  useEffect(() => {
    if (!modelGroupRef.current) return;
    modelGroupRef.current.children.forEach(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.userData && typeof mesh.userData.colorIdx === 'number') {
        const colorIdx = mesh.userData.colorIdx;
        const amsSlot = amsSlots[colorIdx];
        if (amsSlot && amsSlot.colorHex && mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.color.set(amsSlot.colorHex);
          mesh.material.needsUpdate = true;
        }
      }
    });
  }, [amsSlots]);

  // Update Geometry whenever model or wireframe changes
  useEffect(() => {
    if (!modelGroupRef.current || !model) return;
    const modelGroup = modelGroupRef.current;

    // Clear previous meshes
    while (modelGroup.children.length > 0) {
      const child = modelGroup.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
      modelGroup.remove(child);
    }

    if (model.faces.length === 0 || model.vertices.length === 0) return;

    // Group faces by color index
    const facesByColor = new Map<number, typeof model.faces>();
    model.faces.forEach(face => {
      const list = facesByColor.get(face.colorIndex) || [];
      list.push(face);
      facesByColor.set(face.colorIndex, list);
    });

    facesByColor.forEach((faces, colorIdx) => {
      const rawColor = model.colors[colorIdx] || [0.0, 0.68, 0.26, 1.0];
      const amsSlot = amsSlots[colorIdx];
      const threeColor = amsSlot && amsSlot.colorHex
        ? new THREE.Color(amsSlot.colorHex)
        : new THREE.Color(rawColor[0], rawColor[1], rawColor[2]);

      // Flatten vertices into positions array for this color part
      const positions: number[] = [];
      faces.forEach(f => {
        const v0 = model.vertices[f.vertices[0]];
        const v1 = model.vertices[f.vertices[1]];
        const v2 = model.vertices[f.vertices[2]];

        if (v0 && v1 && v2) {
          // OpenSCAD coordinate system: Z is UP. Three.js: Y is UP.
          // We convert (x, y, z) -> (x, z, -y) or rotate group by -90 deg on X
          positions.push(v0.x, v0.y, v0.z);
          positions.push(v1.x, v1.y, v1.z);
          positions.push(v2.x, v2.y, v2.z);
        }
      });

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: threeColor,
        roughness: 0.35,
        metalness: 0.1,
        wireframe: wireframe,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { colorIdx };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Orient OpenSCAD (Z up) to Three.js (Y up)
      mesh.rotation.x = -Math.PI / 2;
      modelGroup.add(mesh);
    });

    // Auto center camera on model if initial load
    if (controlsRef.current && cameraRef.current && model.bounds) {
      const { size, min, max } = model.bounds;
      const centerZ = (min.z + max.z) / 2;
      const centerY = (min.y + max.y) / 2;
      const centerX = (min.x + max.x) / 2;

      // Center the model on the plate
      modelGroup.position.set(-centerX, 0, centerY);
    }
  }, [model, wireframe, amsSlots]);

  const resetCamera = (preset: 'top' | 'front' | 'side' | 'iso') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const dist = 180;
    controls.target.set(0, 15, 0);

    switch (preset) {
      case 'top':
        camera.position.set(0, dist * 1.3, 0.001);
        break;
      case 'front':
        camera.position.set(0, 20, dist);
        break;
      case 'side':
        camera.position.set(dist, 20, 0);
        break;
      case 'iso':
        camera.position.set(dist * 0.8, dist * 0.9, dist * 0.8);
        break;
    }
    camera.updateProjectionMatrix();
    controls.update();
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#161618]">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#202023]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl">
        <button
          onClick={() => setWireframe(!wireframe)}
          title="Toggle Wireframe"
          className={`p-2 rounded-lg text-xs font-medium transition-all ${
            wireframe ? 'bg-bambu-green text-black font-semibold' : 'text-neutral-300 hover:bg-white/10'
          }`}
        >
          <Layers size={16} />
        </button>

        <button
          onClick={() => setShowPlate(!showPlate)}
          title="Toggle Build Plate"
          className={`p-2 rounded-lg text-xs font-medium transition-all ${
            showPlate ? 'bg-white/15 text-white' : 'text-neutral-400 hover:bg-white/10'
          }`}
        >
          <Grid size={16} />
        </button>

        <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

        <button
          onClick={() => resetCamera('top')}
          title="Top View"
          className="px-2 py-1.5 text-xs text-neutral-300 hover:bg-white/10 rounded-lg font-mono font-medium"
        >
          TOP
        </button>
        <button
          onClick={() => resetCamera('front')}
          title="Front View"
          className="px-2 py-1.5 text-xs text-neutral-300 hover:bg-white/10 rounded-lg font-mono font-medium"
        >
          FRONT
        </button>
        <button
          onClick={() => resetCamera('iso')}
          title="Isometric View"
          className="p-2 text-neutral-300 hover:bg-white/10 rounded-lg"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Bambu Bed Indicator (Bottom Left) */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-[#1e1e21]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-lg text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-bambu-green animate-pulse" />
          <span className="text-neutral-300 font-medium">Bambu Lab PEI 256×256</span>
        </div>

        {model && (
          <>
            <div className="w-[1px] h-3 bg-white/15" />
            <div className="text-neutral-400">
              <span className="text-white font-medium">{model.bounds.size.x.toFixed(1)}</span> ×{' '}
              <span className="text-white font-medium">{model.bounds.size.y.toFixed(1)}</span> ×{' '}
              <span className="text-white font-medium">{model.bounds.size.z.toFixed(1)}</span> mm
            </div>
            <div className="w-[1px] h-3 bg-white/15" />
            <div className="text-neutral-400">
              <span className="text-white font-medium">{model.faces.length.toLocaleString()}</span> tris
            </div>
          </>
        )}
      </div>

      {/* Render Time / Loading Indicator (Top Left) */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        {rendering ? (
          <div className="flex items-center gap-2 bg-bambu-green/20 border border-bambu-green/40 px-3 py-1.5 rounded-full backdrop-blur-md text-bambu-green text-xs font-medium animate-pulse">
            <span className="w-2 h-2 rounded-full bg-bambu-green animate-ping" />
            Rendering with Manifold...
          </div>
        ) : elapsedMs > 0 ? (
          <div className="flex items-center gap-1.5 bg-[#202024]/80 border border-white/10 px-2.5 py-1 rounded-full text-[11px] font-mono text-neutral-400">
            <span className="text-bambu-green font-semibold">⚡ {elapsedMs.toFixed(0)} ms</span>
            <span>manifold csg</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
