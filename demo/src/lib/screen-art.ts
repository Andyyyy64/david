function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function parseWindow(windowTitle: string) {
  const [app = '', title = ''] = windowTitle.split('|');
  return {
    app: app || 'system',
    title: title || 'Workspace',
  };
}

function getVariant(timestamp: string) {
  const date = new Date(timestamp);
  const minutes = Number.isNaN(date.getTime()) ? 0 : date.getMinutes();
  return Math.floor(minutes / 5) % 3;
}

function wrapScreen({
  accent,
  appName,
  title,
  body,
}: {
  accent: string;
  appName: string;
  title: string;
  body: string;
}) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
      </defs>
      <rect width="1280" height="800" fill="url(#bg)" />
      <rect x="0" y="0" width="1280" height="44" rx="0" fill="#020617" />
      <circle cx="22" cy="22" r="6" fill="#ef4444" />
      <circle cx="42" cy="22" r="6" fill="#f59e0b" />
      <circle cx="62" cy="22" r="6" fill="#22c55e" />
      <text x="96" y="28" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="20">${appName}</text>
      <rect x="0" y="44" width="1280" height="52" fill="#0b1220" />
      <rect x="24" y="58" width="320" height="24" rx="12" fill="#111827" stroke="#1f2937" />
      <text x="40" y="75" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="15">${title}</text>
      <rect x="1120" y="58" width="128" height="24" rx="12" fill="${accent}" opacity="0.22" />
      <text x="1148" y="75" fill="#e2e8f0" font-family="Inter, Arial, sans-serif" font-size="15">Live</text>
      ${body}
    </svg>
  `.trim();
}

function buildProgrammingScreen(title: string, variant: number) {
  const editorBody = `
    <rect x="0" y="96" width="248" height="704" fill="#0b1120" />
    <rect x="248" y="96" width="720" height="704" fill="#0f172a" />
    <rect x="968" y="96" width="312" height="704" fill="#111827" />
    <rect x="18" y="118" width="212" height="32" rx="8" fill="#111827" />
    <text x="36" y="139" fill="#93c5fd" font-family="JetBrains Mono, monospace" font-size="18">src/demo.tsx</text>
    <text x="36" y="184" fill="#64748b" font-family="JetBrains Mono, monospace" font-size="18">components</text>
    <text x="36" y="216" fill="#64748b" font-family="JetBrains Mono, monospace" font-size="18">lib</text>
    <text x="36" y="248" fill="#64748b" font-family="JetBrains Mono, monospace" font-size="18">styles</text>
    <rect x="272" y="122" width="250" height="28" rx="8" fill="#1e293b" />
    <text x="292" y="142" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="18">${title}</text>
    <text x="288" y="208" fill="#c084fc" font-family="JetBrains Mono, monospace" font-size="22">const</text>
    <text x="364" y="208" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="22">timeline</text>
    <text x="488" y="208" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="22">=</text>
    <text x="288" y="250" fill="#38bdf8" font-family="JetBrains Mono, monospace" font-size="22">useMemo</text>
    <text x="392" y="250" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="22">(()</text>
    <text x="288" y="292" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="22">frames.map((frame) =&gt; frame.activity)</text>
    <text x="288" y="334" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="22">.filter(Boolean)</text>
    <rect x="996" y="124" width="252" height="208" rx="16" fill="#020617" stroke="#1e293b" />
    <text x="1022" y="158" fill="#22c55e" font-family="JetBrains Mono, monospace" font-size="18">$ pnpm demo:test</text>
    <text x="1022" y="194" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="18">PASS  screen updates</text>
    <text x="1022" y="230" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="18">PASS  timeline refresh</text>
    <text x="1022" y="266" fill="#38bdf8" font-family="JetBrains Mono, monospace" font-size="18">watching for changes...</text>
  `;

  const terminalBody = `
    <rect x="0" y="96" width="1280" height="704" fill="#050816" />
    <rect x="72" y="136" width="1136" height="584" rx="20" fill="#020617" stroke="#1f2937" />
    <text x="118" y="200" fill="#22c55e" font-family="JetBrains Mono, monospace" font-size="26">$ pnpm demo:dev</text>
    <text x="118" y="252" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="22">vite v6 ready in 420ms</text>
    <text x="118" y="304" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="22">Local: http://localhost:5175/</text>
    <text x="118" y="356" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="22">rebuilding runtime-demo.ts...</text>
    <text x="118" y="408" fill="#38bdf8" font-family="JetBrains Mono, monospace" font-size="22">hmr update /src/App.tsx</text>
    <text x="118" y="460" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="22">hmr update /src/components/DetailPanel.tsx</text>
  `;

  const splitBody = `
    <rect x="0" y="96" width="180" height="704" fill="#0b1120" />
    <rect x="180" y="96" width="620" height="704" fill="#0f172a" />
    <rect x="800" y="96" width="480" height="704" fill="#111827" />
    <text x="30" y="150" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="22">Explorer</text>
    <text x="210" y="164" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="20">useDemoRuntime.ts</text>
    <text x="210" y="224" fill="#c084fc" font-family="JetBrains Mono, monospace" font-size="20">export const</text>
    <text x="362" y="224" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="20">speed</text>
    <text x="428" y="224" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="20">= 240</text>
    <rect x="832" y="128" width="416" height="236" rx="16" fill="#020617" stroke="#1e293b" />
    <text x="860" y="168" fill="#e2e8f0" font-family="Inter, Arial, sans-serif" font-size="20">Preview</text>
    <rect x="860" y="194" width="360" height="142" rx="14" fill="#1d4ed8" opacity="0.25" />
    <text x="892" y="268" fill="#bfdbfe" font-family="Inter, Arial, sans-serif" font-size="28">vida demo scene</text>
    <rect x="832" y="398" width="416" height="278" rx="16" fill="#0b1220" />
    <text x="860" y="446" fill="#22c55e" font-family="JetBrains Mono, monospace" font-size="18">frame 144 updated</text>
    <text x="860" y="486" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="18">screen path generated inline</text>
  `;

  return [editorBody, terminalBody, splitBody][variant];
}

function buildMeetingScreen(title: string, variant: number) {
  return `
    <rect x="0" y="96" width="1280" height="704" fill="#0f172a" />
    <rect x="44" y="132" width="824" height="620" rx="20" fill="#111827" />
    <rect x="900" y="132" width="336" height="620" rx="20" fill="#0b1220" />
    ${[0, 1, 2, 3].map((index) => {
      const x = 78 + (index % 2) * 384;
      const y = 168 + Math.floor(index / 2) * 266;
      const fills = ['#1d4ed8', '#0891b2', '#7c3aed', '#db2777'];
      return `
        <rect x="${x}" y="${y}" width="340" height="226" rx="18" fill="${fills[(index + variant) % fills.length]}" opacity="0.35" />
        <circle cx="${x + 170}" cy="${y + 94}" r="42" fill="#f1c6a8" />
        <rect x="${x + 120}" y="${y + 144}" width="100" height="42" rx="21" fill="#4a6fa5" />
      `;
    }).join('')}
    <text x="928" y="186" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="24">${title}</text>
    <text x="928" y="236" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="18">Standup notes</text>
    <rect x="928" y="268" width="280" height="1" fill="#1e293b" />
    <text x="928" y="320" fill="#e2e8f0" font-family="Inter, Arial, sans-serif" font-size="18">- demo runtime updates</text>
    <text x="928" y="360" fill="#e2e8f0" font-family="Inter, Arial, sans-serif" font-size="18">- live feed polish</text>
    <text x="928" y="400" fill="#e2e8f0" font-family="Inter, Arial, sans-serif" font-size="18">- timeline auto refresh</text>
    <rect x="928" y="668" width="280" height="40" rx="20" fill="#2563eb" />
    <text x="1024" y="694" fill="#eff6ff" font-family="Inter, Arial, sans-serif" font-size="18">Muted</text>
  `;
}

function buildBrowserScreen(title: string, accent: string, heading: string, lines: string[]) {
  return `
    <rect x="0" y="96" width="1280" height="704" fill="#f8fafc" />
    <rect x="0" y="96" width="1280" height="64" fill="#e2e8f0" />
    <rect x="92" y="114" width="1040" height="30" rx="15" fill="#ffffff" stroke="#cbd5e1" />
    <text x="126" y="135" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="17">${title}</text>
    <rect x="72" y="196" width="820" height="520" rx="20" fill="#ffffff" stroke="#e2e8f0" />
    <rect x="924" y="196" width="284" height="520" rx="20" fill="#ffffff" stroke="#e2e8f0" />
    <rect x="112" y="236" width="180" height="28" rx="14" fill="${accent}" opacity="0.14" />
    <text x="112" y="324" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="42">${heading}</text>
    ${lines.map((line, index) => `
      <text x="112" y="${394 + index * 54}" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="22">${line}</text>
    `).join('')}
    <text x="956" y="244" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="24">Now</text>
    <rect x="956" y="274" width="220" height="120" rx="18" fill="${accent}" opacity="0.14" />
    <rect x="956" y="420" width="220" height="120" rx="18" fill="#e2e8f0" />
  `;
}

function buildLockedScreenScreen(title: string, timestamp: string) {
  const date = new Date(timestamp);
  const hours = Number.isNaN(date.getTime()) ? '12' : String(date.getHours()).padStart(2, '0');
  const minutes = Number.isNaN(date.getTime()) ? '00' : String(date.getMinutes()).padStart(2, '0');

  return `
    <rect x="0" y="96" width="1280" height="704" fill="#030712" />
    <defs>
      <linearGradient id="wallpaper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1d4ed8" />
        <stop offset="100%" stop-color="#312e81" />
      </linearGradient>
    </defs>
    <rect x="48" y="136" width="1184" height="616" rx="28" fill="url(#wallpaper)" />
    <circle cx="1040" cy="222" r="96" fill="#ffffff" opacity="0.08" />
    <circle cx="1120" cy="286" r="64" fill="#ffffff" opacity="0.06" />
    <text x="110" y="268" fill="#eff6ff" font-family="Inter, Arial, sans-serif" font-size="98">${hours}:${minutes}</text>
    <text x="114" y="322" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="22">workspace paused</text>
    <rect x="112" y="560" width="320" height="118" rx="20" fill="#0f172a" opacity="0.7" />
    <text x="146" y="618" fill="#e2e8f0" font-family="Inter, Arial, sans-serif" font-size="24">${title || 'Workspace locked'}</text>
    <text x="146" y="654" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="18">Notifications and background tasks stay visible.</text>
  `;
}

export function buildDemoScreenDataUrl(activity: string, windowTitle: string, timestamp: string) {
  const { app, title } = parseWindow(windowTitle);
  const variant = getVariant(timestamp);

  if (activity === 'programming') {
    return encodeSvg(wrapScreen({
      accent: '#2563eb',
      appName: 'VS Code',
      title: title || 'demo.tsx',
      body: buildProgrammingScreen(title || 'demo.tsx', variant),
    }));
  }

  if (activity === 'meeting') {
    return encodeSvg(wrapScreen({
      accent: '#14b8a6',
      appName: 'Google Meet',
      title: title || 'Daily sync',
      body: buildMeetingScreen(title || 'Daily sync', variant),
    }));
  }

  if (activity === 'youtube') {
    return encodeSvg(wrapScreen({
      accent: '#ef4444',
      appName: 'YouTube',
      title: title || 'Watch',
      body: buildBrowserScreen(
        title || 'YouTube',
        '#ef4444',
        'Lo-fi coding stream',
        ['Ambient playlist in the background', 'Comments and recommendations on the side', 'Relaxed evening desk time'],
      ),
    }));
  }

  if (activity === 'browsing') {
    return encodeSvg(wrapScreen({
      accent: '#8b5cf6',
      appName: app === 'chrome' ? 'Chrome' : 'Browser',
      title: title || 'Reading thread',
      body: buildBrowserScreen(
        title || 'Reading thread',
        '#8b5cf6',
        'Community thread',
        ['Checking replies and saved posts', 'A few open tabs for weekend plans', 'Low-pressure browsing block'],
      ),
    }));
  }

  if (activity === 'reading') {
    return encodeSvg(wrapScreen({
      accent: '#22c55e',
      appName: 'Notes',
      title: title || 'Reading list',
      body: buildBrowserScreen(
        title || 'Reading list',
        '#22c55e',
        'Saved article',
        ['Quiet reading before bed', 'Notes on product ideas and small fixes', 'A slower end-of-day pace'],
      ),
    }));
  }

  return encodeSvg(wrapScreen({
    accent: '#64748b',
    appName: 'System',
    title: title || 'Workspace locked',
    body: buildLockedScreenScreen(title || 'Workspace locked', timestamp),
  }));
}
