#!/usr/bin/env python3
"""
MoltForge — Hackathon Slides v2
Полностью переработанные слайды с логотипом, swimlane flow, карточками.
"""

from PIL import Image, ImageDraw, ImageFont
import re, math, os

# --- Constants ---
W, H = 1200, 630
BG       = (10, 10, 10)       # #0a0a0a
TEAL     = (29, 184, 168)     # #1db8a8
TEAL_DIM = (16, 100, 92)      # darker teal for cards
WHITE    = (255, 255, 255)
GRAY     = (107, 114, 128)    # #6b7280
GRAY_LT  = (180, 186, 194)
DARK_CARD= (18, 24, 22)       # card background
BORDER   = (35, 50, 47)       # card border
RED      = (220, 60, 60)
GREEN    = (80, 200, 120)

ASSETS = os.path.dirname(os.path.abspath(__file__))
FONT_B = "/System/Library/Fonts/Supplemental/Courier New Bold.ttf"
FONT_R = "/System/Library/Fonts/Supplemental/Courier New.ttf"

def fnt(path, size):
    return ImageFont.truetype(path, size)

# Preload logo
LOGO_IMG = Image.open(os.path.join(ASSETS, "moltforge-logo.png")).convert("RGBA")

def paste_logo(img, x, y, height=56):
    """Paste logo at given position, scaled to height"""
    lw, lh = LOGO_IMG.size
    new_w = int(lw * height / lh)
    logo = LOGO_IMG.resize((new_w, height), Image.LANCZOS)
    img.paste(logo, (x, y), logo)
    return new_w  # return width used

def new_img():
    return Image.new("RGB", (W, H), BG)

def draw_dot_grid(img, color=TEAL, spacing=38, opacity=0.05):
    overlay = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(overlay)
    dot_col = (*color, int(255*opacity))
    for x in range(spacing//2, W, spacing):
        for y in range(spacing//2, H, spacing):
            d.ellipse([x-1,y-1,x+1,y+1], fill=dot_col)
    base = img.convert("RGBA")
    base.alpha_composite(overlay)
    return base.convert("RGB")

def draw_header(img, d, slide_label="", slide_num=""):
    """Common header with logo wordmark + slide label"""
    # Logo sprite (small)
    lw = paste_logo(img, 44, 14, height=44)
    # "MoltForge" wordmark
    f_brand = fnt(FONT_B, 22)
    d.text((44 + lw + 10, 24), "MoltForge", fill=WHITE, font=f_brand)
    # Testnet badge
    f_badge = fnt(FONT_R, 11)
    d.text((44 + lw + 10, 48), "TESTNET", fill=TEAL, font=f_badge)
    # Slide label right
    if slide_label:
        f_label = fnt(FONT_R, 13)
        tw = d.textlength(slide_label, font=f_label)
        d.text((W - 60 - tw, 30), slide_label, fill=GRAY, font=f_label)
    # Slide number
    if slide_num:
        f_num = fnt(FONT_R, 12)
        tw2 = d.textlength(slide_num, font=f_num)
        d.text((W - 60 - tw2, H - 32), slide_num, fill=GRAY, font=f_num)
    # Header rule
    d.line([(44, 70), (W-44, 70)], fill=BORDER, width=1)

def card(d, x, y, w, h, border_color=None, fill=None):
    """Draw a card background with border"""
    bg = fill or DARK_CARD
    bc = border_color or BORDER
    d.rectangle([x, y, x+w, y+h], fill=bg)
    d.rectangle([x, y, x+w, y+h], outline=bc, width=1)

def teal_accent_bar(d, x, y, w=3, h=60):
    d.rectangle([x, y, x+w, y+h], fill=TEAL)

def arrow_h(d, x1, y, x2, color=TEAL, label=""):
    """Horizontal arrow"""
    mid = (y,)
    d.line([(x1, y), (x2, y)], fill=color, width=2)
    # Arrowhead
    d.polygon([(x2, y), (x2-8, y-5), (x2-8, y+5)], fill=color)
    if label:
        f = fnt(FONT_R, 11)
        lw = d.textlength(label, font=f)
        d.text(((x1+x2)//2 - lw//2, y-18), label, fill=GRAY_LT, font=f)

def arrow_v(d, x, y1, y2, color=GRAY, label=""):
    """Vertical arrow"""
    d.line([(x, y1), (x, y2)], fill=color, width=1)
    d.polygon([(x, y2), (x-5, y2-8), (x+5, y2-8)], fill=color)

# =====================================================================
# COVER
# =====================================================================
def make_cover():
    img = new_img()
    img = draw_dot_grid(img, opacity=0.04)
    d = ImageDraw.Draw(img)

    # Left teal vertical bar (accent)
    d.rectangle([0, 0, 5, H], fill=TEAL)

    # Big logo left side
    lw = paste_logo(img, 60, 80, height=200)

    # Wordmark below logo
    f_brand = fnt(FONT_B, 48)
    d.text((60, 295), "MoltForge", fill=WHITE, font=f_brand)
    f_tag = fnt(FONT_R, 17)
    d.text((62, 352), "AI Agent Labor Marketplace", fill=TEAL, font=f_tag)

    # Right side — headline
    rx = 520
    f_eyebrow = fnt(FONT_R, 14)
    d.text((rx, 90), "THE UNCOMFORTABLE TRUTH ABOUT AI", fill=TEAL, font=f_eyebrow)

    # Thin teal rule
    d.line([(rx, 116), (rx + 620, 116)], fill=TEAL, width=1)

    f_h1 = fnt(FONT_B, 54)
    f_h1m= fnt(FONT_B, 50)
    d.text((rx, 128), "You're paying for AI", fill=WHITE, font=f_h1)
    d.text((rx, 190), "that doesn't deliver.", fill=TEAL, font=f_h1m)

    f_sub = fnt(FONT_R, 20)
    d.text((rx, 272), "Hire AI agents that stake real money", fill=GRAY_LT, font=f_sub)
    d.text((rx, 298), "on getting the job done.", fill=GRAY_LT, font=f_sub)

    # Divider
    d.line([(rx, 368), (rx + 620, 368)], fill=BORDER, width=1)

    # Stack badges
    f_badge = fnt(FONT_R, 13)
    badges = ["Built on Base", "ERC-8004 Identity", "USDC Escrow", "Merit SBT"]
    bx = rx
    for b in badges:
        bw = int(d.textlength(b, font=f_badge)) + 24
        d.rectangle([bx, 388, bx+bw, 416], outline=TEAL, width=1)
        d.text((bx+12, 393), b, fill=TEAL, font=f_badge)
        bx += bw + 12

    # CTA
    f_cta = fnt(FONT_B, 16)
    d.text((rx, H - 60), "moltforge.cloud", fill=WHITE, font=f_cta)
    cta_w = int(d.textlength("moltforge.cloud", font=f_cta))
    d.line([(rx, H - 38), (rx + cta_w, H - 38)], fill=TEAL, width=1)

    # Vertical separator
    d.line([(490, 70), (490, H - 40)], fill=BORDER, width=1)

    # Bottom bar
    d.rectangle([0, H-4, W, H], fill=TEAL)

    img.save(os.path.join(ASSETS, "cover.png"))
    print("✅ cover.png")

# =====================================================================
# SLIDE 1 — Problem
# =====================================================================
def make_slide1():
    img = new_img()
    img = draw_dot_grid(img, opacity=0.04)
    d = ImageDraw.Draw(img)
    draw_header(img, d, "01 / PROBLEM", "01/05")

    f_eyebrow = fnt(FONT_R, 13)
    f_head = fnt(FONT_B, 46)
    f_card_title = fnt(FONT_B, 16)
    f_card_body = fnt(FONT_R, 14)
    f_num = fnt(FONT_B, 36)

    d.text((60, 86), "THE PROBLEM", fill=TEAL, font=f_eyebrow)
    d.text((60, 108), "AI agents move money", fill=WHITE, font=f_head)
    d.text((60, 158), "— but vanish when they fail.", fill=TEAL, font=fnt(FONT_B, 40))

    d.line([(60, 218), (W-60, 218)], fill=BORDER, width=1)

    problems = [
        ("✗", "No Identity",     "Anyone can fake an agent.\nZero verification, zero proof."),
        ("✗", "No Reputation",   "Track records vanish.\nEvery agent is a stranger."),
        ("✗", "No Payment Rails","Crypto is wild west.\nNo guaranteed escrow."),
        ("✗", "No Accountability","Agent fails, disappears.\nNo receipts. No refund."),
    ]

    cx = 60
    cw = (W - 120 - 36) // 4
    cy = 234
    ch = 330

    for i, (icon, title, body) in enumerate(problems):
        x = cx + i * (cw + 12)
        card(d, x, cy, cw, ch, border_color=(80, 30, 30))
        # Red accent top bar
        d.rectangle([x, cy, x+cw, cy+3], fill=RED)
        # Number
        d.text((x+16, cy+14), f"0{i+1}", fill=(60, 20, 20), font=f_num)
        # Icon X
        d.text((x + cw - 32, cy+14), icon, fill=RED, font=fnt(FONT_B, 22))
        # Title
        d.text((x+16, cy+72), title, fill=WHITE, font=f_card_title)
        d.line([(x+16, cy+94), (x+cw-16, cy+94)], fill=BORDER, width=1)
        # Body
        for j, line in enumerate(body.split("\n")):
            d.text((x+16, cy+106+j*22), line, fill=GRAY_LT, font=f_card_body)

    # Bottom tagline
    f_tag = fnt(FONT_B, 18)
    d.text((60, H-42), "No receipts. No accountability. No consequences.", fill=GRAY, font=fnt(FONT_R, 16))

    img.save(os.path.join(ASSETS, "slide_1.png"))
    print("✅ slide_1.png")

# =====================================================================
# SLIDE 2 — Solution
# =====================================================================
def make_slide2():
    img = new_img()
    img = draw_dot_grid(img, opacity=0.04)
    d = ImageDraw.Draw(img)
    draw_header(img, d, "02 / SOLUTION", "02/05")

    f_eyebrow = fnt(FONT_R, 13)
    f_head = fnt(FONT_B, 44)
    f_feat_title = fnt(FONT_B, 17)
    f_feat_body = fnt(FONT_R, 14)

    d.text((60, 86), "THE SOLUTION", fill=TEAL, font=f_eyebrow)
    d.text((60, 108), "MoltForge", fill=TEAL, font=f_head)
    d.text((60, 158), "First onchain marketplace for AI agents.", fill=WHITE, font=fnt(FONT_R, 24))

    d.line([(60, 206), (W-60, 206)], fill=BORDER, width=1)

    features = [
        ("🆔", "Onchain Identity",     "ERC-8004 agent registry.\nEvery agent = verified address."),
        ("📋", "Task Marketplace",      "Browse, apply, get selected.\nStructured job posting."),
        ("💰", "USDC Escrow",           "Payment locked upfront.\nReleased on confirmed delivery."),
        ("🏅", "Merit SBT Reputation",  "Soul-bound token tracks\nonchain track record."),
        ("⚖️",  "Dispute Resolution",   "Decentralized validator vote.\nEconomic incentives for honesty."),
    ]

    cw = (W - 120 - 48) // 5
    cx = 60
    cy = 224
    ch = 340

    for i, (icon, title, body) in enumerate(features):
        x = cx + i * (cw + 12)
        card(d, x, cy, cw, ch, border_color=BORDER)
        # Teal top
        d.rectangle([x, cy, x+cw, cy+3], fill=TEAL)
        # Icon
        d.text((x+16, cy+14), icon, fill=WHITE, font=fnt(FONT_B, 28))
        # Title
        d.text((x+16, cy+60), title, fill=TEAL, font=f_feat_title)
        d.line([(x+16, cy+82), (x+cw-12, cy+82)], fill=BORDER, width=1)
        # Body
        for j, line in enumerate(body.split("\n")):
            d.text((x+16, cy+96+j*22), line, fill=GRAY_LT, font=f_feat_body)

    # Right side: tagline with logo
    paste_logo(img, W - 180, H - 170, height=110)
    f_tag = fnt(FONT_R, 14)
    d.text((60, H-40), "Agents stake money → fail to deliver → lose stake + reputation.", fill=GRAY, font=f_tag)

    img.save(os.path.join(ASSETS, "slide_2.png"))
    print("✅ slide_2.png")

# =====================================================================
# SLIDE 3 — Tech Stack
# =====================================================================
def make_slide3():
    img = new_img()
    img = draw_dot_grid(img, opacity=0.04)
    d = ImageDraw.Draw(img)
    draw_header(img, d, "03 / TECH STACK", "03/05")

    f_eyebrow = fnt(FONT_R, 13)
    f_head = fnt(FONT_B, 38)
    f_cat = fnt(FONT_B, 13)
    f_item = fnt(FONT_R, 13)

    d.text((60, 86), "TECH STACK", fill=TEAL, font=f_eyebrow)
    d.text((60, 106), "Built on proven standards.", fill=WHITE, font=f_head)
    d.line([(60, 156), (W-60, 156)], fill=BORDER, width=1)

    # 3-column layout
    cols = [
        ("BLOCKCHAIN + STANDARDS", [
            ("Blockchain", "Base Sepolia (chain 84532)"),
            ("Wallet",     "MetaMask / RainbowKit"),
            ("ERC-8004",   "Agent identity registry"),
            ("x402",       "HTTP payment protocol"),
            ("ERC-5192",   "Soul-Bound Token (SBT)"),
        ]),
        ("SMART CONTRACTS", [
            ("AgentRegistry",     "ERC-8004 identity store"),
            ("MoltForgeEscrow V3","USDC lock & release"),
            ("MeritSBT",          "Reputation NFT (non-transfer)"),
            ("MockUSDC",          "Testnet stablecoin"),
            ("MoltForgeDAO",      "Dispute governance"),
        ]),
        ("FRONTEND + INFRA", [
            ("Next.js 14",   "App Router + RSC"),
            ("wagmi v2",     "Ethereum hooks"),
            ("Tailwind CSS", "Utility-first styling"),
            ("Vercel",       "Frontend deployment"),
            ("Railway",      "Agent runtime (TS/Express)"),
            ("MCP Server",   "moltforge.cloud/mcp"),
        ]),
    ]

    col_w = (W - 120 - 48) // 3
    cy_start = 172

    for ci, (cat_title, items) in enumerate(cols):
        cx = 60 + ci * (col_w + 24)
        card(d, cx, cy_start, col_w, H - cy_start - 60, border_color=BORDER)
        # Category header
        d.rectangle([cx, cy_start, cx+col_w, cy_start+3], fill=TEAL)
        d.text((cx+14, cy_start+12), cat_title, fill=TEAL, font=f_cat)
        d.line([(cx+14, cy_start+34), (cx+col_w-14, cy_start+34)], fill=BORDER, width=1)

        iy = cy_start + 46
        for key, val in items:
            # key in teal, value in gray
            kw = int(d.textlength(key, font=fnt(FONT_B, 13)))
            d.text((cx+14, iy), key, fill=TEAL, font=fnt(FONT_B, 13))
            d.text((cx+14, iy+17), val, fill=GRAY_LT, font=f_item)
            iy += 46
            if iy > H - 80:
                break

    img.save(os.path.join(ASSETS, "slide_3.png"))
    print("✅ slide_3.png")

# =====================================================================
# SLIDE 4 — Flow Diagram (Swimlanes)
# =====================================================================
def make_slide4():
    img = new_img()
    img = draw_dot_grid(img, opacity=0.03)
    d = ImageDraw.Draw(img)
    draw_header(img, d, "04 / FLOW DIAGRAM", "04/05")

    f_eyebrow = fnt(FONT_R, 13)
    f_head = fnt(FONT_B, 32)
    f_lane = fnt(FONT_B, 13)
    f_node = fnt(FONT_B, 11)
    f_sub  = fnt(FONT_R, 10)

    d.text((60, 86), "END-TO-END FLOW", fill=TEAL, font=f_eyebrow)
    d.text((60, 104), "Trustless task lifecycle — onchain.", fill=WHITE, font=f_head)

    # --- Swimlane layout ---
    lane_x = 44         # left edge for lane labels
    content_x = 148     # where boxes start
    content_w = W - content_x - 44
    lane_y_client = 156
    lane_y_agent  = 320
    lane_y_dispute= 470
    lane_h = 130
    dispute_h = 110

    # Lane backgrounds
    d.rectangle([lane_x, lane_y_client, W-44, lane_y_client+lane_h], fill=(12,22,20))
    d.rectangle([lane_x, lane_y_agent,  W-44, lane_y_agent +lane_h], fill=(10,18,16))
    d.rectangle([lane_x, lane_y_dispute,W-44, lane_y_dispute+dispute_h], fill=(16,14,10))

    # Lane borders
    d.rectangle([lane_x, lane_y_client, W-44, lane_y_client+lane_h], outline=(29,60,55), width=1)
    d.rectangle([lane_x, lane_y_agent,  W-44, lane_y_agent +lane_h], outline=(25,55,50), width=1)
    d.rectangle([lane_x, lane_y_dispute,W-44, lane_y_dispute+dispute_h], outline=(55,50,25), width=1)

    # Lane label tabs
    def lane_tab(text, y, color):
        d.rectangle([lane_x, y, lane_x+96, y+26], fill=color)
        d.text((lane_x+8, y+5), text, fill=BG, font=f_lane)

    lane_tab("CLIENT", lane_y_client, TEAL)
    lane_tab("AGENT", lane_y_agent, (100, 190, 170))
    lane_tab("DISPUTE", lane_y_dispute, (180, 160, 60))

    # --- Helper: draw a node box ---
    def node_box(cx, cy, lines, color, lane_bg=BG):
        bw = 128
        bh = 52
        x0 = cx - bw//2
        y0 = cy - bh//2
        d.rectangle([x0, y0, x0+bw, y0+bh], fill=lane_bg)
        d.rectangle([x0, y0, x0+bw, y0+bh], outline=color, width=2)
        total_h = len(lines) * 14
        start_y = cy - total_h//2
        for li, line in enumerate(lines):
            lw2 = d.textlength(line, font=f_node)
            d.text((cx - lw2//2, start_y + li*14), line, fill=color, font=f_node)
        return bw

    # CLIENT nodes
    client_cy = lane_y_client + lane_h // 2
    agent_cy  = lane_y_agent  + lane_h // 2
    dispute_cy = lane_y_dispute + dispute_h // 2

    # X positions for 6 client steps
    steps_x = [220, 360, 500, 648, 796, 944, 1092]

    client_steps = [
        (["Register", "Wallet"], TEAL),
        (["Create Task", "(USDC→Escrow)"], TEAL),
        (["Select Agent"], TEAL),
        (["Review Result"], TEAL),
        (["Confirm ✓"], GREEN),
        (["USDC Released"], GREEN),
    ]

    agent_steps = [
        (["Register", "ERC-8004"], (100,190,170)),
        (["Browse Tasks"], (100,190,170)),
        (["Apply + Stake 5%"], (100,190,170)),
        (["Execute Task"], (100,190,170)),
        (["Submit Result"], (100,190,170)),
        (["USDC + Merit SBT 🏅"], (130,220,190)),
    ]

    # Draw client nodes and arrows
    for i, ((lines, color), cx) in enumerate(zip(client_steps, steps_x)):
        node_box(cx, client_cy, lines, color, lane_bg=(12,22,20))
        if i < len(client_steps)-1:
            arrow_h(d, cx+65, client_cy, steps_x[i+1]-65, color=TEAL)

    # Draw agent nodes and arrows
    for i, ((lines, color), cx) in enumerate(zip(agent_steps, steps_x)):
        node_box(cx, agent_cy, lines, color, lane_bg=(10,18,16))
        if i < len(agent_steps)-1:
            arrow_h(d, cx+65, agent_cy, steps_x[i+1]-65, color=(100,190,170))

    # Cross-lane connectors
    # "Create Task" ↓ → "Browse Tasks" (tasks appear)
    arrow_v(d, steps_x[1], client_cy+26, agent_cy-26, color=GRAY, label="")
    # "Select Agent" ↑ from "Apply"
    mid_x = steps_x[2]
    d.line([(mid_x, agent_cy-26), (mid_x, client_cy+26)], fill=GRAY, width=1)
    d.polygon([(mid_x, client_cy+26), (mid_x-5, client_cy+38), (mid_x+5, client_cy+38)], fill=GRAY)
    # "Submit Result" → "Review Result"
    arrow_v(d, steps_x[4], agent_cy-26, client_cy+26, color=GRAY)

    # Dispute path nodes
    dispute_steps_x = [360, 580, 800, 1020]
    dispute_nodes = [
        ["Client", "Disputes"],
        ["Arbiters", "Vote 24h"],
        ["Finalize"],
        ["Winner", "Gets Funds"],
    ]
    dispute_colors = [(180,160,60), (180,160,60), (180,160,60), GREEN]

    for i, (lines, cx) in enumerate(zip(dispute_nodes, dispute_steps_x)):
        node_box(cx, dispute_cy, lines, dispute_colors[i], lane_bg=(16,14,10))
        if i < len(dispute_nodes)-1:
            arrow_h(d, cx+65, dispute_cy, dispute_steps_x[i+1]-65, color=(160,140,50))

    # "Confirm ✓" vs "Dispute" branch indicator
    d.text((steps_x[3]+70, client_cy-30), "✓ happy", fill=GREEN, font=f_sub)
    d.text((steps_x[3]+70, client_cy+8), "✗ dispute↓", fill=(180,160,60), font=f_sub)

    img.save(os.path.join(ASSETS, "slide_4.png"))
    print("✅ slide_4.png")

# =====================================================================
# SLIDE 5 — Roadmap
# =====================================================================
def make_slide5():
    img = new_img()
    img = draw_dot_grid(img, opacity=0.04)
    d = ImageDraw.Draw(img)
    draw_header(img, d, "05 / ROADMAP", "05/05")

    f_eyebrow = fnt(FONT_R, 13)
    f_head = fnt(FONT_B, 38)
    f_phase_title = fnt(FONT_B, 16)
    f_phase_sub = fnt(FONT_R, 12)
    f_item = fnt(FONT_R, 14)

    d.text((60, 86), "ROADMAP", fill=TEAL, font=f_eyebrow)
    d.text((60, 106), "From hackathon MVP to the world.", fill=WHITE, font=f_head)
    d.line([(60, 156), (W-60, 156)], fill=BORDER, width=1)

    phases = [
        {
            "phase": "✅ Phase 1 — NOW",
            "sub": "Base Sepolia Testnet",
            "color": TEAL,
            "items": [
                "AgentRegistry — ERC-8004 identity",
                "USDC Escrow — funds locked on task",
                "Merit SBT — onchain reputation",
                "MCP Server — moltforge.cloud/mcp",
                "Reference Agent — live & working",
                "Decentralized dispute resolution",
            ],
            "status": "LIVE"
        },
        {
            "phase": "🔄 Phase 2 — Q2 2026",
            "sub": "Production",
            "color": (150, 200, 190),
            "items": [
                "Base Mainnet + real USDC",
                "Per-user agent deployment",
                "Telegram bot integration",
                "Agent self-registration API",
                "One-click agent deploy",
            ],
            "status": "NEXT"
        },
        {
            "phase": "📋 Phase 3 — Q3 2026",
            "sub": "Decentralization",
            "color": GRAY_LT,
            "items": [
                "Agent-to-agent task market",
                "Cross-platform reputation API",
                "Appeal mechanism for disputes",
                "DAO governance live",
            ],
            "status": "PLANNED"
        },
        {
            "phase": "🚀 Phase 4 — Q4 2026+",
            "sub": "Scale",
            "color": GRAY,
            "items": [
                "Multi-agent project teams",
                "DeFi tier gating integrations",
                "Normie-friendly agent builder",
            ],
            "status": "VISION"
        },
    ]

    col_w = (W - 120 - 36) // 4
    cy = 172

    for i, phase in enumerate(phases):
        cx = 60 + i * (col_w + 12)
        ch = H - cy - 50
        card(d, cx, cy, col_w, ch, border_color=BORDER)
        # Top accent bar
        d.rectangle([cx, cy, cx+col_w, cy+4], fill=phase["color"])
        # Status badge
        f_status = fnt(FONT_R, 10)
        sw = int(d.textlength(phase["status"], font=f_status)) + 14
        d.rectangle([cx+col_w-sw-8, cy+12, cx+col_w-8, cy+28], fill=DARK_CARD, outline=phase["color"], width=1)
        d.text((cx+col_w-sw-1, cy+14), phase["status"], fill=phase["color"], font=f_status)
        # Phase title
        d.text((cx+14, cy+16), phase["phase"], fill=phase["color"], font=f_phase_title)
        d.text((cx+14, cy+36), phase["sub"], fill=GRAY, font=f_phase_sub)
        d.line([(cx+14, cy+54), (cx+col_w-14, cy+54)], fill=BORDER, width=1)
        # Items
        iy = cy + 64
        for item in phase["items"]:
            # Bullet
            d.text((cx+14, iy), "→", fill=phase["color"], font=f_phase_sub)
            # Wrap text
            f_i = fnt(FONT_R, 13)
            max_w = col_w - 42
            words = item.split()
            lines = []
            cur = []
            for w in words:
                test = " ".join(cur+[w])
                if d.textlength(test, font=f_i) <= max_w:
                    cur.append(w)
                else:
                    if cur: lines.append(" ".join(cur))
                    cur = [w]
            if cur: lines.append(" ".join(cur))
            for li, ln in enumerate(lines):
                d.text((cx+30, iy+li*16), ln, fill=GRAY_LT if i==0 else GRAY, font=f_i)
            iy += len(lines)*16 + 6
            if iy > H - 70:
                break

    # Timeline arrow
    arrow_h(d, 60, H-30, W-60, color=BORDER)
    d.text((60, H-44), "2026", fill=GRAY, font=fnt(FONT_R, 11))
    d.text((W-100, H-44), "2027", fill=GRAY, font=fnt(FONT_R, 11))

    img.save(os.path.join(ASSETS, "slide_5.png"))
    print("✅ slide_5.png")


if __name__ == "__main__":
    make_cover()
    make_slide1()
    make_slide2()
    make_slide3()
    make_slide4()
    make_slide5()
    print("\n🎨 All 6 images generated!")
