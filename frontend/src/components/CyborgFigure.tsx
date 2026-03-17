// CyborgFigure — detailed SVG cyborg figure for Agent Builder
// Zones: face (Identity), head (Knowledge), heart (Specialization), hands (Tools), wallet (Settings)

import React from "react";

type Zone = "head" | "face" | "heart" | "hands" | "wallet" | null;

interface CyborgFigureProps {
  activeZone: Zone;
  hoverZone: Zone;
  specColor: string;
  avatarEmoji: string;
  onZoneClick: (z: Zone) => void;
  onZoneHover: (z: Zone) => void;
}

export function CyborgFigure({ activeZone, hoverZone, specColor, avatarEmoji, onZoneClick, onZoneHover }: CyborgFigureProps) {
  const teal = "#1db8a8";
  const amber = "#f07828";
  const dark = "#060c0b";

  const isActive = (z: Zone) => activeZone === z || hoverZone === z;
  const zoneGlow = (z: Zone, color = teal) => isActive(z) ? `drop-shadow(0 0 8px ${color})` : "none";
  const zoneOpacity = (z: Zone) => isActive(z) ? 1 : 0.75;

  return (
    <svg
      viewBox="0 0 280 520"
      width={280}
      height={520}
      style={{ overflow: "visible" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Ambient glow filter */}
        <filter id="glow-teal" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-amber">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-spec">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="body-shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.6" />
        </filter>

        {/* Radial gradient for ambient background glow */}
        <radialGradient id="ambient" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={specColor} stopOpacity="0.08" />
          <stop offset="100%" stopColor={dark} stopOpacity="0" />
        </radialGradient>

        {/* Circuit line pattern */}
        <pattern id="circuit" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 H8 M12 10 H20 M10 0 V8 M10 12 V20" stroke={teal} strokeWidth="0.4" strokeOpacity="0.2" fill="none"/>
          <circle cx="10" cy="10" r="1.5" fill={teal} fillOpacity="0.2"/>
        </pattern>

        {/* Exoskeleton gradient */}
        <linearGradient id="exo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a3030" />
          <stop offset="100%" stopColor="#0a1a17" />
        </linearGradient>

        {/* Cyborg eye glow */}
        <radialGradient id="cyber-eye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={teal} stopOpacity="1" />
          <stop offset="60%" stopColor={teal} stopOpacity="0.6" />
          <stop offset="100%" stopColor={teal} stopOpacity="0" />
        </radialGradient>

        {/* Chest window gradient */}
        <radialGradient id="chest-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={specColor} stopOpacity="0.8" />
          <stop offset="100%" stopColor={specColor} stopOpacity="0.1" />
        </radialGradient>
      </defs>

      {/* ── Background ambient glow ── */}
      <ellipse cx="140" cy="260" rx="120" ry="180" fill="url(#ambient)" />

      {/* ══════════════════════════════════════
          LEGS (bottom zone = wallet/settings)
          ══════════════════════════════════════ */}
      <g
        style={{ cursor: "pointer", filter: zoneGlow("wallet", "#3ec95a"), opacity: zoneOpacity("wallet"), transition: "all 0.3s" }}
        onClick={() => onZoneClick(activeZone === "wallet" ? null : "wallet")}
        onMouseEnter={() => onZoneHover("wallet")}
        onMouseLeave={() => onZoneHover(null)}
      >
        {/* Left leg */}
        <rect x="100" y="370" width="34" height="100" rx="8" fill="url(#exo-grad)" stroke="#1a3030" strokeWidth="1.5" />
        {/* Left leg armor plate */}
        <rect x="104" y="375" width="26" height="45" rx="5" fill="#0d2220" stroke={teal} strokeWidth="0.8" strokeOpacity="0.5" />
        <line x1="117" y1="378" x2="117" y2="416" stroke={teal} strokeWidth="0.5" strokeOpacity="0.4" />
        {/* Left knee joint */}
        <ellipse cx="117" cy="418" rx="12" ry="8" fill="#0a1a17" stroke={teal} strokeWidth="1" />
        <circle cx="117" cy="418" r="4" fill={teal} fillOpacity="0.4" />
        {/* Left lower leg */}
        <rect x="102" y="424" width="30" height="46" rx="6" fill="url(#exo-grad)" stroke="#1a3030" strokeWidth="1.5" />
        {/* Left boot */}
        <rect x="98" y="462" width="36" height="16" rx="5" fill="#0d2220" stroke={teal} strokeWidth="1" />
        <line x1="99" y1="470" x2="133" y2="470" stroke={teal} strokeWidth="0.6" strokeOpacity="0.5" />

        {/* Right leg */}
        <rect x="146" y="370" width="34" height="100" rx="8" fill="url(#exo-grad)" stroke="#1a3030" strokeWidth="1.5" />
        <rect x="150" y="375" width="26" height="45" rx="5" fill="#0d2220" stroke={teal} strokeWidth="0.8" strokeOpacity="0.5" />
        <line x1="163" y1="378" x2="163" y2="416" stroke={teal} strokeWidth="0.5" strokeOpacity="0.4" />
        <ellipse cx="163" cy="418" rx="12" ry="8" fill="#0a1a17" stroke={teal} strokeWidth="1" />
        <circle cx="163" cy="418" r="4" fill={teal} fillOpacity="0.4" />
        <rect x="148" y="424" width="30" height="46" rx="6" fill="url(#exo-grad)" stroke="#1a3030" strokeWidth="1.5" />
        <rect x="146" y="462" width="36" height="16" rx="5" fill="#0d2220" stroke={teal} strokeWidth="1" />
        <line x1="147" y1="470" x2="181" y2="470" stroke={teal} strokeWidth="0.6" strokeOpacity="0.5" />

        {/* Wallet zone label */}
        {isActive("wallet") && (
          <g>
            <rect x="106" y="487" width="68" height="14" rx="3" fill="#3ec95a22" stroke="#3ec95a" strokeWidth="0.8" />
            <text x="140" y="497.5" textAnchor="middle" fill="#3ec95a" fontSize="7" fontFamily="JetBrains Mono, monospace">⚙ SETTINGS</text>
          </g>
        )}
      </g>

      {/* ══════════════════════════════════════
          LEFT ARM — human with cyborg details (hands zone)
          ══════════════════════════════════════ */}
      <g
        style={{ cursor: "pointer", filter: zoneGlow("hands", amber), opacity: zoneOpacity("hands"), transition: "all 0.3s" }}
        onClick={() => onZoneClick(activeZone === "hands" ? null : "hands")}
        onMouseEnter={() => onZoneHover("hands")}
        onMouseLeave={() => onZoneHover(null)}
      >
        {/* Upper left arm */}
        <rect x="58" y="185" width="30" height="80" rx="12" fill="url(#exo-grad)" stroke="#1a3030" strokeWidth="1.5" />
        <line x1="73" y1="190" x2="73" y2="260" stroke={teal} strokeWidth="0.6" strokeOpacity="0.3" />
        {/* Left elbow joint */}
        <circle cx="73" cy="265" r="10" fill="#0a1a17" stroke={teal} strokeWidth="1.2" />
        <circle cx="73" cy="265" r="4" fill={amber} fillOpacity="0.6" />
        {/* Lower left arm — human-ish */}
        <rect x="60" y="272" width="26" height="60" rx="10" fill="#1a2e2b" stroke={teal} strokeWidth="1" strokeOpacity="0.6" />
        {/* Wrist holographic display */}
        <rect x="58" y="328" width="30" height="12" rx="4" fill="#0d1a17" stroke={teal} strokeWidth="1" />
        <rect x="62" y="330" width="22" height="8" rx="2" fill={teal} fillOpacity="0.15" />
        <line x1="65" y1="334" x2="80" y2="334" stroke={teal} strokeWidth="0.8" strokeOpacity="0.7" />
        <line x1="65" y1="336" x2="74" y2="336" stroke={teal} strokeWidth="0.5" strokeOpacity="0.5" />
        {/* Left hand — human fingers */}
        <rect x="62" y="338" width="22" height="28" rx="8" fill="#1a2e2b" stroke={teal} strokeWidth="0.8" strokeOpacity="0.5" />
        <line x1="68" y1="340" x2="68" y2="364" stroke={teal} strokeWidth="0.4" strokeOpacity="0.3" />
        <line x1="74" y1="340" x2="74" y2="365" stroke={teal} strokeWidth="0.4" strokeOpacity="0.3" />
        <line x1="80" y1="340" x2="80" y2="363" stroke={teal} strokeWidth="0.4" strokeOpacity="0.3" />
      </g>

      {/* ══════════════════════════════════════
          RIGHT ARM — mechanical (hands zone)
          ══════════════════════════════════════ */}
      <g
        style={{ cursor: "pointer", filter: zoneGlow("hands", amber), opacity: zoneOpacity("hands"), transition: "all 0.3s" }}
        onClick={() => onZoneClick(activeZone === "hands" ? null : "hands")}
        onMouseEnter={() => onZoneHover("hands")}
        onMouseLeave={() => onZoneHover(null)}
      >
        {/* Upper right arm — mechanical */}
        <rect x="192" y="185" width="30" height="80" rx="8" fill="#0d1f1c" stroke={amber} strokeWidth="1.5" />
        {/* Mechanical segments */}
        <line x1="192" y1="210" x2="222" y2="210" stroke={amber} strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="192" y1="235" x2="222" y2="235" stroke={amber} strokeWidth="0.8" strokeOpacity="0.6" />
        <rect x="196" y="212" width="18" height="20" rx="2" fill={amber} fillOpacity="0.08" stroke={amber} strokeWidth="0.5" strokeOpacity="0.4" />
        {/* Right elbow — mechanical joint */}
        <circle cx="207" cy="266" r="11" fill="#0a1a17" stroke={amber} strokeWidth="1.5" />
        <circle cx="207" cy="266" r="5" fill={amber} fillOpacity="0.5" />
        <circle cx="207" cy="266" r="2" fill={amber} />
        {/* Lower right arm — mechanical */}
        <rect x="194" y="274" width="26" height="58" rx="6" fill="#0d1f1c" stroke={amber} strokeWidth="1.2" />
        <line x1="198" y1="280" x2="216" y2="280" stroke={amber} strokeWidth="0.6" strokeOpacity="0.5" />
        <line x1="198" y1="295" x2="216" y2="295" stroke={amber} strokeWidth="0.6" strokeOpacity="0.5" />
        <line x1="198" y1="310" x2="216" y2="310" stroke={amber} strokeWidth="0.6" strokeOpacity="0.5" />
        {/* Mechanical wrist */}
        <rect x="193" y="330" width="28" height="10" rx="3" fill="#0a1a17" stroke={amber} strokeWidth="1" />
        {/* Mechanical fingers/manipulators */}
        <rect x="196" y="338" width="6" height="22" rx="3" fill="#0d1f1c" stroke={amber} strokeWidth="1" />
        <rect x="205" y="338" width="6" height="25" rx="3" fill="#0d1f1c" stroke={amber} strokeWidth="1" />
        <rect x="214" y="338" width="6" height="20" rx="3" fill="#0d1f1c" stroke={amber} strokeWidth="1" />
        <circle cx="199" cy="338" r="2.5" fill={amber} fillOpacity="0.7" />
        <circle cx="208" cy="338" r="2.5" fill={amber} fillOpacity="0.7" />
        <circle cx="217" cy="338" r="2.5" fill={amber} fillOpacity="0.7" />

        {/* Hands zone label */}
        {isActive("hands") && (
          <g>
            <rect x="146" y="360" width="62" height="14" rx="3" fill={`${amber}22`} stroke={amber} strokeWidth="0.8" />
            <text x="177" y="370.5" textAnchor="middle" fill={amber} fontSize="7" fontFamily="JetBrains Mono, monospace">🤝 TOOLS</text>
          </g>
        )}
      </g>

      {/* ══════════════════════════════════════
          TORSO / HEART (specialization zone)
          ══════════════════════════════════════ */}
      <g
        style={{ cursor: "pointer", filter: zoneGlow("heart", specColor), opacity: zoneOpacity("heart"), transition: "all 0.3s" }}
        onClick={() => onZoneClick(activeZone === "heart" ? null : "heart")}
        onMouseEnter={() => onZoneHover("heart")}
        onMouseLeave={() => onZoneHover(null)}
      >
        {/* Main torso body */}
        <rect x="88" y="180" width="104" height="180" rx="16" fill="url(#exo-grad)" stroke="#1a3030" strokeWidth="1.5" filter="url(#body-shadow)" />

        {/* Exoskeleton overlay */}
        <rect x="92" y="184" width="96" height="172" rx="13" fill="none" stroke={teal} strokeWidth="0.8" strokeOpacity="0.3" />

        {/* Circuit board overlay on torso */}
        <rect x="92" y="184" width="96" height="172" rx="13" fill="url(#circuit)" fillOpacity="0.5" />

        {/* Shoulder pads */}
        <rect x="82" y="178" width="36" height="28" rx="8" fill="#0d2220" stroke={teal} strokeWidth="1.2" />
        <circle cx="91" cy="187" r="3" fill={teal} fillOpacity="0.8" />
        <circle cx="101" cy="187" r="3" fill={amber} fillOpacity="0.7" />
        <circle cx="111" cy="187" r="3" fill={teal} fillOpacity="0.6" />

        <rect x="162" y="178" width="36" height="28" rx="8" fill="#0d2220" stroke={teal} strokeWidth="1.2" />
        <circle cx="169" cy="187" r="3" fill={teal} fillOpacity="0.6" />
        <circle cx="179" cy="187" r="3" fill={amber} fillOpacity="0.7" />
        <circle cx="189" cy="187" r="3" fill={teal} fillOpacity="0.8" />

        {/* Chest window — core/heart display */}
        <rect x="114" y="210" width="52" height="52" rx="10" fill="#060c0b" stroke={specColor} strokeWidth="2" />
        <rect x="118" y="214" width="44" height="44" rx="7" fill="url(#chest-glow)" fillOpacity="0.15" />

        {/* Heart icon inside chest */}
        <path d="M140 248 C140 248 124 238 124 229 C124 224 128 220 133 220 C136 220 138 222 140 224 C142 222 144 220 147 220 C152 220 156 224 156 229 C156 238 140 248 140 248Z"
          fill={specColor} fillOpacity="0.7" />
        <path d="M140 248 C140 248 124 238 124 229 C124 224 128 220 133 220 C136 220 138 222 140 224 C142 222 144 220 147 220 C152 220 156 224 156 229 C156 238 140 248 140 248Z"
          fill="none" stroke={specColor} strokeWidth="1" />

        {/* Circuit lines from chest */}
        <line x1="166" y1="236" x2="180" y2="236" stroke={specColor} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="180" y1="236" x2="180" y2="250" stroke={specColor} strokeWidth="1" strokeOpacity="0.4" />
        <line x1="114" y1="236" x2="100" y2="236" stroke={specColor} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="100" y1="236" x2="100" y2="250" stroke={specColor} strokeWidth="1" strokeOpacity="0.4" />
        <line x1="140" y1="262" x2="140" y2="278" stroke={specColor} strokeWidth="1" strokeOpacity="0.5" />

        {/* Torso circuit lines */}
        <path d="M105 285 H125 M125 285 V300 H155 M155 300 V285 H170" stroke={teal} strokeWidth="0.8" strokeOpacity="0.35" fill="none" />
        <path d="M105 310 H120 V325 H160 V310 H175" stroke={teal} strokeWidth="0.8" strokeOpacity="0.3" fill="none" />
        <circle cx="125" cy="285" r="2" fill={teal} fillOpacity="0.5" />
        <circle cx="155" cy="300" r="2" fill={teal} fillOpacity="0.5" />
        <circle cx="120" cy="325" r="2" fill={amber} fillOpacity="0.6" />
        <circle cx="160" cy="325" r="2" fill={amber} fillOpacity="0.6" />

        {/* Energy lines on sides */}
        <line x1="92" y1="280" x2="92" y2="320" stroke={teal} strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="188" y1="280" x2="188" y2="320" stroke={teal} strokeWidth="1.5" strokeOpacity="0.4" />

        {/* Belt / waist separator */}
        <rect x="95" y="350" width="90" height="12" rx="4" fill="#0d2220" stroke={teal} strokeWidth="1" />
        <rect x="130" y="352" width="20" height="8" rx="2" fill={amber} fillOpacity="0.3" stroke={amber} strokeWidth="0.8" />

        {/* Chest zone label */}
        {isActive("heart") && (
          <g>
            <rect x="104" y="290" width="72" height="14" rx="3" fill={`${specColor}22`} stroke={specColor} strokeWidth="0.8" />
            <text x="140" y="300.5" textAnchor="middle" fill={specColor} fontSize="7" fontFamily="JetBrains Mono, monospace">❤ SPECIALIZATION</text>
          </g>
        )}
      </g>

      {/* Neck */}
      <rect x="126" y="160" width="28" height="26" rx="6" fill="#0d2220" stroke={teal} strokeWidth="1" />
      <line x1="134" y1="162" x2="134" y2="184" stroke={teal} strokeWidth="0.5" strokeOpacity="0.5" />
      <line x1="146" y1="162" x2="146" y2="184" stroke={teal} strokeWidth="0.5" strokeOpacity="0.5" />
      {/* Neck ports */}
      <circle cx="130" cy="170" r="2.5" fill={amber} fillOpacity="0.7" />
      <circle cx="150" cy="170" r="2.5" fill={amber} fillOpacity="0.7" />

      {/* ══════════════════════════════════════
          HEAD — knowledge zone
          ══════════════════════════════════════ */}
      <g
        style={{ cursor: "pointer", filter: zoneGlow("head"), opacity: zoneOpacity("head"), transition: "all 0.3s" }}
        onClick={() => onZoneClick(activeZone === "head" ? null : "head")}
        onMouseEnter={() => onZoneHover("head")}
        onMouseLeave={() => onZoneHover(null)}
      >
        {/* Skull / head shape */}
        <ellipse cx="140" cy="108" rx="50" ry="54" fill="#0d2220" stroke={teal} strokeWidth="1.5" />
        <ellipse cx="140" cy="108" rx="46" ry="50" fill="#0a1a17" stroke="none" />

        {/* Circuit lines on skull */}
        <path d="M108 90 H118 V80 H130" stroke={teal} strokeWidth="0.7" strokeOpacity="0.4" fill="none" />
        <path d="M172 90 H162 V80 H150" stroke={teal} strokeWidth="0.7" strokeOpacity="0.4" fill="none" />
        <path d="M118 80 V72" stroke={teal} strokeWidth="0.7" strokeOpacity="0.3" fill="none" />
        <path d="M162 80 V72" stroke={teal} strokeWidth="0.7" strokeOpacity="0.3" fill="none" />
        <circle cx="118" cy="72" r="2" fill={teal} fillOpacity="0.6" />
        <circle cx="162" cy="72" r="2" fill={teal} fillOpacity="0.6" />

        {/* Left temple — circuit board plate */}
        <rect x="90" y="95" width="22" height="30" rx="4" fill="#0d2e2a" stroke={teal} strokeWidth="1" strokeOpacity="0.7" />
        <line x1="93" y1="100" x2="109" y2="100" stroke={teal} strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1="93" y1="106" x2="109" y2="106" stroke={teal} strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1="93" y1="112" x2="109" y2="112" stroke={teal} strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1="93" y1="118" x2="109" y2="118" stroke={teal} strokeWidth="0.5" strokeOpacity="0.6" />
        <circle cx="99" cy="109" r="3" fill={teal} fillOpacity="0.4" />

        {/* Right temple implant */}
        <rect x="168" y="95" width="22" height="30" rx="4" fill="#0d2e2a" stroke={amber} strokeWidth="1" strokeOpacity="0.7" />
        <circle cx="179" cy="103" r="4" fill={amber} fillOpacity="0.3" stroke={amber} strokeWidth="1" />
        <circle cx="179" cy="103" r="2" fill={amber} fillOpacity="0.7" />
        <line x1="171" y1="113" x2="187" y2="113" stroke={amber} strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1="171" y1="118" x2="187" y2="118" stroke={amber} strokeWidth="0.5" strokeOpacity="0.6" />

        {/* Ear implants */}
        <rect x="86" y="110" width="8" height="16" rx="3" fill="#0d2220" stroke={teal} strokeWidth="1" />
        <circle cx="90" cy="118" r="2.5" fill={teal} fillOpacity="0.8" />
        <rect x="186" y="110" width="8" height="16" rx="3" fill="#0d2220" stroke={teal} strokeWidth="1" />
        <circle cx="190" cy="118" r="2.5" fill={teal} fillOpacity="0.8" />

        {/* Brain glow at top of head */}
        <ellipse cx="140" cy="72" rx="30" ry="18" fill={teal} fillOpacity="0.05" stroke={teal} strokeWidth="0.5" strokeOpacity="0.3" />

        {/* Head zone label */}
        {isActive("head") && (
          <g>
            <rect x="100" y="55" width="80" height="14" rx="3" fill={`${teal}22`} stroke={teal} strokeWidth="0.8" />
            <text x="140" y="65.5" textAnchor="middle" fill={teal} fontSize="7" fontFamily="JetBrains Mono, monospace">🧠 KNOWLEDGE</text>
          </g>
        )}
      </g>

      {/* ══════════════════════════════════════
          FACE — identity zone (on top of head)
          ══════════════════════════════════════ */}
      <g
        style={{ cursor: "pointer", filter: zoneGlow("face"), opacity: zoneOpacity("face"), transition: "all 0.3s" }}
        onClick={() => onZoneClick(activeZone === "face" ? null : "face")}
        onMouseEnter={() => onZoneHover("face")}
        onMouseLeave={() => onZoneHover(null)}
      >
        {/* Face mask / lower face area */}
        <ellipse cx="140" cy="120" rx="36" ry="30" fill="#0a1a17" />

        {/* LEFT EYE — human */}
        <ellipse cx="124" cy="108" rx="9" ry="7" fill="#0a1a17" stroke={teal} strokeWidth="1" strokeOpacity="0.5" />
        <ellipse cx="124" cy="108" rx="6" ry="5" fill="#1a3030" />
        <ellipse cx="124" cy="108" rx="3.5" ry="3.5" fill="#0a1a17" />
        <ellipse cx="122" cy="106" rx="1.2" ry="1.2" fill="white" fillOpacity="0.6" />

        {/* RIGHT EYE — cyborg/glowing teal */}
        <ellipse cx="156" cy="108" rx="9" ry="7" fill="#061310" stroke={teal} strokeWidth="1.5" />
        <ellipse cx="156" cy="108" rx="6" ry="5" fill={teal} fillOpacity="0.2" />
        <circle cx="156" cy="108" r="4" fill="url(#cyber-eye)" />
        <circle cx="156" cy="108" r="2" fill={teal} />
        {/* Cyborg eye scan line */}
        <line x1="147" y1="108" x2="165" y2="108" stroke={teal} strokeWidth="0.6" strokeOpacity="0.5" />
        {/* Eye glow rings */}
        <circle cx="156" cy="108" r="8" fill="none" stroke={teal} strokeWidth="0.5" strokeOpacity="0.3" />

        {/* Nose (minimal) */}
        <path d="M138 118 Q140 123 142 118" stroke={teal} strokeWidth="0.8" strokeOpacity="0.3" fill="none" />

        {/* Mouth — LED display mouth */}
        <rect x="126" y="128" width="28" height="8" rx="4" fill="#060c0b" stroke={teal} strokeWidth="0.8" />
        <rect x="129" y="130" width="22" height="4" rx="2" fill={teal} fillOpacity="0.2" />
        {/* Mouth LED dots */}
        <circle cx="133" cy="132" r="1.2" fill={teal} fillOpacity="0.8" />
        <circle cx="138" cy="132" r="1.2" fill={teal} fillOpacity="0.8" />
        <circle cx="143" cy="132" r="1.2" fill={teal} fillOpacity="0.8" />
        <circle cx="148" cy="132" r="1.2" fill={teal} fillOpacity="0.5" />

        {/* Avatar emoji overlay — small, floating above head */}
        <text x="140" y="96" textAnchor="middle" fontSize="14" style={{ filter: "drop-shadow(0 0 6px rgba(29,184,168,0.6))" }}>
          {avatarEmoji}
        </text>

        {/* Face zone label */}
        {isActive("face") && (
          <g>
            <rect x="104" y="140" width="72" height="14" rx="3" fill={`${teal}22`} stroke={teal} strokeWidth="0.8" />
            <text x="140" y="150.5" textAnchor="middle" fill={teal} fontSize="7" fontFamily="JetBrains Mono, monospace">👁 IDENTITY</text>
          </g>
        )}
      </g>

      {/* ══════════════════════════════════════
          PLUMBOB — above head
          ══════════════════════════════════════ */}
      <g>
        <line x1="140" y1="10" x2="140" y2="28" stroke="#3ec95a" strokeWidth="1" strokeOpacity="0.5" />
        <polygon
          points="140,14 150,30 140,42 130,30"
          fill="#3ec95a"
          fillOpacity="0.8"
          stroke="#3ec95a"
          strokeWidth="0.5"
          style={{ filter: "drop-shadow(0 0 8px #3ec95a)", animation: "none" }}
        />
        <polygon
          points="140,18 148,30 140,38 132,30"
          fill="#3ec95a"
          fillOpacity="0.4"
        />
      </g>
    </svg>
  );
}
