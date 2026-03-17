"use client";
import React, { useId } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FaceParams {
  faceShape: "oval" | "round" | "square" | "heart";
  skinColor: string;
  hair: "short" | "long" | "curly" | "bald" | "ponytail" | "afro" | "business" | "pixie" | "bob" | "undercut";
  hairColor: "black" | "brown" | "blonde" | "red" | "gray" | "white";
  eyes: "normal" | "asian" | "wide" | "tired";
  eyeColor: "brown" | "blue" | "green" | "gray";
  nose: "small" | "medium" | "wide";
  mouth: "smile" | "neutral" | "serious";
  eyebrows: "normal" | "thick" | "thin" | "arched";
  beard: "none" | "stubble" | "short" | "long" | "mustache";
  glasses: "none" | "round" | "square" | "sunglasses";
}

export const PRESETS: Record<string, FaceParams> = {
  "sexy-student": { faceShape: "oval", skinColor: "#F5CBA7", hair: "long", hairColor: "brown", eyes: "normal", eyeColor: "brown", nose: "small", mouth: "smile", eyebrows: "arched", beard: "none", glasses: "none" },
  "professor": { faceShape: "square", skinColor: "#C68642", hair: "short", hairColor: "gray", eyes: "tired", eyeColor: "brown", nose: "medium", mouth: "serious", eyebrows: "thick", beard: "long", glasses: "round" },
  "it-nerd": { faceShape: "oval", skinColor: "#FDDBB4", hair: "short", hairColor: "brown", eyes: "normal", eyeColor: "blue", nose: "small", mouth: "neutral", eyebrows: "normal", beard: "none", glasses: "square" },
  "teacher": { faceShape: "heart", skinColor: "#C68642", hair: "business", hairColor: "black", eyes: "normal", eyeColor: "brown", nose: "medium", mouth: "neutral", eyebrows: "arched", beard: "none", glasses: "round" },
  "journalist": { faceShape: "oval", skinColor: "#F5CBA7", hair: "ponytail", hairColor: "red", eyes: "normal", eyeColor: "green", nose: "small", mouth: "smile", eyebrows: "arched", beard: "none", glasses: "none" },
  "black-worker": { faceShape: "round", skinColor: "#4A2912", hair: "short", hairColor: "black", eyes: "normal", eyeColor: "brown", nose: "wide", mouth: "smile", eyebrows: "thick", beard: "stubble", glasses: "none" },
  "indian-dev": { faceShape: "oval", skinColor: "#8D5524", hair: "short", hairColor: "black", eyes: "normal", eyeColor: "brown", nose: "medium", mouth: "neutral", eyebrows: "normal", beard: "stubble", glasses: "none" },
  "ai": { faceShape: "square", skinColor: "#5a7a8a", hair: "bald", hairColor: "black", eyes: "wide", eyeColor: "blue", nose: "small", mouth: "serious", eyebrows: "thin", beard: "none", glasses: "none" },
};

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const HAIR_HEX: Record<FaceParams["hairColor"], string> = {
  black: "#1a1008",
  brown: "#4a2f1a",
  blonde: "#d4a843",
  red: "#8b2500",
  gray: "#8a8a8a",
  white: "#e8e8e8",
};

const EYE_HEX: Record<FaceParams["eyeColor"], string> = {
  brown: "#4e2e0e",
  blue: "#3b7dd8",
  green: "#3d8b37",
  gray: "#7a8a8a",
};

function darken(hex: string, amount = 0.2): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function blushColor(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + 30);
  const g = Math.max(0, ((n >> 8) & 0xff) - 10);
  const b = Math.max(0, (n & 0xff) - 10);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------------------

function renderFaceShape(shape: FaceParams["faceShape"], fill: string) {
  switch (shape) {
    case "oval":
      return <ellipse cx={100} cy={120} rx={65} ry={80} fill={fill} />;
    case "round":
      return <ellipse cx={100} cy={120} rx={72} ry={72} fill={fill} />;
    case "square":
      return <rect x={35} y={45} width={130} height={150} rx={12} fill={fill} />;
    case "heart":
      return (
        <path
          d="M100,195 C60,195 35,160 35,120 C35,80 55,50 75,45 Q90,40 100,55 Q110,40 125,45 C145,50 165,80 165,120 C165,160 140,195 100,195Z"
          fill={fill}
        />
      );
  }
}

function renderFaceClip(shape: FaceParams["faceShape"]) {
  switch (shape) {
    case "oval":
      return <ellipse cx={100} cy={120} rx={65} ry={80} />;
    case "round":
      return <ellipse cx={100} cy={120} rx={72} ry={72} />;
    case "square":
      return <rect x={35} y={45} width={130} height={150} rx={12} />;
    case "heart":
      return (
        <path d="M100,195 C60,195 35,160 35,120 C35,80 55,50 75,45 Q90,40 100,55 Q110,40 125,45 C145,50 165,80 165,120 C165,160 140,195 100,195Z" />
      );
  }
}

function renderEars(skinColor: string, faceShape: FaceParams["faceShape"]) {
  const y = 112;
  const lx = faceShape === "round" ? 28 : faceShape === "square" ? 32 : 35;
  const rx = faceShape === "round" ? 172 : faceShape === "square" ? 168 : 165;
  return (
    <>
      <ellipse cx={lx} cy={y} rx={8} ry={12} fill={skinColor} />
      <ellipse cx={rx} cy={y} rx={8} ry={12} fill={skinColor} />
      <ellipse cx={lx} cy={y} rx={4} ry={7} fill={darken(skinColor, 0.1)} opacity={0.4} />
      <ellipse cx={rx} cy={y} rx={4} ry={7} fill={darken(skinColor, 0.1)} opacity={0.4} />
    </>
  );
}

function renderSkinDetails(skinColor: string) {
  return (
    <>
      <ellipse cx={65} cy={130} rx={14} ry={8} fill={blushColor(skinColor)} opacity={0.18} />
      <ellipse cx={135} cy={130} rx={14} ry={8} fill={blushColor(skinColor)} opacity={0.18} />
      <ellipse cx={100} cy={75} rx={20} ry={8} fill="#ffffff" opacity={0.12} />
      <ellipse cx={100} cy={185} rx={40} ry={15} fill={darken(skinColor, 0.15)} opacity={0.1} />
    </>
  );
}

function renderBackHair(hair: FaceParams["hair"], color: string) {
  switch (hair) {
    case "long":
      return (
        <>
          <path d="M35,80 Q35,60 50,50 Q70,38 100,35 Q130,38 150,50 Q165,60 165,80 L165,220 Q150,230 135,225 L135,100 L65,100 L65,225 Q50,230 35,220Z" fill={color} />
        </>
      );
    case "ponytail":
      return (
        <path d="M140,55 Q160,50 170,60 Q180,70 175,90 Q170,100 160,95 Q155,85 150,70Z" fill={color} />
      );
    case "bob":
      return (
        <path d="M35,80 Q35,55 55,45 Q75,35 100,33 Q125,35 145,45 Q165,55 165,80 L165,160 Q155,165 145,158 L145,100 L55,100 L55,158 Q45,165 35,160Z" fill={color} />
      );
    case "afro":
      return (
        <ellipse cx={100} cy={75} rx={90} ry={75} fill={color} />
      );
    default:
      return null;
  }
}

function renderFrontHair(hair: FaceParams["hair"], color: string) {
  const dark = darken(color, 0.12);
  switch (hair) {
    case "short":
      return (
        <>
          <path d="M40,85 Q40,50 60,40 Q80,30 100,28 Q120,30 140,40 Q160,50 160,85 Q140,60 100,55 Q60,60 40,85Z" fill={color} />
          <path d="M50,78 Q60,55 100,50 Q140,55 150,78 Q140,62 100,58 Q60,62 50,78Z" fill={dark} opacity={0.5} />
        </>
      );
    case "long":
      return (
        <>
          <path d="M35,85 Q35,50 55,40 Q75,28 100,25 Q125,28 145,40 Q165,50 165,85 Q145,60 100,55 Q55,60 35,85Z" fill={color} />
          <path d="M40,90 Q55,60 100,52 Q145,60 160,90 Q145,68 100,62 Q55,68 40,90Z" fill={dark} opacity={0.4} />
        </>
      );
    case "curly":
      return (
        <path
          d="M35,90 Q30,60 50,42 Q60,34 75,30 Q85,28 100,27 Q115,28 125,30 Q140,34 150,42 Q170,60 165,90 Q158,70 145,58 Q130,48 100,45 Q70,48 55,58 Q42,70 35,90Z"
          fill={color}
          strokeWidth={0}
        />
      );
    case "bald":
      return (
        <ellipse cx={105} cy={58} rx={12} ry={5} fill="#ffffff" opacity={0.08} />
      );
    case "ponytail":
      return (
        <>
          <path d="M38,88 Q38,52 58,42 Q78,30 100,28 Q122,30 142,42 Q162,52 162,88 Q142,62 100,57 Q58,62 38,88Z" fill={color} />
          <path d="M130,48 Q145,40 155,45 L160,55 Q150,48 140,52Z" fill={dark} opacity={0.5} />
        </>
      );
    case "afro":
      return (
        <>
          <path d="M15,90 Q10,40 40,20 Q70,2 100,0 Q130,2 160,20 Q190,40 185,90 Q170,55 100,42 Q30,55 15,90Z" fill={color} />
          <ellipse cx={100} cy={30} rx={50} ry={20} fill={dark} opacity={0.25} />
        </>
      );
    case "business":
      return (
        <>
          <path d="M38,88 Q38,50 60,40 Q80,30 100,28 Q120,30 145,38 Q165,48 162,88 Q150,58 120,48 Q95,44 70,50 Q50,58 38,88Z" fill={color} />
          <path d="M60,50 Q80,40 110,42 Q140,44 155,55 Q140,48 110,45 Q80,44 60,50Z" fill={dark} opacity={0.4} />
        </>
      );
    case "pixie":
      return (
        <>
          <path d="M42,90 Q40,55 58,42 Q78,30 100,28 Q130,30 150,45 Q160,55 158,80 Q148,58 120,48 Q95,44 70,50 Q50,60 42,90Z" fill={color} />
          <path d="M42,85 Q38,60 55,48 Q45,65 42,85Z" fill={dark} opacity={0.4} />
        </>
      );
    case "bob":
      return (
        <>
          <path d="M35,85 Q35,50 55,40 Q75,28 100,26 Q125,28 145,40 Q165,50 165,85 Q145,60 100,55 Q55,60 35,85Z" fill={color} />
          <path d="M42,90 Q55,62 100,56 Q145,62 158,90 Q145,72 100,66 Q55,72 42,90Z" fill={dark} opacity={0.35} />
        </>
      );
    case "undercut":
      return (
        <>
          <path d="M42,95 Q44,70 55,62 Q65,55 80,54 L80,42 Q95,35 110,35 Q135,38 150,48 Q160,58 158,90 Q148,60 120,48 Q100,42 85,46 L85,58 Q65,62 55,72 Q48,80 42,95Z" fill={color} />
          <path d="M42,95 Q44,75 55,68 Q42,80 42,95Z" fill={dark} opacity={0.3} />
        </>
      );
    default:
      return null;
  }
}

function renderEyebrow(side: "left" | "right", type: FaceParams["eyebrows"], color: string) {
  const cx = side === "left" ? 72 : 128;
  const dir = side === "left" ? -1 : 1;
  const sw = type === "thick" ? 3.5 : type === "thin" ? 1.2 : 2;
  const y = type === "thick" ? 97 : 96;

  switch (type) {
    case "normal":
      return (
        <path
          d={`M${cx - 12 * dir},${y + 1} Q${cx},${y - 3} ${cx + 12 * dir},${y}`}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        />
      );
    case "thick":
      return (
        <path
          d={`M${cx - 13 * dir},${y + 1} Q${cx},${y - 4} ${cx + 13 * dir},${y}`}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        />
      );
    case "thin":
      return (
        <path
          d={`M${cx - 11 * dir},${y + 1} Q${cx},${y - 2} ${cx + 11 * dir},${y}`}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        />
      );
    case "arched":
      return (
        <path
          d={`M${cx - 12 * dir},${y + 2} Q${cx - 2 * dir},${y - 6} ${cx + 12 * dir},${y}`}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        />
      );
  }
}

function renderEye(side: "left" | "right", type: FaceParams["eyes"], irisColor: string) {
  const cx = side === "left" ? 72 : 128;
  const cy = 110;

  const eyeW = 11;
  const eyeH = type === "asian" ? 3.5 : type === "wide" ? 6.5 : type === "tired" ? 4.5 : 5;
  const irisR = type === "wide" ? 5.5 : 4.5;
  const pupilR = 2.2;

  const outerTilt = type === "asian" ? -2 : type === "tired" ? 2 : 0;

  return (
    <g>
      {/* Eye white */}
      <ellipse cx={cx} cy={cy} rx={eyeW} ry={eyeH} fill="#f5f5f0" />
      {/* Upper lid line */}
      <path
        d={`M${cx - eyeW},${cy} Q${cx},${cy - eyeH - 2} ${cx + eyeW},${cy + outerTilt}`}
        fill="none" stroke={darken(irisColor, 0.6)} strokeWidth={1.2} strokeLinecap="round"
      />
      {/* Lower lid subtle line */}
      <path
        d={`M${cx - eyeW},${cy} Q${cx},${cy + eyeH + 1} ${cx + eyeW},${cy + outerTilt}`}
        fill="none" stroke="#00000020" strokeWidth={0.6}
      />
      {/* Iris */}
      <circle cx={cx} cy={cy} r={irisR} fill={irisColor} />
      {/* Pupil */}
      <circle cx={cx} cy={cy} r={pupilR} fill="#0a0a0a" />
      {/* Iris highlight */}
      <circle cx={cx - 1.5} cy={cy - 1.5} r={1.4} fill="#ffffff" opacity={0.7} />
      {/* Eyelashes */}
      {[0.2, 0.4, 0.6, 0.8].map((t, i) => {
        const lx = cx - eyeW + t * eyeW * 2;
        const ly = cy - eyeH + Math.abs(t - 0.5) * 3;
        return (
          <line
            key={i}
            x1={lx} y1={ly} x2={lx + (t < 0.5 ? -0.8 : 0.8)} y2={ly - 2.5}
            stroke="#1a1008" strokeWidth={0.7} strokeLinecap="round"
          />
        );
      })}
      {/* Tired: heavy upper lid */}
      {type === "tired" && (
        <path
          d={`M${cx - eyeW - 1},${cy - 1} Q${cx},${cy - eyeH} ${cx + eyeW + 1},${cy - 1 + outerTilt}`}
          fill="none" stroke="#00000030" strokeWidth={2.5} strokeLinecap="round"
        />
      )}
    </g>
  );
}

function renderNose(type: FaceParams["nose"], skinColor: string) {
  const shadow = darken(skinColor, 0.25);
  switch (type) {
    case "small":
      return (
        <g>
          <path d="M98,122 L96,134 Q100,137 104,134 L102,122" fill="none" stroke={shadow} strokeWidth={0.8} opacity={0.6} />
          <circle cx={95} cy={135} r={1.5} fill={shadow} opacity={0.5} />
          <circle cx={105} cy={135} r={1.5} fill={shadow} opacity={0.5} />
        </g>
      );
    case "medium":
      return (
        <g>
          <path d="M99,118 L94,134 Q100,138 106,134 L101,118" fill="none" stroke={shadow} strokeWidth={1} opacity={0.6} />
          <circle cx={93} cy={135} r={2} fill={shadow} opacity={0.45} />
          <circle cx={107} cy={135} r={2} fill={shadow} opacity={0.45} />
        </g>
      );
    case "wide":
      return (
        <g>
          <path d="M99,120 L90,135 Q100,140 110,135 L101,120" fill="none" stroke={shadow} strokeWidth={1.1} opacity={0.55} />
          <ellipse cx={90} cy={136} rx={3} ry={2} fill={shadow} opacity={0.4} />
          <ellipse cx={110} cy={136} rx={3} ry={2} fill={shadow} opacity={0.4} />
        </g>
      );
  }
}

function renderMouth(type: FaceParams["mouth"], skinColor: string) {
  const lipColor = darken(skinColor, 0.15);
  const lipDark = darken(skinColor, 0.3);
  switch (type) {
    case "smile":
      return (
        <g>
          <path d="M72,155 Q100,172 128,155" fill="none" stroke={lipDark} strokeWidth={2} strokeLinecap="round" />
          <path d="M76,155 Q100,168 124,155" fill={lipColor} opacity={0.5} />
        </g>
      );
    case "neutral":
      return (
        <g>
          <line x1={78} y1={157} x2={122} y2={157} stroke={lipDark} strokeWidth={1.8} strokeLinecap="round" />
          <path d="M80,157 L120,157 L118,160 Q100,163 82,160Z" fill={lipColor} opacity={0.35} />
        </g>
      );
    case "serious":
      return (
        <g>
          <path d="M76,155 Q100,154 124,155" fill="none" stroke={lipDark} strokeWidth={1.8} strokeLinecap="round" />
          <path d="M78,155 Q85,158 100,158 Q115,158 122,155" fill={lipColor} opacity={0.4} />
          <line x1={74} y1={156} x2={78} y2={157} stroke={lipDark} strokeWidth={1} strokeLinecap="round" opacity={0.6} />
          <line x1={126} y1={156} x2={122} y2={157} stroke={lipDark} strokeWidth={1} strokeLinecap="round" opacity={0.6} />
        </g>
      );
  }
}

function renderBeard(type: FaceParams["beard"], skinColor: string, hairColor: string) {
  const beardColor = type === "stubble" ? darken(skinColor, 0.3) : hairColor;
  switch (type) {
    case "none":
      return null;
    case "stubble":
      return (
        <g opacity={0.35}>
          {Array.from({ length: 40 }, (_, i) => {
            const sx = 65 + (i % 8) * 9 + (i > 20 ? 2 : 0);
            const sy = 160 + Math.floor(i / 8) * 6 + (i % 3) * 2;
            if (sy > 195) return null;
            return <circle key={i} cx={sx} cy={sy} r={0.6} fill={beardColor} />;
          })}
        </g>
      );
    case "short":
      return (
        <path
          d="M60,162 Q65,158 80,156 Q100,154 120,156 Q135,158 140,162 Q142,175 135,188 Q120,198 100,200 Q80,198 65,188 Q58,175 60,162Z"
          fill={beardColor} opacity={0.65}
        />
      );
    case "long":
      return (
        <g>
          <path
            d="M58,158 Q65,154 80,152 Q100,150 120,152 Q135,154 142,158 Q148,178 140,205 Q125,225 100,228 Q75,225 60,205 Q52,178 58,158Z"
            fill={beardColor} opacity={0.7}
          />
          <path
            d="M68,170 Q100,165 132,170" fill="none"
            stroke={darken(beardColor, 0.15)} strokeWidth={0.6} opacity={0.3}
          />
        </g>
      );
    case "mustache":
      return (
        <path
          d="M80,150 Q85,147 92,149 Q100,152 108,149 Q115,147 120,150 Q115,155 108,153 Q100,156 92,153 Q85,155 80,150Z"
          fill={beardColor} opacity={0.75}
        />
      );
    default:
      return null;
  }
}

function renderGlasses(type: FaceParams["glasses"]) {
  const stroke = "#2a2a2a";
  const sw = 1.5;
  switch (type) {
    case "none":
      return null;
    case "round":
      return (
        <g>
          <circle cx={72} cy={110} r={15} fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx={128} cy={110} r={15} fill="none" stroke={stroke} strokeWidth={sw} />
          <line x1={87} y1={110} x2={113} y2={110} stroke={stroke} strokeWidth={sw} />
          <line x1={57} y1={108} x2={45} y2={106} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={143} y1={108} x2={155} y2={106} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
      );
    case "square":
      return (
        <g>
          <rect x={58} y={100} width={28} height={20} rx={3} fill="none" stroke={stroke} strokeWidth={sw} />
          <rect x={114} y={100} width={28} height={20} rx={3} fill="none" stroke={stroke} strokeWidth={sw} />
          <line x1={86} y1={110} x2={114} y2={110} stroke={stroke} strokeWidth={sw} />
          <line x1={58} y1={108} x2={45} y2={106} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={142} y1={108} x2={155} y2={106} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
      );
    case "sunglasses":
      return (
        <g>
          <circle cx={72} cy={110} r={16} fill="#1a1a2e" fillOpacity={0.75} stroke={stroke} strokeWidth={sw} />
          <circle cx={128} cy={110} r={16} fill="#1a1a2e" fillOpacity={0.75} stroke={stroke} strokeWidth={sw} />
          <line x1={88} y1={110} x2={112} y2={110} stroke={stroke} strokeWidth={sw + 0.5} />
          <line x1={56} y1={108} x2={42} y2={105} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={144} y1={108} x2={158} y2={105} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          {/* Glare */}
          <path d="M62,104 Q66,100 72,102" fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.3} />
          <path d="M118,104 Q122,100 128,102" fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.3} />
        </g>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface AvatarFaceProps {
  params: FaceParams;
  size?: number;
  interactive?: boolean;
  onChange?: (params: FaceParams) => void;
}

export function AvatarFace({ params, size = 200 }: AvatarFaceProps) {
  const uid = useId().replace(/:/g, "");
  const { faceShape, skinColor, hair, hairColor, eyes, eyeColor, nose, mouth, eyebrows, beard, glasses } = params;
  const hHex = HAIR_HEX[hairColor];
  const eHex = EYE_HEX[eyeColor];
  const browColor = darken(hHex, 0.1);

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={size * 1.2}
      style={{ display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={`fc-${uid}`}>
          {renderFaceClip(faceShape)}
        </clipPath>
      </defs>

      {/* Back hair */}
      {renderBackHair(hair, hHex)}

      {/* Face */}
      {renderFaceShape(faceShape, skinColor)}

      {/* Ears */}
      {renderEars(skinColor, faceShape)}

      {/* Skin details (clipped to face) */}
      <g clipPath={`url(#fc-${uid})`}>
        {renderSkinDetails(skinColor)}
      </g>

      {/* Front hair */}
      {renderFrontHair(hair, hHex)}

      {/* Eyebrows */}
      {renderEyebrow("left", eyebrows, browColor)}
      {renderEyebrow("right", eyebrows, browColor)}

      {/* Eyes */}
      {renderEye("left", eyes, eHex)}
      {renderEye("right", eyes, eHex)}

      {/* Nose */}
      {renderNose(nose, skinColor)}

      {/* Mouth */}
      {renderMouth(mouth, skinColor)}

      {/* Beard */}
      {renderBeard(beard, skinColor, hHex)}

      {/* Glasses */}
      {renderGlasses(glasses)}
    </svg>
  );
}
