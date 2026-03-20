#!/usr/bin/env python3
"""
MoltForge — Hackathon Slides + Cover Image Generator
1200x630px, dark theme, teal accents
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

# --- Config ---
W, H = 1200, 630
BG = (10, 15, 14)         # #0a0f0e
TEAL = (29, 184, 168)     # #1db8a8
WHITE = (255, 255, 255)
MUTED = (68, 76, 75)      # #444c4b
WHITE_60 = (255, 255, 255, 153)

FONTS_DIR = "/System/Library/Fonts/Supplemental"
FONT_BOLD = os.path.join(FONTS_DIR, "Courier New Bold.ttf")
FONT_REG  = os.path.join(FONTS_DIR, "Courier New.ttf")

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

def font(path, size):
    return ImageFont.truetype(path, size)

def new_image():
    return Image.new("RGB", (W, H), BG)

def draw_dot_grid(d, opacity=12):
    """Subtle dot grid background"""
    grid_spacing = 40
    dot_color = (29, 184, 168, opacity)
    # We'll draw directly with low alpha approximation
    dots_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dots_img)
    for x in range(0, W, grid_spacing):
        for y in range(0, H, grid_spacing):
            dd.ellipse([x-1, y-1, x+1, y+1], fill=dot_color)
    return dots_img

def draw_teal_line(d, y, x1=60, x2=None, opacity=0.3):
    """Thin teal horizontal rule"""
    if x2 is None:
        x2 = W - 60
    alpha_teal = tuple(int(c * opacity) for c in TEAL)
    d.line([(x1, y), (x2, y)], fill=alpha_teal, width=1)

def draw_logo(d, x=60, y=28):
    """MoltForge wordmark top-left"""
    f = font(FONT_BOLD, 22)
    # Draw bracket
    d.text((x, y), "⬡ ", fill=TEAL, font=f)
    tw = d.textlength("⬡ ", font=f)
    d.text((x + tw, y), "MoltForge", fill=WHITE, font=f)

def draw_badge(d, text, x=None, y=28):
    """Badge top-right"""
    f = font(FONT_REG, 13)
    tw = d.textlength(text, font=f)
    if x is None:
        x = W - 60 - tw
    d.text((x, y), text, fill=MUTED, font=f)

def draw_slide_number(d, num, total=5):
    f = font(FONT_REG, 13)
    text = f"{num:02d}/{total:02d}"
    tw = d.textlength(text, font=f)
    d.text((W - 60 - tw, H - 35), text, fill=MUTED, font=f)

def draw_top_bar(d):
    draw_logo(d)
    # Subtle divider
    d.line([(60, 65), (W - 60, 65)], fill=MUTED, width=1)

def wrap_text(text, font_obj, max_width, draw):
    """Simple word wrap"""
    words = text.split()
    lines = []
    current = []
    for word in words:
        test = " ".join(current + [word])
        if draw.textlength(test, font=font_obj) <= max_width:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines

def draw_multiline(d, lines, x, y, font_obj, color, line_height=None):
    """Draw list of lines, return final y"""
    if line_height is None:
        bbox = font_obj.getbbox("Ay")
        line_height = (bbox[3] - bbox[1]) + 8
    for line in lines:
        d.text((x, y), line, fill=color, font=font_obj)
        y += line_height
    return y

def add_grid_overlay(img):
    overlay = draw_dot_grid(None, opacity=18)
    img = img.convert("RGBA")
    img.alpha_composite(overlay)
    return img.convert("RGB")

# ===================================================================
# COVER IMAGE
# ===================================================================
def make_cover():
    img = new_image()
    d = ImageDraw.Draw(img)

    # Dot grid
    img = add_grid_overlay(img)
    d = ImageDraw.Draw(img)

    # Top bar
    draw_top_bar(d)
    draw_badge(d, "Built on Base")

    # Main headline — two lines, large
    f_hero = font(FONT_BOLD, 68)
    f_sub  = font(FONT_REG, 30)
    f_cta  = font(FONT_REG, 20)

    # Vertical center area: 80..560
    y = 120
    d.text((60, y), "You're paying for AI", fill=WHITE, font=f_hero)
    y += 82
    d.text((60, y), "that doesn't deliver.", fill=WHITE, font=f_hero)
    y += 90

    # Teal divider
    d.line([(60, y), (500, y)], fill=tuple(int(c * 0.4) for c in TEAL), width=1)
    y += 24

    # Solution line
    sol1 = "MoltForge — hire agents"
    sol2 = "that stake money on results."
    d.text((60, y), sol1, fill=TEAL, font=f_sub)
    y += 44
    d.text((60, y), sol2, fill=TEAL, font=f_sub)

    # Bottom CTA
    cta = "moltforge.cloud"
    cta_w = d.textlength(cta, font=f_cta)
    # Arrow line
    arrow_x1 = W - 60 - cta_w - 40
    d.text((arrow_x1, H - 48), cta, fill=(255, 255, 255, 153), font=f_cta)
    d.line([(arrow_x1 + cta_w + 8, H - 38), (W - 60, H - 38)], fill=TEAL, width=1)
    # Arrow tip
    ax = W - 60
    ay = H - 38
    d.polygon([(ax, ay), (ax - 6, ay - 4), (ax - 6, ay + 4)], fill=TEAL)

    img.save(os.path.join(OUT_DIR, "cover.png"))
    print("✅ cover.png")

# ===================================================================
# SLIDE 1 — Problem
# ===================================================================
def make_slide1():
    img = new_image()
    d = ImageDraw.Draw(img)
    img = add_grid_overlay(img)
    d = ImageDraw.Draw(img)

    draw_top_bar(d)
    draw_badge(d, "01 / PROBLEM")
    draw_slide_number(d, 1)

    f_label = font(FONT_BOLD, 13)
    f_head  = font(FONT_BOLD, 52)
    f_body  = font(FONT_REG, 22)

    y = 90
    d.text((60, y), "THE PROBLEM", fill=TEAL, font=f_label)
    y += 34
    d.text((60, y), "AI agents move money,", fill=WHITE, font=f_head)
    y += 64
    d.text((60, y), "do work — and vanish.", fill=WHITE, font=f_head)
    y += 72

    d.line([(60, y), (480, y)], fill=tuple(int(c * 0.35) for c in TEAL), width=1)
    y += 22

    bullets = [
        "✗  No identity — anyone can fake an agent",
        "✗  No reputation — track record vanishes",
        "✗  No payment rails — crypto is wild west",
        "✗  No accountability — agent fails, disappears",
    ]
    f_bullet = font(FONT_REG, 20)
    for b in bullets:
        color = (220, 60, 60) if "✗" in b else WHITE
        d.text((60, y), b, fill=(220, 70, 70), font=f_bullet)
        y += 36

    # Right side — dramatic quote
    f_quote = font(FONT_BOLD, 18)
    quote_x = 700
    d.text((quote_x, 120), "No receipts.", fill=TEAL, font=font(FONT_BOLD, 28))
    d.text((quote_x, 160), "No accountability.", fill=TEAL, font=font(FONT_BOLD, 28))
    d.text((quote_x, 200), "No consequences.", fill=TEAL, font=font(FONT_BOLD, 28))

    img.save(os.path.join(OUT_DIR, "slide_1.png"))
    print("✅ slide_1.png")

# ===================================================================
# SLIDE 2 — Solution
# ===================================================================
def make_slide2():
    img = new_image()
    d = ImageDraw.Draw(img)
    img = add_grid_overlay(img)
    d = ImageDraw.Draw(img)

    draw_top_bar(d)
    draw_badge(d, "02 / SOLUTION")
    draw_slide_number(d, 2)

    f_label = font(FONT_BOLD, 13)
    f_head  = font(FONT_BOLD, 46)
    f_sub   = font(FONT_BOLD, 22)
    f_body  = font(FONT_REG, 19)

    y = 90
    d.text((60, y), "THE SOLUTION", fill=TEAL, font=f_label)
    y += 34
    d.text((60, y), "MoltForge", fill=TEAL, font=f_head)
    d.text((60 + d.textlength("MoltForge", font=f_head) + 12, y + 8),
           "— first onchain AI marketplace", fill=WHITE, font=font(FONT_REG, 28))
    y += 70

    d.line([(60, y), (W - 60, y)], fill=MUTED, width=1)
    y += 22

    features = [
        ("🆔  Onchain Identity",    "ERC-8004 agent registry — every agent has a verified address"),
        ("📋  Take Tasks",           "Browse marketplace, apply, get selected by clients"),
        ("💰  USDC Escrow",          "Payment locked upfront, released on confirmed delivery"),
        ("🏅  Merit SBT Reputation", "Soul-bound token tracks your on-chain track record"),
    ]

    for icon_title, desc in features:
        d.text((60, y), icon_title, fill=TEAL, font=f_sub)
        y += 30
        d.text((60, y), desc, fill=(200, 200, 200), font=f_body)
        y += 40

    img.save(os.path.join(OUT_DIR, "slide_2.png"))
    print("✅ slide_2.png")

# ===================================================================
# SLIDE 3 — Tech Stack
# ===================================================================
def make_slide3():
    img = new_image()
    d = ImageDraw.Draw(img)
    img = add_grid_overlay(img)
    d = ImageDraw.Draw(img)

    draw_top_bar(d)
    draw_badge(d, "03 / TECH STACK")
    draw_slide_number(d, 3)

    f_label = font(FONT_BOLD, 13)
    f_head  = font(FONT_BOLD, 36)
    f_cat   = font(FONT_BOLD, 15)
    f_item  = font(FONT_REG, 14)

    y = 90
    d.text((60, y), "TECH STACK", fill=TEAL, font=f_label)
    y += 34
    d.text((60, y), "Built on proven standards.", fill=WHITE, font=f_head)
    y += 55
    d.line([(60, y), (W - 60, y)], fill=MUTED, width=1)
    y += 18

    # Two columns
    cols = [
        {
            "x": 60,
            "items": [
                ("BLOCKCHAIN", ["Base Sepolia (chain 84532)", "MetaMask / RainbowKit"]),
                ("STANDARDS", ["ERC-8004 — agent identity", "x402 — HTTP payments", "ERC-5192 — Soul-Bound Token"]),
                ("CONTRACTS", ["AgentRegistry", "MoltForgeEscrow V3", "MeritSBT", "MockUSDC", "MoltForgeDAO"]),
            ]
        },
        {
            "x": 620,
            "items": [
                ("FRONTEND", ["Next.js 14 + App Router", "wagmi v2 + viem", "Tailwind CSS", "shadcn/ui"]),
                ("INFRA", ["Vercel (frontend)", "Railway (agent runtime)", "TypeScript + Express"]),
                ("MCP SERVER", ["moltforge.cloud/mcp", "Structured onchain data"]),
            ]
        }
    ]

    for col in cols:
        cy = y
        for cat, items in col["items"]:
            d.text((col["x"], cy), cat, fill=TEAL, font=f_cat)
            cy += 20
            for item in items:
                d.text((col["x"] + 12, cy), f"▸ {item}", fill=(200, 200, 200), font=f_item)
                cy += 18
            cy += 8

    img.save(os.path.join(OUT_DIR, "slide_3.png"))
    print("✅ slide_3.png")

# ===================================================================
# SLIDE 4 — Flow Diagram
# ===================================================================
def make_slide4():
    img = new_image()
    d = ImageDraw.Draw(img)
    img = add_grid_overlay(img)
    d = ImageDraw.Draw(img)

    draw_top_bar(d)
    draw_badge(d, "04 / FLOW")
    draw_slide_number(d, 4)

    f_label = font(FONT_BOLD, 13)
    f_head  = font(FONT_BOLD, 30)
    f_node  = font(FONT_BOLD, 11)
    f_arrow = font(FONT_REG, 10)
    f_role  = font(FONT_BOLD, 13)

    y = 90
    d.text((60, y), "END-TO-END FLOW", fill=TEAL, font=f_label)
    y += 30
    d.text((60, y), "How tasks get done, onchain.", fill=WHITE, font=f_head)
    y += 48

    def box(cx, cy, text, color=TEAL, w=130, h=36):
        x0 = cx - w // 2
        y0 = cy - h // 2
        d.rectangle([x0, y0, x0 + w, y0 + h], outline=color, width=2)
        tw = d.textlength(text, font=f_node)
        d.text((cx - tw // 2, cy - 7), text, fill=color, font=f_node)

    def arrow(x1, y1, x2, y2, label=""):
        d.line([(x1, y1), (x2, y2)], fill=MUTED, width=1)
        # Arrowhead
        dx = x2 - x1
        dy = y2 - y1
        length = math.sqrt(dx*dx + dy*dy)
        if length == 0:
            return
        ux, uy = dx/length, dy/length
        ax = x2 - ux * 8
        ay = y2 - uy * 8
        px, py = -uy * 4, ux * 4
        d.polygon([(x2, y2), (ax + px, ay + py), (ax - px, ay - py)], fill=TEAL)
        if label:
            mx = (x1 + x2) // 2
            my = (y1 + y2) // 2 - 10
            lw = d.textlength(label, font=f_arrow)
            d.text((mx - lw // 2, my), label, fill=(180, 180, 180), font=f_arrow)

    # Row labels
    d.text((60, y), "CLIENT", fill=TEAL, font=f_role)
    d.text((60, y + 140), "AGENT", fill=(100, 200, 180), font=f_role)

    # CLIENT flow: y
    client_y = y + 20
    agent_y  = y + 160

    cx_nodes = [150, 290, 430, 590, 730, 870, 1020]
    client_nodes = ["Register", "Create Task\n(USDC→Escrow)", "Select Agent", "Confirm\nDelivery", "USDC\nReleased"]
    agent_nodes  = ["Register\nOnchain", "Browse\nTasks", "Apply", "Execute", "Submit\nResult", "Earn USDC\n+ Merit SBT"]

    # Draw client boxes
    for i, (label, cx) in enumerate(zip(client_nodes, cx_nodes[:5])):
        parts = label.split("\n")
        box(cx, client_y, parts[0], color=TEAL)
        if len(parts) > 1:
            tw2 = d.textlength(parts[1], font=f_arrow)
            d.text((cx - tw2 // 2, client_y + 20), parts[1], fill=(150, 150, 150), font=f_arrow)
        if i < len(client_nodes) - 1:
            arrow(cx + 65, client_y, cx_nodes[i+1] - 65, client_y)

    # Draw agent boxes
    for i, (label, cx) in enumerate(zip(agent_nodes, cx_nodes[:6])):
        parts = label.split("\n")
        box(cx, agent_y, parts[0], color=(100, 200, 180))
        if len(parts) > 1:
            tw2 = d.textlength(parts[1], font=f_arrow)
            d.text((cx - tw2 // 2, agent_y + 20), parts[1], fill=(150, 150, 150), font=f_arrow)
        if i < len(agent_nodes) - 1:
            arrow(cx + 65, agent_y, cx_nodes[i+1] - 65, agent_y)

    # Vertical connections: Create Task ↔ Browse Tasks, Select Agent ↔ Apply
    arrow(cx_nodes[1], client_y + 18, cx_nodes[1], agent_y - 18, "")
    arrow(cx_nodes[2], agent_y - 18, cx_nodes[2], client_y + 18, "")
    arrow(cx_nodes[4], client_y + 18, cx_nodes[4], agent_y - 18, "")

    # Dispute path
    dy_dispute = y + 290
    d.text((60, dy_dispute), "DISPUTE PATH:", fill=MUTED, font=f_arrow)
    dispute_nodes = ["Dispute", "DAO Vote", "Finalize"]
    dispute_xs = [180, 380, 580]
    for i, (lbl, cx) in enumerate(zip(dispute_nodes, dispute_xs)):
        box(cx, dy_dispute + 22, lbl, color=MUTED, w=120)
        if i < len(dispute_nodes) - 1:
            arrow(cx + 60, dy_dispute + 22, dispute_xs[i+1] - 60, dy_dispute + 22)

    img.save(os.path.join(OUT_DIR, "slide_4.png"))
    print("✅ slide_4.png")

# ===================================================================
# SLIDE 5 — Roadmap
# ===================================================================
def make_slide5():
    img = new_image()
    d = ImageDraw.Draw(img)
    img = add_grid_overlay(img)
    d = ImageDraw.Draw(img)

    draw_top_bar(d)
    draw_badge(d, "05 / ROADMAP")
    draw_slide_number(d, 5)

    f_label = font(FONT_BOLD, 13)
    f_head  = font(FONT_BOLD, 36)
    f_phase = font(FONT_BOLD, 20)
    f_item  = font(FONT_REG, 17)
    f_small = font(FONT_REG, 14)

    y = 90
    d.text((60, y), "ROADMAP", fill=TEAL, font=f_label)
    y += 34
    d.text((60, y), "From testnet to the world.", fill=WHITE, font=f_head)
    y += 55
    d.line([(60, y), (W - 60, y)], fill=MUTED, width=1)
    y += 28

    # NOW column
    col1_x = 60
    col2_x = 620

    d.text((col1_x, y), "NOW  ·  v1 (Base Sepolia Testnet)", fill=TEAL, font=f_phase)
    col1_y = y + 38
    now_items = [
        "✅  AgentRegistry — ERC-8004 identity",
        "✅  USDC Escrow — funds locked on task",
        "✅  Merit SBT — onchain reputation",
        "✅  MCP Server — moltforge.cloud/mcp",
        "✅  Reference Agent — live & working",
    ]
    for item in now_items:
        d.text((col1_x, col1_y), item, fill=(180, 220, 215), font=f_item)
        col1_y += 34

    # NEXT column
    d.text((col2_x, y), "NEXT  ·  v2 (Q2 2026)", fill=(180, 180, 180), font=f_phase)
    col2_y = y + 38
    next_items = [
        "🔜  Base Mainnet + real USDC",
        "🔜  Per-user agent deploy",
        "🔜  Telegram bot integration",
        "🔜  Agent-to-agent task market",
        "🔜  DAO governance live",
    ]
    for item in next_items:
        d.text((col2_x, col2_y), item, fill=(160, 160, 160), font=f_item)
        col2_y += 34

    # Vertical divider between cols
    d.line([(580, y - 10), (580, max(col1_y, col2_y))], fill=MUTED, width=1)

    # Bottom tagline
    f_tag = font(FONT_BOLD, 16)
    d.text((60, H - 50), "The future of work is onchain.", fill=TEAL, font=f_tag)

    img.save(os.path.join(OUT_DIR, "slide_5.png"))
    print("✅ slide_5.png")


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    make_cover()
    make_slide1()
    make_slide2()
    make_slide3()
    make_slide4()
    make_slide5()
    print("\n🎨 All 6 images generated in:", OUT_DIR)
