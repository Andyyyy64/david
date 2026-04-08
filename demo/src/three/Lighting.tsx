export function Lighting({ hour }: { hour: number }) {
  const isDawn = hour >= 6 && hour < 8;
  const isDay = hour >= 8 && hour < 18;
  const isEvening = hour >= 18 && hour < 22;
  const isNight = hour >= 22 || hour < 6;

  let ambientIntensity: number;
  let dirIntensity: number;
  let ambientColor: string;
  let dirColor: string;

  if (isNight) {
    ambientIntensity = 0.38;
    dirIntensity = 0.18;
    ambientColor = '#52627d';
    dirColor = '#9fb7ea';
  } else if (isDawn) {
    ambientIntensity = 0.48;
    dirIntensity = 0.6;
    ambientColor = '#ffd4a0';
    dirColor = '#ffaa66';
  } else if (isDay) {
    ambientIntensity = 0.68;
    dirIntensity = 1.05;
    ambientColor = '#f8fbff';
    dirColor = '#fff7ed';
  } else {
    ambientIntensity = 0.42;
    dirIntensity = 0.42;
    ambientColor = '#ffddaa';
    dirColor = '#ffcc88';
  }

  return (
    <>
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        position={[2.5, 4.5, 3.5]}
        intensity={dirIntensity}
        color={dirColor}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <pointLight
        position={[0.2, 2.6, -1.3]}
        intensity={isNight ? 0.2 : 0.46}
        color={isDay ? '#fff1c2' : '#ffd8a8'}
        distance={6}
        decay={2}
      />
      {(isDay || isEvening) && (
        <pointLight
          position={[0, 1.15, -1.8]}
          intensity={0.55}
          color="#4488cc"
          distance={3}
          decay={2}
        />
      )}
      <pointLight
        position={[1.8, 1.35, -1.05]}
        intensity={isNight ? 0.45 : 0.2}
        color={isNight ? '#b9c8ff' : '#ffe8d0'}
        distance={4.8}
        decay={2}
      />
      <pointLight
        position={[-1.3, 2.0, -1.8]}
        intensity={isNight ? 0.12 : 0.18}
        color="#ffe8d0"
        distance={6}
        decay={2}
      />
      {isNight && (
        <>
          <pointLight
            position={[1.75, 0.9, -1.45]}
            intensity={0.52}
            color="#b6c9ff"
            distance={3.6}
            decay={2}
          />
          <pointLight
            position={[0, 1.15, -1.8]}
            intensity={0.22}
            color="#5f8cff"
            distance={3}
            decay={2}
          />
        </>
      )}
    </>
  );
}
