"use client";
import React, { useId } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FaceParams {
  faceShape:    "oval"|"round"|"square"|"heart"|"diamond"|"oblong";
  skinColor:    string;
  aging:        "none"|"light"|"heavy";
  freckles:     "none"|"light"|"heavy";
  scar:         "none"|"cheek"|"chin"|"forehead";
  eyes:         "normal"|"asian"|"wide"|"tired"|"hooded"|"deep"|"almond"|"round";
  eyeColor:     "brown"|"blue"|"green"|"gray"|"hazel"|"amber";
  eyebrows:     "normal"|"thick"|"thin"|"arched"|"straight"|"bushy";
  nose:         "small"|"medium"|"wide"|"upturned"|"hooked"|"button";
  mouth:        "smile"|"neutral"|"serious"|"smirk"|"open"|"pouty";
  ears:         "normal"|"large"|"small"|"pointed";
  hair:         "short"|"long"|"curly"|"bald"|"ponytail"|"afro"|"business"|"mohawk"|"undercut"|"buzz"|"bun"|"wavy"|"dreadlocks"|"braids"|"pixie"|"bob";
  hairColor:    "black"|"brown"|"blonde"|"red"|"gray"|"white"|"platinum"|"auburn";
  highlights:   boolean;
  facialHair:   "none"|"stubble"|"short"|"full"|"goatee"|"mustache"|"viking"|"thick";
  makeup:       "none"|"light"|"bold"|"goth"|"natural";
  skinDetail:   "none"|"freckles"|"moles"|"wrinkles"|"scar";
  glasses:      "none"|"round"|"square"|"oval"|"cat-eye"|"rimless";
  glassesColor: string;
  earrings:     "none"|"studs"|"hoops"|"drops"|"dangles"|"cuffs";
  earringsColor:string;
  hat:          "none"|"cap"|"beanie"|"fedora"|"hood"|"crown"|"beret"|"hardhat";
  hatColor:     string;

  piercing:     "none"|"nose"|"lip"|"eyebrow"|"multiple";
  tattoo:       "none"|"neck"|"face"|"tear"|"tribal"|"circuit";
  necklace:     "none"|"chain"|"pendant"|"choker"|"beads";
  necklaceColor:string;
}

// ─── Skin & color helpers ─────────────────────────────────────────────────────

export const SKIN_COLORS = ["#FDDBB4","#F5CBA7","#E8BEAC","#D4956A","#C68642","#8D5524","#6B3A2A","#4A2912","#7EC8E3"];

const HAIR_HEX: Record<FaceParams["hairColor"], string> = {
  black:"#1a1008", brown:"#4a2f1a", blonde:"#d4a843",
  red:"#8b2500", gray:"#8a8a8a", white:"#e8e8e8",
  platinum:"#dde0e8", auburn:"#6b2000",
};

const EYE_HEX: Record<FaceParams["eyeColor"], string> = {
  brown:"#5c3317", blue:"#2d6fa8", green:"#3d7a4a",
  gray:"#6a7580", hazel:"#7a5c30", amber:"#b07030",
};

function darken(hex: string, amt = 30): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

function lighten(hex: string, amt = 30): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const PRESETS: Record<string, FaceParams> = {
  "ai": {
    faceShape:"square", skinColor:"#7EC8E3", aging:"none", freckles:"none", scar:"none",
    eyes:"wide", eyeColor:"blue", eyebrows:"thin", nose:"button", mouth:"serious", ears:"pointed",
    hair:"bald", hairColor:"black", highlights:false,
    facialHair:"none", makeup:"none", skinDetail:"none",
    glasses:"round", glassesColor:"#e8e8e8",
    earrings:"none", earringsColor:"#aaa",
    hat:"none", hatColor:"#222",
    piercing:"none", tattoo:"circuit", necklace:"none", necklaceColor:"#aaa",
  },
  "worker": {
    faceShape:"round", skinColor:"#4A2912", aging:"none", freckles:"none", scar:"none",
    eyes:"normal", eyeColor:"brown", eyebrows:"thick", nose:"wide", mouth:"smile", ears:"normal",
    hair:"buzz", hairColor:"black", highlights:false,
    facialHair:"stubble", makeup:"none", skinDetail:"none",
    glasses:"none", glassesColor:"#111",
    earrings:"none", earringsColor:"#d4a853",
    hat:"hardhat", hatColor:"#e8c830",
    piercing:"none", tattoo:"none", necklace:"none", necklaceColor:"#d4a853",
  },
  "developer": {
    faceShape:"oval", skinColor:"#FDDBB4", aging:"none", freckles:"none", scar:"none",
    eyes:"normal", eyeColor:"blue", eyebrows:"normal", nose:"small", mouth:"neutral", ears:"normal",
    hair:"short", hairColor:"brown", highlights:false,
    facialHair:"none", makeup:"none", skinDetail:"freckles",
    glasses:"square", glassesColor:"#111",
    earrings:"none", earringsColor:"#d4a853",
    hat:"none", hatColor:"#222",
    piercing:"none", tattoo:"none", necklace:"none", necklaceColor:"#d4a853",
  },
  "journalist": {
    faceShape:"oval", skinColor:"#D4956A", aging:"none", freckles:"none", scar:"none",
    eyes:"almond", eyeColor:"green", eyebrows:"arched", nose:"small", mouth:"smirk", ears:"normal",
    hair:"ponytail", hairColor:"auburn", highlights:true,
    facialHair:"none", makeup:"light", skinDetail:"none",
    glasses:"none", glassesColor:"#111",
    earrings:"drops", earringsColor:"#aaa",
    hat:"none", hatColor:"#222",
    piercing:"none", tattoo:"none", necklace:"chain", necklaceColor:"#aaa",
  },
  "creative": {
    faceShape:"heart", skinColor:"#E8BEAC", aging:"none", freckles:"none", scar:"none",
    eyes:"almond", eyeColor:"hazel", eyebrows:"arched", nose:"small", mouth:"smile", ears:"normal",
    hair:"wavy", hairColor:"auburn", highlights:true,
    facialHair:"none", makeup:"bold", skinDetail:"none",
    glasses:"cat-eye", glassesColor:"#8b1a1a",
    earrings:"dangles", earringsColor:"#d4a853",
    hat:"beret", hatColor:"#4a1a6b",
    piercing:"nose", tattoo:"none", necklace:"pendant", necklaceColor:"#d4a853",
  },
  "trader": {
    faceShape:"square", skinColor:"#C68642", aging:"light", freckles:"none", scar:"none",
    eyes:"deep", eyeColor:"brown", eyebrows:"straight", nose:"medium", mouth:"serious", ears:"normal",
    hair:"business", hairColor:"black", highlights:false,
    facialHair:"short", makeup:"none", skinDetail:"none",
    glasses:"rimless", glassesColor:"#aaa",
    earrings:"none", earringsColor:"#d4a853",
    hat:"none", hatColor:"#222",
    piercing:"none", tattoo:"none", necklace:"none", necklaceColor:"#aaa",
  },
  "finance": {
    faceShape:"oblong", skinColor:"#F5CBA7", aging:"light", freckles:"none", scar:"none",
    eyes:"tired", eyeColor:"gray", eyebrows:"bushy", nose:"hooked", mouth:"serious", ears:"large",
    hair:"short", hairColor:"gray", highlights:false,
    facialHair:"goatee", makeup:"none", skinDetail:"wrinkles",
    glasses:"round", glassesColor:"#6b4020",
    earrings:"none", earringsColor:"#d4a853",
    hat:"none", hatColor:"#222",
    piercing:"none", tattoo:"none", necklace:"none", necklaceColor:"#aaa",
  },
  "teacher": {
    faceShape:"oval", skinColor:"#8D5524", aging:"light", freckles:"none", scar:"none",
    eyes:"normal", eyeColor:"brown", eyebrows:"arched", nose:"medium", mouth:"neutral", ears:"normal",
    hair:"bun", hairColor:"brown", highlights:false,
    facialHair:"none", makeup:"natural", skinDetail:"none",
    glasses:"round", glassesColor:"#c8a040",
    earrings:"studs", earringsColor:"#d4a853",
    hat:"none", hatColor:"#222",
    piercing:"none", tattoo:"none", necklace:"pendant", necklaceColor:"#d4a853",
  },
};

// ─── Face shape path helpers ──────────────────────────────────────────────────

function faceClipPath(shape: FaceParams["faceShape"]): React.ReactElement {
  switch(shape) {
    case "oval":    return <ellipse cx={100} cy={115} rx={62} ry={78}/>;
    case "round":   return <ellipse cx={100} cy={115} rx={70} ry={70}/>;
    case "square":  return <rect x={38} y={48} width={124} height={136} rx={10}/>;
    case "heart":   return <path d="M100,195 C55,185 30,150 30,115 C30,78 55,50 78,48 Q90,42 100,58 Q110,42 122,48 C145,50 170,78 170,115 C170,150 145,185 100,195Z"/>;
    case "diamond": return <path d="M100,42 L168,115 L100,192 L32,115 Z"/>;
    case "oblong":  return <ellipse cx={100} cy={118} rx={52} ry={88}/>;
  }
}

function faceFill(shape: FaceParams["faceShape"], fill: string): React.ReactElement {
  switch(shape) {
    case "oval":    return <ellipse cx={100} cy={115} rx={62} ry={78} fill={fill}/>;
    case "round":   return <ellipse cx={100} cy={115} rx={70} ry={70} fill={fill}/>;
    case "square":  return <rect x={38} y={48} width={124} height={136} rx={10} fill={fill}/>;
    case "heart":   return <path d="M100,195 C55,185 30,150 30,115 C30,78 55,50 78,48 Q90,42 100,58 Q110,42 122,48 C145,50 170,78 170,115 C170,150 145,185 100,195Z" fill={fill}/>;
    case "diamond": return <path d="M100,42 L168,115 L100,192 L32,115 Z" fill={fill}/>;
    case "oblong":  return <ellipse cx={100} cy={118} rx={52} ry={88} fill={fill}/>;
  }
}

// ─── Ears ─────────────────────────────────────────────────────────────────────

function Ears({ shape, skin }: { shape: FaceParams["ears"]; skin: string }) {
  const shadow = darken(skin, 20);
  const configs = {
    normal:  { rx: 7, ry: 10, innerRx: 4, innerRy: 6 },
    large:   { rx: 9, ry: 13, innerRx: 5, innerRy: 8 },
    small:   { rx: 5, ry:  8, innerRx: 3, innerRy: 4 },
    pointed: { rx: 7, ry: 12, innerRx: 4, innerRy: 7 },
  };
  const c = configs[shape];
  return (
    <g>
      {/* Left ear */}
      <ellipse cx={38} cy={110} rx={c.rx} ry={c.ry} fill={skin}/>
      <ellipse cx={38} cy={110} rx={c.innerRx} ry={c.innerRy} fill={shadow} opacity={0.35}/>
      {shape === "pointed" && <path d="M38,98 L33,88 L43,88 Z" fill={skin}/>}
      {/* Right ear */}
      <ellipse cx={162} cy={110} rx={c.rx} ry={c.ry} fill={skin}/>
      <ellipse cx={162} cy={110} rx={c.innerRx} ry={c.innerRy} fill={shadow} opacity={0.35}/>
      {shape === "pointed" && <path d="M162,98 L157,88 L167,88 Z" fill={skin}/>}
    </g>
  );
}

// ─── Hair (back layer) ────────────────────────────────────────────────────────

function HairBack({ style, color }: { style: FaceParams["hair"]; color: string }) {
  const c = color;
  switch(style) {
    case "long": return (
      <g>
        <rect x={22} y={65} width={26} height={160} rx={13} fill={c}/>
        <rect x={152} y={65} width={26} height={160} rx={13} fill={c}/>
      </g>
    );
    case "wavy": return (
      <g>
        <path d="M22,70 Q14,100 22,130 Q14,160 22,190 L36,190 Q28,160 36,130 Q28,100 36,70 Z" fill={c}/>
        <path d="M178,70 Q186,100 178,130 Q186,160 178,190 L164,190 Q172,160 164,130 Q172,100 164,70 Z" fill={c}/>
      </g>
    );
    case "afro": return (
      <ellipse cx={100} cy={82} rx={88} ry={72} fill={c} opacity={0.95}/>
    );
    case "ponytail": return (
      <g>
        <path d="M148,68 Q175,80 178,110 Q175,140 155,155 L148,145 Q165,132 162,108 Q160,85 148,75 Z" fill={c}/>
      </g>
    );
    case "dreadlocks": return (
      <g>
        {[30,42,54,146,158,170].map((x,i)=>(
          <rect key={i} x={x-5} y={75} width={10} height={140} rx={5} fill={c} opacity={0.9}/>
        ))}
      </g>
    );
    case "braids": return (
      <g>
        <path d="M35,75 Q25,105 30,135 Q25,165 35,195 L45,195 Q40,165 45,135 Q40,105 45,75 Z" fill={c}/>
        <path d="M165,75 Q175,105 170,135 Q175,165 165,195 L155,195 Q160,165 155,135 Q160,105 155,75 Z" fill={c}/>
      </g>
    );
    case "bun": return (
      <ellipse cx={112} cy={50} rx={20} ry={18} fill={c}/>
    );
    default: return null;
  }
}

// ─── Hair (front layer) ───────────────────────────────────────────────────────

function HairFront({ style, color, highlights }: { style: FaceParams["hair"]; color: string; highlights: boolean }) {
  const c = color;
  const hl = highlights ? lighten(color, 40) : null;
  switch(style) {
    case "short": return (
      <g>
        <ellipse cx={100} cy={62} rx={62} ry={28} fill={c}/>
        {hl && <ellipse cx={88} cy={57} rx={18} ry={8} fill={hl} opacity={0.4}/>}
      </g>
    );
    case "buzz": return (
      <g>
        <ellipse cx={100} cy={60} rx={62} ry={24} fill={c} opacity={0.85}/>
      </g>
    );
    case "long": return (
      <g>
        <ellipse cx={100} cy={62} rx={62} ry={28} fill={c}/>
        {hl && <ellipse cx={85} cy={57} rx={20} ry={9} fill={hl} opacity={0.35}/>}
        {/* side bits that go in front of face */}
        <path d="M38,70 Q30,100 32,140 L44,140 Q40,102 44,72 Z" fill={c}/>
        <path d="M162,70 Q170,100 168,140 L156,140 Q160,102 156,72 Z" fill={c}/>
      </g>
    );
    case "wavy": return (
      <g>
        <ellipse cx={100} cy={62} rx={62} ry={28} fill={c}/>
        <path d="M38,72 Q30,102 32,142 L44,142 Q42,112 44,82 Z" fill={c}/>
        <path d="M162,72 Q170,102 168,142 L156,142 Q158,112 156,82 Z" fill={c}/>
        {hl && <ellipse cx={85} cy={57} rx={20} ry={9} fill={hl} opacity={0.3}/>}
      </g>
    );
    case "curly": return (
      <g>
        <ellipse cx={100} cy={58} rx={65} ry={32} fill={c}/>
        {/* Curly bumps along hairline */}
        {[42,56,70,84,100,116,130,144,158].map((x,i)=>(
          <ellipse key={i} cx={x} cy={i%2===0?46:50} rx={9} ry={8} fill={c}/>
        ))}
        {hl && <ellipse cx={85} cy={52} rx={18} ry={8} fill={hl} opacity={0.35}/>}
      </g>
    );
    case "afro": return (
      <g>
        <ellipse cx={100} cy={78} rx={88} ry={72} fill={c} opacity={0.95}/>
        {hl && <ellipse cx={80} cy={60} rx={22} ry={14} fill={hl} opacity={0.3}/>}
      </g>
    );
    case "bald": return (
      // subtle shine
      <ellipse cx={92} cy={68} rx={20} ry={10} fill="#ffffff" opacity={0.08}/>
    );
    case "business": return (
      <g>
        <ellipse cx={100} cy={60} rx={62} ry={26} fill={c}/>
        {/* Side part */}
        <path d="M72,37 L72,62" stroke={darken(c,20)} strokeWidth={1.5} opacity={0.6}/>
        {hl && <ellipse cx={88} cy={55} rx={16} ry={7} fill={hl} opacity={0.35}/>}
      </g>
    );
    case "ponytail": return (
      <g>
        <ellipse cx={100} cy={60} rx={62} ry={26} fill={c}/>
        {hl && <ellipse cx={88} cy={55} rx={16} ry={7} fill={hl} opacity={0.3}/>}
      </g>
    );
    case "mohawk": return (
      <g>
        {/* Shaved sides */}
        <path d="M38,65 Q38,45 60,42 L60,62 Q45,64 38,65Z" fill={darken(c,50)} opacity={0.18}/>
        <path d="M162,65 Q162,45 140,42 L140,62 Q155,64 162,65Z" fill={darken(c,50)} opacity={0.18}/>
        {/* Strip */}
        <rect x={88} y={28} width={24} height={40} rx={8} fill={c}/>
      </g>
    );
    case "undercut": return (
      <g>
        <path d="M38,65 Q38,45 60,42 L60,62 Q45,64 38,65Z" fill={darken(c,50)} opacity={0.15}/>
        <path d="M162,65 Q162,45 140,42 L140,62 Q155,64 162,65Z" fill={darken(c,50)} opacity={0.15}/>
        <path d="M60,42 Q100,32 140,42 L140,62 Q100,52 60,62 Z" fill={c}/>
      </g>
    );
    case "pixie": return (
      <g>
        <path d="M45,62 Q50,38 100,34 Q150,38 155,62 Q140,55 100,54 Q60,55 45,62Z" fill={c}/>
        {/* Wispy side */}
        <path d="M38,65 Q36,80 40,95" stroke={c} strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.85}/>
        {hl && <ellipse cx={88} cy={48} rx={14} ry={6} fill={hl} opacity={0.3}/>}
      </g>
    );
    case "bob": return (
      <g>
        <ellipse cx={100} cy={62} rx={62} ry={26} fill={c}/>
        <path d="M38,68 Q36,110 40,140 Q50,150 60,148 L60,130 Q48,128 46,105 L46,72Z" fill={c}/>
        <path d="M162,68 Q164,110 160,140 Q150,150 140,148 L140,130 Q152,128 154,105 L154,72Z" fill={c}/>
        {hl && <ellipse cx={85} cy={56} rx={18} ry={8} fill={hl} opacity={0.3}/>}
      </g>
    );
    case "bun": return (
      <g>
        <path d="M45,65 Q50,45 100,40 Q150,45 155,65 Q140,60 100,58 Q60,60 45,65Z" fill={c}/>
        <ellipse cx={112} cy={50} rx={20} ry={18} fill={c}/>
        <ellipse cx={112} cy={50} rx={12} ry={10} fill={darken(c,15)} opacity={0.4}/>
        {hl && <ellipse cx={108} cy={45} rx={8} ry={5} fill={hl} opacity={0.35}/>}
      </g>
    );
    case "dreadlocks": return (
      <g>
        <ellipse cx={100} cy={60} rx={65} ry={28} fill={c}/>
        {[48,64,80,100,120,136,152].map((x,i)=>(
          <rect key={i} x={x-5} y={68} width={10} height={i%2===0?20:28} rx={5} fill={darken(c,10)}/>
        ))}
      </g>
    );
    case "braids": return (
      <g>
        <ellipse cx={100} cy={60} rx={65} ry={28} fill={c}/>
        {[62,100,138].map((x,i)=>(
          <rect key={i} x={x-5} y={68} width={10} height={22} rx={5} fill={darken(c,10)}/>
        ))}
      </g>
    );
    default: return null;
  }
}

// ─── Eyebrows ─────────────────────────────────────────────────────────────────

function Eyebrow({ side, type, hairColor }: { side:"left"|"right"; type: FaceParams["eyebrows"]; hairColor: string }) {
  const cx = side === "left" ? 68 : 132;
  const sw = type === "thick" || type === "bushy" ? 4 : type === "thin" ? 1.5 : 2.5;
  const y = 94;
  const w = type === "bushy" ? 15 : 12;
  const color = darken(hairColor, 10);

  switch(type) {
    case "normal":   return <path d={`M${cx-w},${y+1} Q${cx},${y-3} ${cx+w},${y}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"/>;
    case "thick":    return <path d={`M${cx-w},${y+1} Q${cx},${y-3} ${cx+w},${y}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"/>;
    case "thin":     return <path d={`M${cx-w},${y} L${cx+w},${y-1}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"/>;
    case "arched":   return <path d={`M${cx-w},${y+2} Q${cx-2},${y-7} ${cx+w},${y}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"/>;
    case "straight": return <path d={`M${cx-w},${y} L${cx+w},${y}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"/>;
    case "bushy": return (
      <g>
        <path d={`M${cx-w},${y+1} Q${cx},${y-3} ${cx+w},${y}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"/>
        <path d={`M${cx-w},${y+3} Q${cx},${y-1} ${cx+w},${y+2}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.5}/>
      </g>
    );
    default: return null;
  }
}

// ─── Eyes ─────────────────────────────────────────────────────────────────────

function Eye({ side, type, eyeColor }: { side:"left"|"right"; type: FaceParams["eyes"]; eyeColor: string }) {
  const cx = side === "left" ? 68 : 132;
  const cy = 108;
  const irisC = EYE_HEX[eyeColor as FaceParams["eyeColor"]] ?? eyeColor;

  const dims = {
    normal:  { w:14, h:7,  tilt:0 },
    asian:   { w:15, h:5,  tilt:-1 },
    wide:    { w:14, h:9,  tilt:0 },
    tired:   { w:14, h:6,  tilt:2 },
    hooded:  { w:14, h:6,  tilt:0 },
    deep:    { w:13, h:7,  tilt:0 },
    almond:  { w:15, h:7,  tilt:-1 },
    round:   { w:12, h:10, tilt:0 },
  };
  const d = dims[type] ?? dims.normal;
  const outerTilt = side === "left" ? d.tilt : -d.tilt;

  return (
    <g>
      {/* White */}
      <ellipse cx={cx} cy={cy+outerTilt*0.5} rx={d.w} ry={d.h} fill="#fff"/>
      {/* Iris */}
      <circle cx={cx} cy={cy} r={d.h * 0.75} fill={irisC}/>
      {/* Pupil */}
      <circle cx={cx} cy={cy} r={d.h * 0.4} fill="#111"/>
      {/* Catchlight */}
      <circle cx={cx+2} cy={cy-2} r={1.2} fill="#fff" opacity={0.9}/>
      {/* Upper lid */}
      <path
        d={`M${cx-d.w},${cy-outerTilt} Q${cx},${cy-d.h*1.5} ${cx+d.w},${cy+outerTilt}`}
        fill="none" stroke="#333" strokeWidth={1.5} strokeLinecap="round"
      />
      {/* Lashes (upper, 3 strokes) */}
      {[-7,-1,5].map((dx,i)=>(
        <line key={i}
          x1={cx+dx} y1={cy-d.h+outerTilt*0.3}
          x2={cx+dx-1} y2={cy-d.h-4+outerTilt*0.3}
          stroke="#222" strokeWidth={1.2} strokeLinecap="round"
        />
      ))}
      {/* Lower lid */}
      <path
        d={`M${cx-d.w},${cy-outerTilt} Q${cx},${cy+d.h*0.9} ${cx+d.w},${cy+outerTilt}`}
        fill="none" stroke="#55330050" strokeWidth={0.8} strokeLinecap="round"
      />
      {/* Hooded shadow */}
      {type === "hooded" && (
        <ellipse cx={cx} cy={cy-d.h+1} rx={d.w-2} ry={2} fill="#33333355"/>
      )}
    </g>
  );
}

// ─── Nose ─────────────────────────────────────────────────────────────────────

function Nose({ type, skin }: { type: FaceParams["nose"]; skin: string }) {
  const shadow = darken(skin, 25);
  switch(type) {
    case "small": return (
      <g>
        <path d="M97,124 Q100,119 103,124" fill="none" stroke={shadow} strokeWidth={1.8} strokeLinecap="round"/>
        <path d="M95,130 Q97,133 100,131 Q103,133 105,130" fill="none" stroke={shadow} strokeWidth={1.5} strokeLinecap="round"/>
      </g>
    );
    case "medium": return (
      <g>
        <path d="M100,119 L100,130" stroke={shadow} strokeWidth={1.5} strokeLinecap="round" fill="none"/>
        <path d="M92,131 Q97,135 100,133 Q103,135 108,131" fill="none" stroke={shadow} strokeWidth={1.8} strokeLinecap="round"/>
        <ellipse cx={94} cy={129} rx={4} ry={2.5} fill={shadow} opacity={0.3}/>
        <ellipse cx={106} cy={129} rx={4} ry={2.5} fill={shadow} opacity={0.3}/>
      </g>
    );
    case "wide": return (
      <g>
        <path d="M100,116 L100,126" stroke={shadow} strokeWidth={1.5} fill="none" strokeLinecap="round"/>
        <path d="M90,128 Q95,133 100,131 Q105,133 110,128" fill="none" stroke={shadow} strokeWidth={2} strokeLinecap="round"/>
        <ellipse cx={91} cy={129} rx={5} ry={3} fill={shadow} opacity={0.35}/>
        <ellipse cx={109} cy={129} rx={5} ry={3} fill={shadow} opacity={0.35}/>
      </g>
    );
    case "upturned": return (
      <g>
        <path d="M100,122 Q100,116 100,120" fill="none" stroke={shadow} strokeWidth={1.5} strokeLinecap="round"/>
        <path d="M94,124 Q97,128 100,126 Q103,128 106,124" fill="none" stroke={shadow} strokeWidth={1.8} strokeLinecap="round"/>
      </g>
    );
    case "hooked": return (
      <g>
        <path d="M100,116 Q102,122 101,126 Q104,130 100,130" fill="none" stroke={shadow} strokeWidth={2} strokeLinecap="round"/>
        <path d="M95,130 Q97.5,133 100,131 Q102.5,133 105,130" fill="none" stroke={shadow} strokeWidth={1.8} strokeLinecap="round"/>
      </g>
    );
    case "button": return (
      <g>
        <ellipse cx={100} cy={126} rx={5} ry={4} fill={shadow} opacity={0.2}/>
        <ellipse cx={97} cy={127} rx={2} ry={1.5} fill={shadow} opacity={0.4}/>
        <ellipse cx={103} cy={127} rx={2} ry={1.5} fill={shadow} opacity={0.4}/>
      </g>
    );
    default: return null;
  }
}

// ─── Mouth ────────────────────────────────────────────────────────────────────

function Mouth({ type, skin }: { type: FaceParams["mouth"]; skin: string }) {
  const lip = darken(skin, 35);
  switch(type) {
    case "smile": return (
      <g>
        <path d="M80,156 Q100,171 120,156" fill="none" stroke={lip} strokeWidth={2.2} strokeLinecap="round"/>
        <path d="M84,152 Q100,162 116,152" fill={darken(skin,45)} fillOpacity={0.15}/>
      </g>
    );
    case "neutral": return (
      <path d="M82,158 L118,158" fill="none" stroke={lip} strokeWidth={2} strokeLinecap="round"/>
    );
    case "serious": return (
      <path d="M82,159 Q100,156 118,159" fill="none" stroke={lip} strokeWidth={2} strokeLinecap="round"/>
    );
    case "smirk": return (
      <path d="M82,159 Q102,154 118,158" fill="none" stroke={lip} strokeWidth={2} strokeLinecap="round"/>
    );
    case "open": return (
      <g>
        <path d="M82,150 Q100,162 118,150" fill={darken(skin,50)} strokeLinecap="round"/>
        <path d="M82,150 Q100,162 118,150 Q100,155 82,150Z" fill="#5a1a1a" opacity={0.8}/>
        <path d="M86,150 L114,150" stroke="#e8e8e8" strokeWidth={4} opacity={0.9}/>
      </g>
    );
    case "pouty": return (
      <g>
        <path d="M84,148 Q100,155 116,148" fill={lip} opacity={0.5} strokeLinecap="round"/>
        <path d="M84,153 Q100,162 116,153" fill="none" stroke={lip} strokeWidth={2.5} strokeLinecap="round"/>
      </g>
    );
    default: return null;
  }
}

// ─── Beard ────────────────────────────────────────────────────────────────────

function Beard({ type, skin, hairColor }: { type: FaceParams["facialHair"]; skin: string; hairColor: string }) {
  const c = HAIR_HEX[hairColor as FaceParams["hairColor"]] ?? hairColor;
  const stubble = darken(skin, 40);
  switch(type) {
    case "none": return null;
    case "stubble": return (
      <g opacity={0.5}>
        {[85,90,95,100,105,110,115].map((x,i)=>[
          <circle key={`a${i}`} cx={x} cy={160+i%2} r={0.8} fill={stubble}/>,
          <circle key={`b${i}`} cx={x+3} cy={163-i%2} r={0.8} fill={stubble}/>,
        ])}
        {[82,88,94,100,106,112,118].map((x,i)=>(
          <circle key={`c${i}`} cx={x} cy={168+i%2} r={0.8} fill={stubble}/>
        ))}
      </g>
    );
    case "mustache": return (
      <path d="M86,148 Q94,143 100,146 Q106,143 114,148 Q106,152 100,150 Q94,152 86,148Z" fill={c}/>
    );
    case "goatee": return (
      <g>
        <path d="M86,148 Q94,143 100,146 Q106,143 114,148 Q106,152 100,150 Q94,152 86,148Z" fill={c}/>
        <path d="M92,158 Q100,175 108,158 Q104,172 100,174 Q96,172 92,158Z" fill={c}/>
      </g>
    );
    case "short": return (
      <path d="M72,155 Q80,148 100,146 Q120,148 128,155 Q125,175 100,178 Q75,175 72,155Z" fill={c} opacity={0.9}/>
    );
    case "full": return (
      <g>
        <path d="M70,148 Q80,142 100,140 Q120,142 130,148 Q132,170 118,185 Q108,195 100,196 Q92,195 82,185 Q68,170 70,148Z" fill={c} opacity={0.9}/>
        <path d="M72,155 Q80,148 100,146 Q120,148 128,155 Q128,185 110,205 Q100,210 90,205 Q72,185 72,155Z" fill={c} opacity={0.6}/>
        <path d="M86,148 Q94,143 100,145 Q106,143 114,148 Q106,152 100,150 Q94,152 86,148Z" fill={c}/>
      </g>
    );
    case "viking": return (
      <g>
        <path d="M70,148 Q80,142 100,140 Q120,142 130,148 Q132,175 115,195 Q108,205 100,207 Q92,205 85,195 Q68,175 70,148Z" fill={c} opacity={0.9}/>
        {/* braids */}
        <rect x={78} y={195} width={10} height={35} rx={5} fill={c}/>
        <rect x={112} y={195} width={10} height={35} rx={5} fill={c}/>
      </g>
    );
    case "thick": return (
      <g>
        <path d="M68,155 Q80,148 100,146 Q120,148 132,155 Q130,172 115,178 Q100,182 85,178 Q70,172 68,155Z" fill={c} opacity={0.95}/>
        <path d="M84,148 Q94,143 100,145 Q106,143 116,148 Q108,153 100,151 Q92,153 84,148Z" fill={c}/>
      </g>
    );
    default: return null;
  }
}

// ─── Glasses ──────────────────────────────────────────────────────────────────

function Glasses({ type, color }: { type: FaceParams["glasses"]; color: string }) {
  if(type === "none") return null;
  const strokeProps = { fill:"none", stroke:color, strokeWidth:2.5 };
  const bridge = <path d="M84,108 L116,108" {...strokeProps} strokeWidth={1.5}/>;

  switch(type) {
    case "round": return (
      <g>
        <circle cx={72} cy={108} r={16} {...strokeProps}/>
        <circle cx={128} cy={108} r={16} {...strokeProps}/>
        {bridge}
        <path d="M30,100 L56,103" {...strokeProps} strokeWidth={1.5}/>
        <path d="M170,100 L144,103" {...strokeProps} strokeWidth={1.5}/>
      </g>
    );
    case "square": return (
      <g>
        <rect x={56} y={98} width={30} height={20} rx={3} {...strokeProps}/>
        <rect x={114} y={98} width={30} height={20} rx={3} {...strokeProps}/>
        {bridge}
        <path d="M30,100 L56,102" {...strokeProps} strokeWidth={1.5}/>
        <path d="M170,100 L144,102" {...strokeProps} strokeWidth={1.5}/>
      </g>
    );
    case "oval": return (
      <g>
        <ellipse cx={72} cy={108} rx={17} ry={12} {...strokeProps}/>
        <ellipse cx={128} cy={108} rx={17} ry={12} {...strokeProps}/>
        {bridge}
        <path d="M30,100 L55,105" {...strokeProps} strokeWidth={1.5}/>
        <path d="M170,100 L145,105" {...strokeProps} strokeWidth={1.5}/>
      </g>
    );
    case "cat-eye": return (
      <g>
        <path d="M55,115 Q65,98 88,98 Q91,110 88,118 Q72,122 55,115Z" {...strokeProps}/>
        <path d="M145,115 Q135,98 112,98 Q109,110 112,118 Q128,122 145,115Z" {...strokeProps}/>
        {bridge}
        <path d="M30,105 L55,112" {...strokeProps} strokeWidth={1.5}/>
        <path d="M170,105 L145,112" {...strokeProps} strokeWidth={1.5}/>
      </g>
    );
    case "rimless": return (
      <g>
        <ellipse cx={72} cy={108} rx={15} ry={11} fill="none" stroke={color} strokeWidth={0.8} opacity={0.6}/>
        <ellipse cx={128} cy={108} rx={15} ry={11} fill="none" stroke={color} strokeWidth={0.8} opacity={0.6}/>
        <path d="M87,108 L113,108" stroke={color} strokeWidth={1.5}/>
        <path d="M30,100 L57,105" stroke={color} strokeWidth={1.2}/>
        <path d="M170,100 L143,105" stroke={color} strokeWidth={1.2}/>
      </g>
    );
    default: return null;
  }
}

// ─── Hat ──────────────────────────────────────────────────────────────────────

function Hat({ type, color }: { type: FaceParams["hat"]; color: string }) {
  if(type === "none") return null;
  const dark = darken(color, 30);
  switch(type) {
    case "cap": return (
      <g>
        <ellipse cx={100} cy={62} rx={68} ry={18} fill={color}/>
        <rect x={38} y={38} width={124} height={30} rx={8} fill={color}/>
        <rect x={38} y={38} width={124} height={8} rx={4} fill={dark} opacity={0.35}/>
        {/* Brim */}
        <path d="M32,62 Q20,66 18,70 Q30,68 40,67" fill={color}/>
      </g>
    );
    case "beanie": return (
      <g>
        <path d="M35,75 Q38,35 100,32 Q162,35 165,75 Q140,62 100,60 Q60,62 35,75Z" fill={color}/>
        <path d="M35,75 Q37,68 100,65 Q163,68 165,75" fill={dark} opacity={0.3}/>
        <path d="M88,32 Q100,28 112,32" fill="none" stroke={dark} strokeWidth={8} strokeLinecap="round"/>
      </g>
    );
    case "fedora": return (
      <g>
        <ellipse cx={100} cy={72} rx={72} ry={14} fill={color}/>
        <path d="M40,72 Q42,45 100,40 Q158,45 160,72 Q140,62 100,60 Q60,62 40,72Z" fill={color}/>
        <path d="M40,72 Q42,66 100,64 Q158,66 160,72" fill={dark} opacity={0.3}/>
        {/* Indent at top */}
        <path d="M75,40 Q100,36 125,40 Q120,48 100,50 Q80,48 75,40Z" fill={dark} opacity={0.2}/>
      </g>
    );
    case "crown": return (
      <g>
        <path d="M50,70 L55,48 L70,62 L85,40 L100,58 L115,40 L130,62 L145,48 L150,70 Z" fill={color}/>
        {[70,100,130].map((x,i)=>(
          <circle key={i} cx={x} cy={type==="crown"?58:58} r={4} fill="#e8c830"/>
        ))}
        <rect x={50} y={68} width={100} height={8} rx={3} fill={dark} opacity={0.35}/>
      </g>
    );
    case "beret": return (
      <g>
        <ellipse cx={105} cy={58} rx={58} ry={28} fill={color}/>
        <ellipse cx={100} cy={72} rx={50} ry={8} fill={dark} opacity={0.3}/>
        <circle cx={140} cy={45} r={5} fill={dark} opacity={0.6}/>
      </g>
    );
    case "hardhat": return (
      <g>
        <ellipse cx={100} cy={68} rx={72} ry={14} fill={color}/>
        <path d="M40,68 Q42,42 100,38 Q158,42 160,68 Q140,58 100,56 Q60,58 40,68Z" fill={color}/>
        <path d="M40,68 Q42,62 100,60 Q158,62 160,68" fill={dark} opacity={0.2}/>
        <rect x={80} y={36} width={40} height={6} rx={3} fill={dark} opacity={0.4}/>
      </g>
    );
    case "hood": return (
      <g>
        <path d="M22,80 Q18,50 50,35 Q100,25 150,35 Q182,50 178,80 Q160,65 100,62 Q40,65 22,80Z" fill={color}/>
        <path d="M30,80 Q32,62 100,58 Q168,62 170,80" fill="none" stroke={dark} strokeWidth={2} opacity={0.4}/>
      </g>
    );
    default: return null;
  }
}

// ─── Clothing ─────────────────────────────────────────────────────────────────

// ─── Accessories ─────────────────────────────────────────────────────────────

function Earrings({ type, color }: { type: FaceParams["earrings"]; color: string }) {
  if(type === "none") return null;
  switch(type) {
    case "studs": return (
      <g>
        <circle cx={31} cy={112} r={3} fill={color}/>
        <circle cx={169} cy={112} r={3} fill={color}/>
      </g>
    );
    case "hoops": return (
      <g>
        <circle cx={31} cy={114} r={6} fill="none" stroke={color} strokeWidth={2}/>
        <circle cx={169} cy={114} r={6} fill="none" stroke={color} strokeWidth={2}/>
      </g>
    );
    case "drops": return (
      <g>
        <line x1={31} y1={112} x2={31} y2={124} stroke={color} strokeWidth={1.5}/>
        <circle cx={31} cy={126} r={3} fill={color}/>
        <line x1={169} y1={112} x2={169} y2={124} stroke={color} strokeWidth={1.5}/>
        <circle cx={169} cy={126} r={3} fill={color}/>
      </g>
    );
    case "dangles": return (
      <g>
        <line x1={31} y1={112} x2={31} y2={130} stroke={color} strokeWidth={1.2}/>
        <path d="M27,128 L31,136 L35,128" fill={color} opacity={0.9}/>
        <line x1={169} y1={112} x2={169} y2={130} stroke={color} strokeWidth={1.2}/>
        <path d="M165,128 L169,136 L173,128" fill={color} opacity={0.9}/>
      </g>
    );
    case "cuffs": return (
      <g>
        <rect x={26} y={106} width={10} height={12} rx={2} fill="none" stroke={color} strokeWidth={2}/>
        <rect x={164} y={106} width={10} height={12} rx={2} fill="none" stroke={color} strokeWidth={2}/>
      </g>
    );
    default: return null;
  }
}

function Piercing({ type }: { type: FaceParams["piercing"]; skin?: string }) {
  if(type === "none") return null;
  const metal = "#c0c0c0";
  switch(type) {
    case "nose":    return <circle cx={105} cy={130} r={2.5} fill={metal}/>;
    case "lip":     return <circle cx={100} cy={158} r={2.5} fill={metal}/>;
    case "eyebrow": return <circle cx={80} cy={91} r={2.5} fill={metal}/>;
    case "multiple": return (
      <g>
        <circle cx={105} cy={130} r={2.5} fill={metal}/>
        <circle cx={100} cy={158} r={2.5} fill={metal}/>
        <circle cx={80} cy={91} r={2.5} fill={metal}/>
      </g>
    );
    default: return null;
  }
}

function Tattoo({ type }: { type: FaceParams["tattoo"] }) {
  if(type === "none") return null;
  const ink = "#1a1a1a";
  switch(type) {
    case "tear": return <path d="M68,122 Q65,128 68,134 Q71,128 68,122Z" fill={ink} opacity={0.7}/>;
    case "face": return (
      <g opacity={0.5}>
        <path d="M52,105 Q50,115 52,125" stroke={ink} strokeWidth={1.5} fill="none"/>
        <path d="M50,112 L55,112" stroke={ink} strokeWidth={1.5}/>
      </g>
    );
    case "neck": return (
      <g opacity={0.5}>
        <path d="M82,185 Q100,180 118,185" stroke={ink} strokeWidth={1.5} fill="none"/>
        <path d="M90,190 Q100,186 110,190" stroke={ink} strokeWidth={1} fill="none"/>
      </g>
    );
    case "tribal": return (
      <g opacity={0.45}>
        <path d="M45,105 Q42,110 45,118 Q48,122 44,128" stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round"/>
        <path d="M43,110 L50,113" stroke={ink} strokeWidth={1.5}/>
        <path d="M43,120 L50,117" stroke={ink} strokeWidth={1.5}/>
      </g>
    );
    case "circuit": return (
      <g opacity={0.6}>
        <path d="M55,95 L55,115 L65,115 L65,105 L75,105" stroke="#1db8a8" strokeWidth={1.2} fill="none"/>
        <circle cx={55} cy={95} r={2} fill="#1db8a8"/>
        <circle cx={75} cy={105} r={2} fill="#1db8a8"/>
        <path d="M155,110 L148,110 L148,120 L158,120" stroke="#1db8a8" strokeWidth={1.2} fill="none"/>
        <circle cx={158} cy={120} r={2} fill="#1db8a8"/>
      </g>
    );
    default: return null;
  }
}

function Necklace({ type, color }: { type: FaceParams["necklace"]; color: string }) {
  if(type === "none") return null;
  switch(type) {
    case "chain": return <path d="M65,190 Q100,200 135,190" fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3,2"/>;
    case "pendant": return (
      <g>
        <path d="M68,190 Q100,200 132,190" fill="none" stroke={color} strokeWidth={1.5}/>
        <circle cx={100} cy={203} r={4} fill={color}/>
      </g>
    );
    case "choker": return <path d="M62,186 Q100,194 138,186" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"/>;
    case "beads": return <path d="M65,190 Q100,200 135,190" fill="none" stroke={color} strokeWidth={4} strokeDasharray="4,3"/>;
    default: return null;
  }
}

// ─── Skin details ─────────────────────────────────────────────────────────────

function SkinDetails({ skinDetail, aging, skin, makeup }: {
  skinDetail: FaceParams["skinDetail"]; aging: FaceParams["aging"];
  skin: string; makeup: FaceParams["makeup"];
}) {
  const shadow = darken(skin, 20);
  return (
    <g>
      {/* Cheek blush */}
      <ellipse cx={58} cy={132} rx={16} ry={9} fill="#ff8a8a" opacity={0.1}/>
      <ellipse cx={142} cy={132} rx={16} ry={9} fill="#ff8a8a" opacity={0.1}/>
      {/* Forehead highlight */}
      <ellipse cx={100} cy={72} rx={22} ry={10} fill="#ffffff" opacity={0.1}/>

      {/* Freckles / moles */}
      {(skinDetail === "freckles") && (() => {
        const spots = [[88,122],[92,118],[96,120],[104,118],[108,122],[112,120],[85,126],[115,126]];
        return <g>{spots.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={1.5} fill={shadow} opacity={0.45}/>)}</g>;
      })()}
      {skinDetail === "moles" && (
        <g>
          <circle cx={115} cy={128} r={2.5} fill={darken(skin,60)} opacity={0.7}/>
          <circle cx={72} cy={105} r={1.5} fill={darken(skin,60)} opacity={0.5}/>
        </g>
      )}

      {/* Wrinkles (from skinDetail or aging) */}
      {(skinDetail === "wrinkles" || aging === "light") && (
        <g opacity={0.3} stroke={shadow} strokeWidth={1} fill="none" strokeLinecap="round">
          <path d="M55,110 Q53,106 58,103"/>
          <path d="M145,110 Q147,106 142,103"/>
          <path d="M82,148 Q100,151 118,148"/>
        </g>
      )}
      {aging === "heavy" && (
        <g opacity={0.4} stroke={shadow} strokeWidth={1.2} fill="none" strokeLinecap="round">
          <path d="M52,107 Q50,101 57,98"/>
          <path d="M55,114 Q53,109 59,107"/>
          <path d="M148,107 Q150,101 143,98"/>
          <path d="M145,114 Q147,109 141,107"/>
          <path d="M80,148 Q100,153 120,148"/>
          <path d="M85,153 Q100,157 115,153"/>
        </g>
      )}

      {/* Scar */}
      {skinDetail === "scar" && <path d="M58,122 L65,135" stroke={darken(skin,40)} strokeWidth={1.5} opacity={0.7}/>}

      {/* Makeup */}
      {makeup === "light" && (
        <g>
          <ellipse cx={58} cy={132} rx={16} ry={9} fill="#e87070" opacity={0.15}/>
          <ellipse cx={142} cy={132} rx={16} ry={9} fill="#e87070" opacity={0.15}/>
          <path d="M58,108 Q68,102 74,104" fill="none" stroke="#5c3317" strokeWidth={1} opacity={0.4}/>
          <path d="M142,108 Q132,102 126,104" fill="none" stroke="#5c3317" strokeWidth={1} opacity={0.4}/>
        </g>
      )}
      {makeup === "natural" && (
        <g>
          <ellipse cx={58} cy={132} rx={14} ry={8} fill="#e87070" opacity={0.12}/>
          <ellipse cx={142} cy={132} rx={14} ry={8} fill="#e87070" opacity={0.12}/>
        </g>
      )}
      {makeup === "bold" && (
        <g>
          <ellipse cx={58} cy={132} rx={18} ry={10} fill="#e84060" opacity={0.25}/>
          <ellipse cx={142} cy={132} rx={18} ry={10} fill="#e84060" opacity={0.25}/>
          <path d="M58,109 Q68,103 74,105" fill="none" stroke="#111" strokeWidth={1.8} opacity={0.7}/>
          <path d="M142,109 Q132,103 126,105" fill="none" stroke="#111" strokeWidth={1.8} opacity={0.7}/>
          <path d="M78,158 Q100,172 122,158 Q110,165 100,163 Q90,165 78,158Z" fill="#cc2020" opacity={0.7}/>
        </g>
      )}
      {makeup === "goth" && (
        <g>
          <ellipse cx={58} cy={132} rx={14} ry={8} fill="#8020a0" opacity={0.2}/>
          <ellipse cx={142} cy={132} rx={14} ry={8} fill="#8020a0" opacity={0.2}/>
          <path d="M55,109 Q68,101 75,104" fill="none" stroke="#111" strokeWidth={2.5} opacity={0.8}/>
          <path d="M145,109 Q132,101 125,104" fill="none" stroke="#111" strokeWidth={2.5} opacity={0.8}/>
          <path d="M80,158 Q100,170 120,158" fill="none" stroke="#330033" strokeWidth={2.5} opacity={0.8}/>
        </g>
      )}
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AvatarFace({ params, size = 200 }: { params: FaceParams; size?: number }) {
  const uid = useId().replace(/:/g,"");
  const {
    faceShape, skinColor, aging,
    eyes, eyeColor, eyebrows, nose, mouth, ears,
    hair, hairColor, highlights, facialHair,
    makeup, skinDetail,
    glasses, glassesColor,
    earrings, earringsColor,
    hat, hatColor,
      piercing, tattoo,
    necklace, necklaceColor,
  } = params;

  const hc = HAIR_HEX[hairColor as FaceParams["hairColor"]] ?? "#333";

  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2}
      style={{ display:"block", overflow:"visible" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={`fc-${uid}`}>
          {faceClipPath(faceShape)}
        </clipPath>
      </defs>

      {/* ── Clothing (behind neck) ── */}
      

      {/* ── Neck ── */}
      <path d={`M88,178 Q100,185 112,178 L112,200 Q100,205 88,200 Z`} fill={skinColor}/>

      {/* ── Back hair ── */}
      <HairBack style={hair} color={hc}/>

      {/* ── Ears ── */}
      <Ears shape={ears} skin={skinColor}/>

      {/* ── Face base ── */}
      {faceFill(faceShape, skinColor)}

      {/* ── Skin details (blush, freckles, wrinkles, scar) ── */}
      <SkinDetails skinDetail={skinDetail} aging={aging} skin={skinColor} makeup={makeup}/>

      {/* ── Beard (back layer — jaw) ── */}
      <Beard type={facialHair} skin={skinColor} hairColor={hairColor}/>

      {/* ── Front hair ── */}
      <HairFront style={hair} color={hc} highlights={highlights}/>

      {/* ── Eyebrows ── */}
      <Eyebrow side="left"  type={eyebrows} hairColor={hc}/>
      <Eyebrow side="right" type={eyebrows} hairColor={hc}/>

      {/* ── Eyes ── */}
      <Eye side="left"  type={eyes} eyeColor={eyeColor}/>
      <Eye side="right" type={eyes} eyeColor={eyeColor}/>

      {/* ── Nose ── */}
      <Nose type={nose} skin={skinColor}/>

      {/* ── Mouth ── */}
      <Mouth type={mouth} skin={skinColor}/>

      {/* ── Glasses ── */}
      <Glasses type={glasses} color={glassesColor}/>

      {/* ── Earrings ── */}
      <Earrings type={earrings} color={earringsColor}/>

      {/* ── Piercing ── */}
      <Piercing type={piercing}/>

      {/* ── Necklace ── */}
      <Necklace type={necklace} color={necklaceColor}/>

      {/* ── Hat (front part, on top) ── */}
      <Hat type={hat} color={hatColor}/>

      {/* ── Tattoo ── */}
      <Tattoo type={tattoo}/>
    </svg>
  );
}
