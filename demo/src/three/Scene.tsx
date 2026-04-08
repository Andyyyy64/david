import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Avatar } from './Avatar';
import { Lighting } from './Lighting';
import { Room } from './Room';

function CameraRig({ pose }: { pose: 'sleeping' | 'sitting_desk' | 'standing' | null }) {
  const { camera } = useThree();
  const position = useRef(new THREE.Vector3(0.9, 1.6, 1.0));
  const target = useRef(new THREE.Vector3(0, 0.95, -1.65));

  useFrame(() => {
    const shot = pose === 'sleeping'
      ? {
          position: new THREE.Vector3(0.95, 1.0, -0.05),
          target: new THREE.Vector3(1.68, 0.5, -1.45),
          fov: 29,
        }
      : pose === 'standing'
        ? {
            position: new THREE.Vector3(1.55, 1.55, 1.2),
            target: new THREE.Vector3(0.8, 1.0, -0.65),
            fov: 36,
          }
        : {
            position: new THREE.Vector3(0.9, 1.6, 1.0),
            target: new THREE.Vector3(0, 0.95, -1.65),
            fov: 34,
          };

    position.current.lerp(shot.position, 0.08);
    target.current.lerp(shot.target, 0.08);
    camera.position.copy(position.current);
    camera.lookAt(target.current);
    camera.fov = THREE.MathUtils.lerp(camera.fov, shot.fov, 0.08);
    camera.updateProjectionMatrix();
  });

  return null;
}

function SnapshotBridge({
  pose,
  hour,
  onSnapshot,
}: {
  pose: 'sleeping' | 'sitting_desk' | 'standing' | null;
  hour: number;
  onSnapshot: (dataUrl: string) => void;
}) {
  const { gl } = useThree();
  const lastCapture = useRef(0);

  useFrame((state) => {
    if (state.clock.elapsedTime - lastCapture.current < 0.6) return;
    lastCapture.current = state.clock.elapsedTime;
    onSnapshot(gl.domElement.toDataURL('image/jpeg', 0.82));
  });

  return (
    <>
      <CameraRig pose={pose} />
      <Lighting hour={hour} />
      <Room hour={hour} />
      <Avatar pose={pose} />
    </>
  );
}

export function DemoScene({
  pose,
  hour,
  onSnapshot,
  captureSnapshots = false,
}: {
  pose: 'sleeping' | 'sitting_desk' | 'standing' | null;
  hour: number;
  onSnapshot: (dataUrl: string) => void;
  captureSnapshots?: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [0.9, 1.6, 1.0], fov: 34, near: 0.1, far: 20 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor('#0f172a');
        scene.background = new THREE.Color('#0f172a');
      }}
      style={{ width: '100%', height: '100%' }}
      shadows
    >
      {captureSnapshots ? (
        <SnapshotBridge pose={pose} hour={hour} onSnapshot={onSnapshot} />
      ) : (
        <>
          <CameraRig pose={pose} />
          <Lighting hour={hour} />
          <Room hour={hour} />
          <Avatar pose={pose} />
        </>
      )}
    </Canvas>
  );
}
