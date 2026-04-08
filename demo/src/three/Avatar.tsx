import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

function Head({ color }: { color: string }) {
  return (
    <mesh castShadow>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

function Body({ color }: { color: string }) {
  return (
    <mesh castShadow>
      <capsuleGeometry args={[0.12, 0.3, 8, 12]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

function Arm({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <capsuleGeometry args={[0.04, 0.25, 6, 8]} />
      <meshStandardMaterial color="#f0c4a0" roughness={0.6} />
    </mesh>
  );
}

function Leg({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <capsuleGeometry args={[0.05, 0.3, 6, 8]} />
      <meshStandardMaterial color="#2a2a40" roughness={0.7} />
    </mesh>
  );
}

export function Avatar({ pose }: { pose: 'sleeping' | 'sitting_desk' | 'standing' | null }) {
  const groupRef = useRef<Group>(null);

  // Subtle idle animation
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    if (pose === 'sleeping') {
      // Breathing
      groupRef.current.scale.y = 1 + Math.sin(t * 1.5) * 0.01;
    } else if (pose === 'sitting_desk') {
      // Slight sway
      groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.015;
      groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.01;
    } else if (pose === 'standing') {
      // Weight shift
      groupRef.current.position.x = 0.5 + Math.sin(t * 0.4) * 0.03;
    }
  });

  if (!pose) return null;

  const skinColor = '#f0c4a0';
  const shirtColor = '#4a6fa5';

  if (pose === 'sleeping') {
    return (
      <group ref={groupRef} position={[1.64, 0.45, -1.2]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0.05, 0.05, 0.08]} castShadow>
          <boxGeometry args={[0.92, 0.1, 1.42]} />
          <meshStandardMaterial color="#93a4c8" roughness={0.96} />
        </mesh>
        <mesh position={[0.1, 0.12, -0.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.17, 0.75, 6, 12]} />
          <meshStandardMaterial color="#d6dbe8" roughness={0.95} />
        </mesh>
        <group position={[0.06, 0.16, -0.55]} scale={[0.95, 0.95, 0.95]}>
          <Head color={skinColor} />
          <mesh position={[0, 0.05, -0.03]} castShadow>
            <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#2a1a0a" roughness={0.85} />
          </mesh>
        </group>
        <mesh position={[-0.02, 0.08, -0.56]} castShadow>
          <boxGeometry args={[0.32, 0.06, 0.24]} />
          <meshStandardMaterial color="#eef2f7" roughness={0.95} />
        </mesh>
      </group>
    );
  }

  if (pose === 'sitting_desk') {
    return (
      <group ref={groupRef} position={[0, 0, -1.2]}>
        {/* Head */}
        <group position={[0, 1.08, 0]}>
          <Head color={skinColor} />
          {/* Hair */}
          <mesh position={[0, 0.06, -0.02]} castShadow>
            <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#2a1a0a" roughness={0.8} />
          </mesh>
        </group>
        {/* Upper body */}
        <group position={[0, 0.78, 0]}>
          <Body color={shirtColor} />
        </group>
        {/* Arms reaching toward desk */}
        <Arm position={[0.18, 0.72, 0.15]} rotation={[0.8, 0, 0.15]} />
        <Arm position={[-0.18, 0.72, 0.15]} rotation={[0.8, 0, -0.15]} />
        {/* Legs (seated) */}
        <Leg position={[0.08, 0.42, 0.1]} rotation={[Math.PI / 2, 0, 0]} />
        <Leg position={[-0.08, 0.42, 0.1]} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    );
  }

  // standing
  return (
    <group ref={groupRef} position={[0.5, 0, -0.5]}>
      {/* Head */}
      <group position={[0, 1.55, 0]}>
        <Head color={skinColor} />
        <mesh position={[0, 0.06, -0.02]} castShadow>
          <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#2a1a0a" roughness={0.8} />
        </mesh>
      </group>
      {/* Body */}
      <group position={[0, 1.2, 0]}>
        <Body color={shirtColor} />
      </group>
      {/* Arms */}
      <Arm position={[0.18, 1.1, 0]} rotation={[0, 0, 0.1]} />
      <Arm position={[-0.18, 1.1, 0]} rotation={[0, 0, -0.1]} />
      {/* Legs */}
      <Leg position={[0.07, 0.7, 0]} />
      <Leg position={[-0.07, 0.7, 0]} />
      {/* Feet */}
      <mesh position={[0.07, 0.38, 0.04]}>
        <boxGeometry args={[0.08, 0.04, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      <mesh position={[-0.07, 0.38, 0.04]}>
        <boxGeometry args={[0.08, 0.04, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
    </group>
  );
}
