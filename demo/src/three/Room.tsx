import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

export function Room({ hour }: { hour: number }) {
  const screenRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (screenRef.current) {
      const mat = screenRef.current.material as any;
      const flicker = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      mat.emissiveIntensity = flicker;
    }
  });

  const isNight = hour < 7 || hour >= 23;
  const screenOn = hour >= 8 && hour < 23;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#2a3140" roughness={0.92} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 2, -3]} receiveShadow>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#334155" roughness={0.82} />
      </mesh>

      {/* Side wall (left) */}
      <mesh position={[-3, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#293548" roughness={0.82} />
      </mesh>

      {/* Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0.15, 0.01, -1.25]}>
        <planeGeometry args={[2.6, 1.8]} />
        <meshStandardMaterial color="#4b5563" roughness={0.95} />
      </mesh>

      {/* === DESK AREA === */}
      {/* Desk top */}
      <mesh position={[0, 0.72, -1.8]} castShadow>
        <boxGeometry args={[1.8, 0.05, 0.7]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.6} />
      </mesh>
      {/* Desk legs */}
      {[[-0.8, 0.36, -2.05], [0.8, 0.36, -2.05], [-0.8, 0.36, -1.55], [0.8, 0.36, -1.55]].map((pos, i) => (
        <mesh key={`dleg-${i}`} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.04, 0.72, 0.04]} />
          <meshStandardMaterial color="#444" roughness={0.7} />
        </mesh>
      ))}

      {/* Monitor stand */}
      <mesh position={[0, 0.78, -2.0]}>
        <boxGeometry args={[0.15, 0.06, 0.12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
      </mesh>
      {/* Monitor neck */}
      <mesh position={[0, 0.88, -2.05]}>
        <boxGeometry args={[0.04, 0.16, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
      </mesh>
      {/* Monitor frame */}
      <mesh position={[0, 1.15, -2.1]}>
        <boxGeometry args={[0.85, 0.5, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
      </mesh>
      {/* Monitor screen */}
      <mesh ref={screenRef} position={[0, 1.15, -2.075]}>
        <boxGeometry args={[0.78, 0.44, 0.01]} />
        <meshStandardMaterial
          color={screenOn ? '#244a82' : '#0a0a0a'}
          emissive={screenOn ? '#4c8ae8' : '#000000'}
          emissiveIntensity={screenOn ? 0.8 : 0}
          roughness={0.1}
        />
      </mesh>

      {/* Keyboard */}
      <mesh position={[0, 0.76, -1.65]}>
        <boxGeometry args={[0.4, 0.015, 0.14]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} />
      </mesh>
      {/* Mouse */}
      <mesh position={[0.35, 0.755, -1.65]}>
        <boxGeometry args={[0.06, 0.02, 0.1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} />
      </mesh>

      {/* Chair base */}
      <mesh position={[0, 0.22, -1.2]}>
        <cylinderGeometry args={[0.25, 0.3, 0.04, 16]} />
        <meshStandardMaterial color="#222" roughness={0.5} />
      </mesh>
      {/* Chair post */}
      <mesh position={[0, 0.35, -1.2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        <meshStandardMaterial color="#333" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Chair seat */}
      <mesh position={[0, 0.48, -1.2]} castShadow>
        <boxGeometry args={[0.45, 0.06, 0.42]} />
        <meshStandardMaterial color="#2d2d3d" roughness={0.7} />
      </mesh>
      {/* Chair back */}
      <mesh position={[0, 0.72, -1.42]} castShadow>
        <boxGeometry args={[0.42, 0.5, 0.05]} />
        <meshStandardMaterial color="#2d2d3d" roughness={0.7} />
      </mesh>

      {/* === BED AREA (right side) === */}
      {/* Bed frame */}
      <mesh position={[1.7, 0.2, -1.0]} castShadow>
        <boxGeometry args={[1.2, 0.25, 2.2]} />
        <meshStandardMaterial color="#3a3530" roughness={0.7} />
      </mesh>
      {/* Mattress */}
      <mesh position={[1.7, 0.36, -1.0]}>
        <boxGeometry args={[1.1, 0.08, 2.1]} />
        <meshStandardMaterial color="#e8e0d8" roughness={0.9} />
      </mesh>
      {/* Pillow */}
      <mesh position={[1.7, 0.44, -1.9]}>
        <boxGeometry args={[0.5, 0.1, 0.35]} />
        <meshStandardMaterial color="#f0ede8" roughness={0.95} />
      </mesh>
      {/* Blanket */}
      <mesh position={[1.7, 0.42, -0.5]}>
        <boxGeometry args={[1.05, 0.06, 1.4]} />
        <meshStandardMaterial color={isNight ? '#6d7f9f' : '#5a6578'} roughness={0.9} />
      </mesh>
      {/* Headboard */}
      <mesh position={[1.7, 0.55, -2.1]}>
        <boxGeometry args={[1.2, 0.45, 0.06]} />
        <meshStandardMaterial color="#3a3530" roughness={0.7} />
      </mesh>

      {/* Bedside table */}
      <mesh position={[2.45, 0.33, -1.78]} castShadow>
        <boxGeometry args={[0.3, 0.52, 0.3]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.68} />
      </mesh>
      <mesh position={[2.45, 0.64, -1.78]}>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 14]} />
        <meshStandardMaterial color="#d8dee8" roughness={0.5} />
      </mesh>

      {/* Plant */}
      <mesh position={[-1.2, 0.88, -1.62]}>
        <cylinderGeometry args={[0.09, 0.11, 0.18, 14]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.8} />
      </mesh>
      {[[-1.18, 1.02, -1.62], [-1.25, 1.0, -1.56], [-1.1, 1.0, -1.57], [-1.18, 0.98, -1.69]].map((pos, i) => (
        <mesh key={`leaf-${i}`} position={pos as [number, number, number]} rotation={[0, 0, i * 0.3]}>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial color="#3f8f54" roughness={0.85} />
        </mesh>
      ))}

      {/* Poster */}
      <mesh position={[-1.9, 1.9, -2.94]}>
        <boxGeometry args={[0.75, 0.95, 0.03]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
      </mesh>
      <mesh position={[-1.9, 1.9, -2.92]}>
        <planeGeometry args={[0.62, 0.82]} />
        <meshStandardMaterial color="#4f46e5" roughness={0.75} />
      </mesh>

      {/* === SHELF on wall === */}
      <mesh position={[-0.8, 1.6, -2.95]}>
        <boxGeometry args={[0.8, 0.04, 0.2]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.6} />
      </mesh>
      {/* Books on shelf */}
      {[[-1.05, 1.7, -2.92], [-0.9, 1.7, -2.92], [-0.78, 1.7, -2.92], [-0.65, 1.7, -2.92]].map((pos, i) => (
        <mesh key={`book-${i}`} position={pos as [number, number, number]}>
          <boxGeometry args={[0.08, 0.18, 0.12]} />
          <meshStandardMaterial color={['#8b4513', '#2c5f7c', '#6b3a3a', '#3c6b3a'][i]} roughness={0.8} />
        </mesh>
      ))}

      {/* Mug on desk */}
      <mesh position={[-0.6, 0.79, -1.7]}>
        <cylinderGeometry args={[0.035, 0.03, 0.08, 12]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.7} />
      </mesh>
    </group>
  );
}
