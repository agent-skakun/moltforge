// HumanoidFigure — Ameca-style humanoid SVG for Agent Builder
// Zones: face (Identity+avatar), head (Knowledge), heart (Specialization), hands (Tools), wallet (Settings)

import React from "react";

export type Zone = "head" | "face" | "heart" | "hands" | "wallet" | null;

export interface Avatar {
  id: string;
  emoji: string;
  label: string;
}

export const AVATARS: Avatar[] = [
  { id: "student",   emoji: "😊", label: "Sexy Student"     },
  { id: "hacker",    emoji: "🤓", label: "Nerdy Hacker"     },
  { id: "bearded",   emoji: "🧔", label: "Bearded IT Guy"   },
  { id: "finance",   emoji: "💼", label: "Finance Bro"      },
  { id: "professor", emoji: "👩‍🏫", label: "The Professor"   },
  { id: "creative",  emoji: "🎨", label: "Creative Director"},
  { id: "dark",      emoji: "🥷", label: "Dark Hacker"      },
  { id: "ai",        emoji: "🤖", label: "Pure AI"          },
];

interface HumanoidFigureProps {
  activeZone: Zone;
  hoverZone: Zone;
  specColor: string;
  selectedAvatarId: string;
  onZoneClick: (z: Zone) => void;
  onZoneHover: (z: Zone) => void;
  onAvatarSelect: (id: string) => void;
}

export function HumanoidFigure({
  activeZone,
  hoverZone,
  specColor,
  selectedAvatarId,
  onZoneClick,
  onZoneHover,
  onAvatarSelect,
}: HumanoidFigureProps) {
  const teal = "#1db8a8";
  const amber = "#f07828";
  const metal = "#2a3a38";
  const metalLight = "#3a4e4c";
  const metalDark = "#1a2826";
  const dark = "#060c0b";

  const isActive = (z: Zone) => activeZone === z || hoverZone === z;
  const glow = (z: Zone, color = teal, intensity = 10) =>
    isActive(z) ? `drop-shadow(0 0 ${intensity}px ${color})` : `drop-shadow(0 0 3px ${color}40)`;
  const opacity = (z: Zone) => isActive(z) ? 1 : 0.82;

  const selectedAvatar = AVATARS.find(a => a.id === selectedAvatarId) || AVATARS[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <svg
        viewBox="0 0 300 560"
        width={300}
        height={560}
        style={{ overflow: "visible" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Ambient body glow */}
          <radialGradient id="h-ambient" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={specColor} stopOpacity="0.1" />
            <stop offset="100%" stopColor={dark} stopOpacity="0" />
          </radialGradient>
          {/* Metal surface */}
          <linearGradient id="h-metal-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metalLight} />
            <stop offset="50%" stopColor={metal} />
            <stop offset="100%" stopColor={metalDark} />
          </linearGradient>
          <linearGradient id="h-metal-h" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={metalDark} />
            <stop offset="40%" stopColor={metalLight} />
            <stop offset="100%" stopColor={metalDark} />
          </linearGradient>
          {/* Chest core glow */}
          <radialGradient id="h-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={specColor} stopOpacity="0.9" />
            <stop offset="60%" stopColor={specColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={specColor} stopOpacity="0" />
          </radialGradient>
          {/* Cyber eye / face display */}
          <radialGradient id="h-face-display" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0d2e2a" />
            <stop offset="100%" stopColor="#060c0b" />
          </radialGradient>
          {/* Skin tone */}
          <radialGradient id="h-skin" cx="45%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#c8a882" />
            <stop offset="100%" stopColor="#9a7a5a" />
          </radialGradient>
          {/* Glow filters */}
          <filter id="f-teal-glow">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <filter id="f-ambient-glow">
            <feGaussianBlur stdDeviation="20" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <filter id="f-drop-shadow">
            <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#000" floodOpacity="0.7"/>
          </filter>
        </defs>

        {/* ── Ambient background ── */}
        <ellipse cx="150" cy="280" rx="130" ry="200" fill="url(#h-ambient)" />

        {/* ══════════════════════════════════════
            LEGS (wallet/settings zone)
            ══════════════════════════════════════ */}
        <g
          style={{ cursor: "pointer", filter: glow("wallet", teal, 12), opacity: opacity("wallet"), transition: "all 0.25s" }}
          onClick={() => onZoneClick(activeZone === "wallet" ? null : "wallet")}
          onMouseEnter={() => onZoneHover("wallet")}
          onMouseLeave={() => onZoneHover(null)}
        >
          {/* Left thigh */}
          <path d="M108 390 Q100 410 98 450 L122 450 Q124 410 118 390Z" fill="url(#h-metal-v)" stroke={teal} strokeWidth="0.8" strokeOpacity="0.4"/>
          {/* Left knee cap */}
          <ellipse cx="110" cy="452" rx="14" ry="10" fill={metalDark} stroke={teal} strokeWidth="1.2"/>
          <ellipse cx="110" cy="452" rx="7" ry="5" fill={teal} fillOpacity="0.3"/>
          <ellipse cx="110" cy="452" rx="3" ry="2.5" fill={teal} fillOpacity="0.7"/>
          {/* Left shin */}
          <path d="M98 460 Q96 490 97 520 L123 520 Q124 490 122 460Z" fill="url(#h-metal-v)" stroke={teal} strokeWidth="0.8" strokeOpacity="0.4"/>
          {/* Left shin panel */}
          <path d="M101 468 Q100 490 101 510 L119 510 Q120 490 119 468Z" fill={metalDark} stroke={teal} strokeWidth="0.6" strokeOpacity="0.5"/>
          {/* Left boot */}
          <path d="M95 518 Q92 528 90 535 L130 535 Q128 528 125 518Z" fill={metal} stroke={teal} strokeWidth="1"/>
          <path d="M88 533 L132 533 Q134 540 130 542 L90 542 Q86 540 88 533Z" fill={metalDark} stroke={teal} strokeWidth="0.8"/>

          {/* Right thigh */}
          <path d="M182 390 Q190 410 192 450 L168 450 Q166 410 172 390Z" fill="url(#h-metal-v)" stroke={teal} strokeWidth="0.8" strokeOpacity="0.4"/>
          {/* Right knee cap */}
          <ellipse cx="180" cy="452" rx="14" ry="10" fill={metalDark} stroke={teal} strokeWidth="1.2"/>
          <ellipse cx="180" cy="452" rx="7" ry="5" fill={teal} fillOpacity="0.3"/>
          <ellipse cx="180" cy="452" rx="3" ry="2.5" fill={teal} fillOpacity="0.7"/>
          {/* Right shin */}
          <path d="M168 460 Q166 490 167 520 L193 520 Q194 490 192 460Z" fill="url(#h-metal-v)" stroke={teal} strokeWidth="0.8" strokeOpacity="0.4"/>
          {/* Right shin panel */}
          <path d="M171 468 Q170 490 171 510 L189 510 Q190 490 189 468Z" fill={metalDark} stroke={teal} strokeWidth="0.6" strokeOpacity="0.5"/>
          {/* Right boot */}
          <path d="M165 518 Q162 528 160 535 L200 535 Q198 528 195 518Z" fill={metal} stroke={teal} strokeWidth="1"/>
          <path d="M158 533 L202 533 Q204 540 200 542 L160 542 Q156 540 158 533Z" fill={metalDark} stroke={teal} strokeWidth="0.8"/>

          {/* Wallet zone active label */}
          {isActive("wallet") && (
            <g>
              <rect x="116" y="500" width="58" height="14" rx="4" fill={`${teal}20`} stroke={teal} strokeWidth="0.8"/>
              <text x="145" y="510.5" textAnchor="middle" fill={teal} fontSize="7" fontFamily="JetBrains Mono, monospace">⚙ SETTINGS</text>
            </g>
          )}
        </g>

        {/* ══════════════════════════════════════
            PELVIS / HIP connector
            ══════════════════════════════════════ */}
        <path d="M105 368 Q106 388 108 390 L182 390 Q184 388 185 368Z" fill={metal} stroke={teal} strokeWidth="0.8" strokeOpacity="0.5"/>
        <path d="M110 372 L180 372" stroke={teal} strokeWidth="0.6" strokeOpacity="0.4"/>
        <ellipse cx="145" cy="376" rx="18" ry="8" fill={metalDark} stroke={teal} strokeWidth="0.8"/>
        <ellipse cx="145" cy="376" rx="8" ry="4" fill={teal} fillOpacity="0.2"/>

        {/* ══════════════════════════════════════
            LEFT ARM — human-style (hands zone)
            ══════════════════════════════════════ */}
        <g
          style={{ cursor: "pointer", filter: glow("hands", amber, 12), opacity: opacity("hands"), transition: "all 0.25s" }}
          onClick={() => onZoneClick(activeZone === "hands" ? null : "hands")}
          onMouseEnter={() => onZoneHover("hands")}
          onMouseLeave={() => onZoneHover(null)}
        >
          {/* Left shoulder ball */}
          <circle cx="82" cy="210" r="16" fill={metal} stroke={teal} strokeWidth="1.5"/>
          <circle cx="82" cy="210" r="9" fill={metalDark} stroke={teal} strokeWidth="0.8"/>
          <circle cx="80" cy="208" r="4" fill={teal} fillOpacity="0.5"/>
          {/* Left upper arm */}
          <path d="M70 220 Q62 240 60 270 Q58 280 62 285 L80 285 Q84 280 84 270 Q86 240 82 222Z" fill="url(#h-metal-h)" stroke={teal} strokeWidth="0.8" strokeOpacity="0.5"/>
          {/* Left upper arm panel */}
          <path d="M64 230 Q62 255 63 275 L78 275 Q79 255 78 232Z" fill={metalDark} fillOpacity="0.5" stroke={teal} strokeWidth="0.5" strokeOpacity="0.4"/>
          {/* Left elbow joint */}
          <ellipse cx="71" cy="287" rx="12" ry="9" fill={metalDark} stroke={teal} strokeWidth="1.5"/>
          <circle cx="71" cy="287" r="5" fill={amber} fillOpacity="0.5"/>
          <circle cx="71" cy="287" r="2.5" fill={amber}/>
          {/* Left forearm */}
          <path d="M62 294 Q58 318 57 345 L80 345 Q82 318 80 296Z" fill="url(#h-metal-h)" stroke={teal} strokeWidth="0.8" strokeOpacity="0.5"/>
          {/* Holographic wrist display */}
          <rect x="55" y="342" width="28" height="12" rx="5" fill={metalDark} stroke={teal} strokeWidth="1.2"/>
          <rect x="58" y="344" width="22" height="8" rx="3" fill={teal} fillOpacity="0.12"/>
          <line x1="61" y1="348" x2="78" y2="348" stroke={teal} strokeWidth="0.8" strokeOpacity="0.8"/>
          <line x1="61" y1="350.5" x2="72" y2="350.5" stroke={teal} strokeWidth="0.5" strokeOpacity="0.5"/>
          {/* Left hand */}
          <path d="M58 353 Q56 360 57 370 Q58 378 65 380 L76 380 Q82 378 83 370 Q84 360 82 353Z" fill="url(#h-metal-h)" stroke={teal} strokeWidth="0.8" strokeOpacity="0.6"/>
          {/* Fingers L */}
          <rect x="59" y="378" width="5" height="16" rx="2.5" fill={metal} stroke={teal} strokeWidth="0.8"/>
          <rect x="66" y="378" width="5" height="18" rx="2.5" fill={metal} stroke={teal} strokeWidth="0.8"/>
          <rect x="73" y="378" width="5" height="17" rx="2.5" fill={metal} stroke={teal} strokeWidth="0.8"/>
          <rect x="80" y="380" width="4" height="14" rx="2" fill={metal} stroke={teal} strokeWidth="0.8"/>
          {/* Thumb L */}
          <path d="M56 358 Q50 360 48 368 Q49 374 55 374" fill="none" stroke={teal} strokeWidth="4" strokeLinecap="round" strokeOpacity="0.7"/>
        </g>

        {/* ══════════════════════════════════════
            RIGHT ARM — mechanical (hands zone)
            ══════════════════════════════════════ */}
        <g
          style={{ cursor: "pointer", filter: glow("hands", amber, 12), opacity: opacity("hands"), transition: "all 0.25s" }}
          onClick={() => onZoneClick(activeZone === "hands" ? null : "hands")}
          onMouseEnter={() => onZoneHover("hands")}
          onMouseLeave={() => onZoneHover(null)}
        >
          {/* Right shoulder ball */}
          <circle cx="208" cy="210" r="16" fill={metal} stroke={amber} strokeWidth="1.5"/>
          <circle cx="208" cy="210" r="9" fill={metalDark} stroke={amber} strokeWidth="0.8"/>
          <circle cx="210" cy="208" r="4" fill={amber} fillOpacity="0.5"/>
          {/* Right upper arm — mechanical segments */}
          <path d="M210 222 Q218 242 220 270 Q222 280 218 285 L200 285 Q196 280 196 270 Q194 240 198 222Z" fill={metalDark} stroke={amber} strokeWidth="1"/>
          <line x1="202" y1="230" x2="218" y2="230" stroke={amber} strokeWidth="0.8" strokeOpacity="0.6"/>
          <line x1="201" y1="248" x2="219" y2="248" stroke={amber} strokeWidth="0.8" strokeOpacity="0.6"/>
          <line x1="200" y1="266" x2="220" y2="266" stroke={amber} strokeWidth="0.8" strokeOpacity="0.6"/>
          <rect x="204" y="233" width="12" height="12" rx="2" fill={amber} fillOpacity="0.1" stroke={amber} strokeWidth="0.5" strokeOpacity="0.5"/>
          {/* Right elbow joint — mechanical */}
          <circle cx="209" cy="288" r="13" fill={metalDark} stroke={amber} strokeWidth="2"/>
          <circle cx="209" cy="288" r="7" fill={amber} fillOpacity="0.4"/>
          <circle cx="209" cy="288" r="3.5" fill={amber}/>
          <line x1="196" y1="288" x2="222" y2="288" stroke={amber} strokeWidth="0.6" strokeOpacity="0.4"/>
          <line x1="209" y1="275" x2="209" y2="301" stroke={amber} strokeWidth="0.6" strokeOpacity="0.4"/>
          {/* Right forearm — heavy mechanical */}
          <path d="M200 296 Q196 320 197 348 L222 348 Q224 320 220 298Z" fill={metalDark} stroke={amber} strokeWidth="1.2"/>
          <line x1="200" y1="305" x2="220" y2="305" stroke={amber} strokeWidth="0.7" strokeOpacity="0.6"/>
          <line x1="199" y1="320" x2="221" y2="320" stroke={amber} strokeWidth="0.7" strokeOpacity="0.6"/>
          <line x1="199" y1="335" x2="221" y2="335" stroke={amber} strokeWidth="0.7" strokeOpacity="0.6"/>
          {/* Right mechanical wrist */}
          <rect x="196" y="346" width="26" height="10" rx="4" fill={metalDark} stroke={amber} strokeWidth="1.2"/>
          {/* Mechanical fingers — manipulators */}
          <rect x="198" y="354" width="6" height="20" rx="3" fill={metalDark} stroke={amber} strokeWidth="1"/>
          <rect x="207" y="354" width="6" height="22" rx="3" fill={metalDark} stroke={amber} strokeWidth="1"/>
          <rect x="216" y="354" width="6" height="19" rx="3" fill={metalDark} stroke={amber} strokeWidth="1"/>
          <circle cx="201" cy="354" r="3" fill={amber} fillOpacity="0.8"/>
          <circle cx="210" cy="354" r="3" fill={amber} fillOpacity="0.8"/>
          <circle cx="219" cy="354" r="3" fill={amber} fillOpacity="0.8"/>
          {/* Thumb R mechanical */}
          <path d="M222 360 Q230 362 232 370 Q231 376 225 376" fill="none" stroke={amber} strokeWidth="5" strokeLinecap="round" strokeOpacity="0.7"/>

          {/* Hands zone label */}
          {isActive("hands") && (
            <g>
              <rect x="150" y="370" width="60" height="14" rx="4" fill={`${amber}20`} stroke={amber} strokeWidth="0.8"/>
              <text x="180" y="380.5" textAnchor="middle" fill={amber} fontSize="7" fontFamily="JetBrains Mono, monospace">🤝 TOOLS</text>
            </g>
          )}
        </g>

        {/* ══════════════════════════════════════
            TORSO / HEART (specialization zone)
            ══════════════════════════════════════ */}
        <g
          style={{ cursor: "pointer", filter: glow("heart", specColor, 14), opacity: opacity("heart"), transition: "all 0.25s" }}
          onClick={() => onZoneClick(activeZone === "heart" ? null : "heart")}
          onMouseEnter={() => onZoneHover("heart")}
          onMouseLeave={() => onZoneHover(null)}
        >
          {/* Main torso shape — humanoid proportions */}
          <path d="M98 200 Q90 215 88 250 Q86 285 88 330 Q90 355 105 368 L185 368 Q200 355 202 330 Q204 285 202 250 Q200 215 192 200 Q170 195 145 194 Q120 195 98 200Z"
            fill="url(#h-metal-h)" stroke={teal} strokeWidth="1.2" filter="url(#f-drop-shadow)"/>

          {/* Shoulder pads */}
          <path d="M88 200 Q82 205 80 215 Q82 225 92 228 L108 222 Q102 210 98 200Z" fill={metal} stroke={teal} strokeWidth="1"/>
          <path d="M202 200 Q208 205 210 215 Q208 225 198 228 L182 222 Q188 210 192 200Z" fill={metal} stroke={teal} strokeWidth="1"/>
          {/* Shoulder LEDs */}
          <circle cx="90" cy="210" r="3" fill={teal} fillOpacity="0.9" style={{filter:`drop-shadow(0 0 4px ${teal})`}}/>
          <circle cx="100" cy="215" r="2.5" fill={amber} fillOpacity="0.8"/>
          <circle cx="200" cy="210" r="3" fill={teal} fillOpacity="0.9" style={{filter:`drop-shadow(0 0 4px ${teal})`}}/>
          <circle cx="190" cy="215" r="2.5" fill={amber} fillOpacity="0.8"/>

          {/* Chest window — core display */}
          <rect x="122" y="228" width="46" height="48" rx="12" fill={dark} stroke={specColor} strokeWidth="2.5"/>
          <rect x="126" y="232" width="38" height="40" rx="9" fill="url(#h-core)" fillOpacity="0.15"/>

          {/* Heart/core inside chest window */}
          <path d="M145 264 C145 264 128 252 128 241 C128 235 133 230 138.5 230 C141.5 230 144 232 145 234 C146 232 148.5 230 151.5 230 C157 230 162 235 162 241 C162 252 145 264 145 264Z"
            fill={specColor} fillOpacity="0.7"/>
          <path d="M145 264 C145 264 128 252 128 241 C128 235 133 230 138.5 230 C141.5 230 144 232 145 234 C146 232 148.5 230 151.5 230 C157 230 162 235 162 241 C162 252 145 264 145 264Z"
            fill="none" stroke={specColor} strokeWidth="1.5" style={{filter:`drop-shadow(0 0 6px ${specColor})`}}/>

          {/* Circuit lines from chest */}
          <path d="M168 252 H183 V262 H195" stroke={specColor} strokeWidth="1" strokeOpacity="0.5" fill="none"/>
          <path d="M122 252 H107 V262 H95" stroke={specColor} strokeWidth="1" strokeOpacity="0.5" fill="none"/>
          <path d="M145 276 V295" stroke={specColor} strokeWidth="1" strokeOpacity="0.5"/>
          <circle cx="183" cy="252" r="2" fill={specColor} fillOpacity="0.7"/>
          <circle cx="107" cy="252" r="2" fill={specColor} fillOpacity="0.7"/>

          {/* Torso panel lines */}
          <path d="M100 290 H128 M162 290 H190" stroke={teal} strokeWidth="0.7" strokeOpacity="0.3"/>
          <path d="M97 310 H127 M163 310 H193" stroke={teal} strokeWidth="0.7" strokeOpacity="0.25"/>
          <path d="M100 330 H130 M160 330 H190" stroke={teal} strokeWidth="0.7" strokeOpacity="0.2"/>

          {/* Side energy lines */}
          <line x1="91" y1="280" x2="91" y2="340" stroke={teal} strokeWidth="2" strokeOpacity="0.35"/>
          <line x1="199" y1="280" x2="199" y2="340" stroke={teal} strokeWidth="2" strokeOpacity="0.35"/>

          {/* Belt */}
          <rect x="97" y="358" width="96" height="12" rx="5" fill={metalDark} stroke={teal} strokeWidth="1"/>
          <rect x="134" y="360" width="22" height="8" rx="3" fill={amber} fillOpacity="0.25" stroke={amber} strokeWidth="0.8"/>

          {/* Spec zone label */}
          {isActive("heart") && (
            <g>
              <rect x="103" y="305" width="84" height="14" rx="4" fill={`${specColor}20`} stroke={specColor} strokeWidth="0.8"/>
              <text x="145" y="315.5" textAnchor="middle" fill={specColor} fontSize="7" fontFamily="JetBrains Mono, monospace">❤ SPECIALIZATION</text>
            </g>
          )}
        </g>

        {/* ══════════════════════════════════════
            NECK
            ══════════════════════════════════════ */}
        <path d="M128 172 Q126 180 126 194 L164 194 Q164 180 162 172Z" fill={metal} stroke={teal} strokeWidth="0.8" strokeOpacity="0.6"/>
        <line x1="136" y1="174" x2="136" y2="193" stroke={teal} strokeWidth="0.5" strokeOpacity="0.5"/>
        <line x1="154" y1="174" x2="154" y2="193" stroke={teal} strokeWidth="0.5" strokeOpacity="0.5"/>
        <circle cx="132" cy="182" r="2.5" fill={amber} fillOpacity="0.8"/>
        <circle cx="158" cy="182" r="2.5" fill={amber} fillOpacity="0.8"/>

        {/* ══════════════════════════════════════
            HEAD — knowledge zone
            ══════════════════════════════════════ */}
        <g
          style={{ cursor: "pointer", filter: glow("head", teal, 12), opacity: opacity("head"), transition: "all 0.25s" }}
          onClick={() => onZoneClick(activeZone === "head" ? null : "head")}
          onMouseEnter={() => onZoneHover("head")}
          onMouseLeave={() => onZoneHover(null)}
        >
          {/* Skull shape — humanoid, rounded */}
          <ellipse cx="145" cy="112" rx="54" ry="58" fill={metal} stroke={teal} strokeWidth="1.5" filter="url(#f-drop-shadow)"/>
          <ellipse cx="145" cy="108" rx="50" ry="54" fill={metalDark}/>

          {/* Circuit plate — left temple */}
          <rect x="90" y="98" width="20" height="32" rx="5" fill={metalDark} stroke={teal} strokeWidth="1" strokeOpacity="0.7"/>
          <line x1="93" y1="104" x2="107" y2="104" stroke={teal} strokeWidth="0.5" strokeOpacity="0.6"/>
          <line x1="93" y1="110" x2="107" y2="110" stroke={teal} strokeWidth="0.5" strokeOpacity="0.6"/>
          <line x1="93" y1="116" x2="107" y2="116" stroke={teal} strokeWidth="0.5" strokeOpacity="0.6"/>
          <line x1="93" y1="122" x2="107" y2="122" stroke={teal} strokeWidth="0.5" strokeOpacity="0.6"/>
          <circle cx="100" cy="113" r="3.5" fill={teal} fillOpacity="0.4"/>

          {/* Circuit plate — right temple */}
          <rect x="180" y="98" width="20" height="32" rx="5" fill={metalDark} stroke={amber} strokeWidth="1" strokeOpacity="0.7"/>
          <circle cx="190" cy="107" r="5" fill={amber} fillOpacity="0.3" stroke={amber} strokeWidth="1"/>
          <circle cx="190" cy="107" r="2.5" fill={amber} fillOpacity="0.8"/>
          <line x1="183" y1="118" x2="197" y2="118" stroke={amber} strokeWidth="0.5" strokeOpacity="0.6"/>
          <line x1="183" y1="124" x2="197" y2="124" stroke={amber} strokeWidth="0.5" strokeOpacity="0.6"/>

          {/* Ear implants */}
          <rect x="87" y="112" width="8" height="18" rx="3.5" fill={metalDark} stroke={teal} strokeWidth="1"/>
          <circle cx="91" cy="121" r="3" fill={teal} fillOpacity="0.9" style={{filter:`drop-shadow(0 0 4px ${teal})`}}/>
          <rect x="195" y="112" width="8" height="18" rx="3.5" fill={metalDark} stroke={teal} strokeWidth="1"/>
          <circle cx="199" cy="121" r="3" fill={teal} fillOpacity="0.9" style={{filter:`drop-shadow(0 0 4px ${teal})`}}/>

          {/* Skull top circuit lines */}
          <path d="M115 68 H130 V60 H160 V68 H175" stroke={teal} strokeWidth="0.7" strokeOpacity="0.4" fill="none"/>
          <circle cx="115" cy="68" r="2" fill={teal} fillOpacity="0.5"/>
          <circle cx="175" cy="68" r="2" fill={teal} fillOpacity="0.5"/>
          <path d="M130 60 V52" stroke={teal} strokeWidth="0.7" strokeOpacity="0.3"/>
          <path d="M160 60 V52" stroke={teal} strokeWidth="0.7" strokeOpacity="0.3"/>

          {/* Knowledge label */}
          {isActive("head") && (
            <g>
              <rect x="106" y="60" width="78" height="14" rx="4" fill={`${teal}20`} stroke={teal} strokeWidth="0.8"/>
              <text x="145" y="70.5" textAnchor="middle" fill={teal} fontSize="7" fontFamily="JetBrains Mono, monospace">🧠 KNOWLEDGE</text>
            </g>
          )}
        </g>

        {/* ══════════════════════════════════════
            FACE — identity zone (avatar display)
            ══════════════════════════════════════ */}
        <g
          style={{ cursor: "pointer", filter: glow("face", teal, 14), opacity: opacity("face"), transition: "all 0.25s" }}
          onClick={() => onZoneClick(activeZone === "face" ? null : "face")}
          onMouseEnter={() => onZoneHover("face")}
          onMouseLeave={() => onZoneHover(null)}
        >
          {/* Face frame — rounded rectangle display */}
          <rect x="114" y="88" width="62" height="72" rx="18" fill={dark} stroke={teal} strokeWidth="2.5"/>
          <rect x="118" y="92" width="54" height="64" rx="15" fill="url(#h-face-display)"/>

          {/* Face display scanline effect */}
          <rect x="118" y="92" width="54" height="64" rx="15" fill="none"
            style={{background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(29,184,168,0.03) 2px, rgba(29,184,168,0.03) 4px)"}}/>

          {/* Avatar emoji (large, centered in display) */}
          <text x="145" y="138" textAnchor="middle" fontSize="40" style={{filter:`drop-shadow(0 0 8px ${teal}50)`}}>
            {selectedAvatar.emoji}
          </text>

          {/* Teal ring around face display */}
          <rect x="114" y="88" width="62" height="72" rx="18" fill="none"
            stroke={teal} strokeWidth="1" strokeOpacity="0.4"
            style={{filter:`drop-shadow(0 0 6px ${teal}60)`}}/>

          {/* Corner accents */}
          <path d="M114 100 L114 88 L126 88" stroke={teal} strokeWidth="2" fill="none" strokeOpacity="0.8"/>
          <path d="M176 100 L176 88 L164 88" stroke={teal} strokeWidth="2" fill="none" strokeOpacity="0.8"/>
          <path d="M114 148 L114 160 L126 160" stroke={teal} strokeWidth="2" fill="none" strokeOpacity="0.8"/>
          <path d="M176 148 L176 160 L164 160" stroke={teal} strokeWidth="2" fill="none" strokeOpacity="0.8"/>

          {/* Face zone label */}
          {isActive("face") && (
            <g>
              <rect x="108" y="148" width="74" height="14" rx="4" fill={`${teal}20`} stroke={teal} strokeWidth="0.8"/>
              <text x="145" y="158.5" textAnchor="middle" fill={teal} fontSize="7" fontFamily="JetBrains Mono, monospace">👁 IDENTITY</text>
            </g>
          )}
        </g>

        {/* ══════════════════════════════════════
            PLUMBOB — above head
            ══════════════════════════════════════ */}
        <g>
          <line x1="145" y1="6" x2="145" y2="28" stroke="#3ec95a" strokeWidth="1.2" strokeOpacity="0.6"/>
          <polygon
            points="145,8 158,28 145,44 132,28"
            fill="#3ec95a"
            fillOpacity="0.85"
            style={{filter:"drop-shadow(0 0 10px #3ec95a)"}}
          />
          <polygon
            points="145,14 154,28 145,38 136,28"
            fill="#3ec95a"
            fillOpacity="0.35"
          />
          <polygon
            points="145,8 158,28 145,44 132,28"
            fill="none"
            stroke="#3ec95a"
            strokeWidth="0.5"
          />
        </g>
      </svg>

      {/* ══════════════════════════════════════
          AVATAR SELECTOR — 8 archetypes
          ══════════════════════════════════════ */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 300 }}>
        {AVATARS.map((av) => {
          const selected = av.id === selectedAvatarId;
          return (
            <button
              key={av.id}
              onClick={() => onAvatarSelect(av.id)}
              title={av.label}
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                border: `2px solid ${selected ? teal : "#1a2e2b"}`,
                background: selected ? `${teal}18` : "#0a1a17",
                boxShadow: selected ? `0 0 12px ${teal}60` : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                transition: "all 0.2s",
                position: "relative",
              }}
            >
              {av.emoji}
              {selected && (
                <div style={{
                  position: "absolute",
                  inset: -3,
                  borderRadius: "50%",
                  border: `2px solid ${teal}`,
                  boxShadow: `0 0 8px ${teal}`,
                  pointerEvents: "none",
                }}/>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
