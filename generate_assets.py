import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

font_bold = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
font_impact = "/System/Library/Fonts/Supplemental/Impact.ttf"

def draw_star(draw, cx, cy, r_out, r_in, fill_color, outline_color=None):
    points = []
    for i in range(10):
        r = r_out if i % 2 == 0 else r_in
        angle = i * math.pi / 5 - math.pi / 2
        px = cx + r * math.cos(angle)
        py = cy + r * math.sin(angle)
        points.append((px, py))
    draw.polygon(points, fill=fill_color, outline=outline_color)

def draw_glossy_block(draw, x, y, size, color_top, color_bot, border_color, r=16):
    for i in range(size):
        t = i / float(size)
        r_c = int(color_top[0] * (1 - t) + color_bot[0] * t)
        g_c = int(color_top[1] * (1 - t) + color_bot[1] * t)
        b_c = int(color_top[2] * (1 - t) + color_bot[2] * t)
        draw.rounded_rectangle([x, y, x + size, y + size], radius=r, fill=(r_c, g_c, b_c))
    
    draw.rounded_rectangle([x, y, x + size, y + size], radius=r, outline=border_color, width=4)
    
    hl_pad = int(size * 0.12)
    hl_h = int(size * 0.35)
    draw.rounded_rectangle([x + hl_pad, y + hl_pad, x + size - hl_pad, y + hl_h], radius=int(r * 0.7), fill=(255, 255, 255, 110))
    draw.ellipse([x + size - hl_pad - 12, y + hl_pad + 6, x + size - hl_pad - 2, y + hl_pad + 16], fill=(255, 255, 255, 200))

# ----------------- 1. ICON 512x512 -----------------
def create_icon():
    img = Image.new("RGBA", (512, 512), (15, 23, 42, 255))
    draw = ImageDraw.Draw(img, "RGBA")
    
    # Background gradient
    for y in range(512):
        t = y / 512.0
        r_c = int(24 * (1 - t) + 9 * t)
        g_c = int(20 * (1 - t) + 13 * t)
        b_c = int(65 * (1 - t) + 22 * t)
        draw.line([(0, y), (512, y)], fill=(r_c, g_c, b_c, 255))
    
    # Outer subtle rounded frame
    draw.rounded_rectangle([16, 16, 496, 496], radius=90, outline=(99, 102, 241, 140), width=4)
    
    # Central 2x2 puzzle gem blocks
    bsize = 140
    gap = 14
    cx, cy = 256, 230
    start_x = cx - bsize - gap // 2
    start_y = cy - bsize - gap // 2
    
    blocks = [
        (0, 0, (98, 239, 255), (0, 180, 216), (200, 250, 255)), # Cyan
        (0, 1, (255, 234, 96), (230, 150, 0), (255, 250, 200)), # Gold
        (1, 0, (255, 80, 130), (210, 0, 70), (255, 210, 230)),  # Ruby/Pink
        (1, 1, (100, 255, 166), (0, 180, 75), (210, 255, 230)), # Emerald
    ]
    
    # Shadow layer
    shadow_img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_img)
    for r, c, _, _, _ in blocks:
        bx = start_x + c * (bsize + gap)
        by = start_y + r * (bsize + gap) + 10
        sdraw.rounded_rectangle([bx, by, bx + bsize, by + bsize], radius=24, fill=(0, 0, 0, 150))
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(14))
    img.alpha_composite(shadow_img)
    
    draw = ImageDraw.Draw(img, "RGBA")
    for r, c, c_top, c_bot, b_col in blocks:
        bx = start_x + c * (bsize + gap)
        by = start_y + r * (bsize + gap)
        draw_glossy_block(draw, bx, by, bsize, c_top, c_bot, b_col, r=24)
    
    # Golden Star in the top-right block
    star_x = start_x + 1 * (bsize + gap) + bsize // 2
    star_y = start_y + bsize // 2
    draw_star(draw, star_x, star_y, 36, 17, (255, 255, 255, 240), (255, 214, 0, 255))
    
    # Bottom Badge: "STAR"
    f_badge = ImageFont.truetype(font_impact, 36)
    badge_w = 180
    badge_h = 48
    badge_x = (512 - badge_w) // 2
    badge_y = 415
    draw.rounded_rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], radius=16, fill=(255, 214, 0, 255), outline=(255, 255, 255), width=3)
    draw.text((badge_x + 46, badge_y + 4), "STAR", fill=(10, 10, 20), font=f_badge)
    
    img.save("store-assets/icon-512x512.png")
    print("Created store-assets/icon-512x512.png")

# ----------------- 2. FEATURE GRAPHIC 1024x500 -----------------
def create_feature_graphic():
    img = Image.new("RGBA", (1024, 500), (9, 13, 22, 255))
    draw = ImageDraw.Draw(img, "RGBA")
    
    # Background gradient
    for y in range(500):
        t = y / 500.0
        r_c = int(25 * (1 - t) + 5 * t)
        g_c = int(20 * (1 - t) + 8 * t)
        b_c = int(70 * (1 - t) + 18 * t)
        draw.line([(0, y), (1024, y)], fill=(r_c, g_c, b_c, 255))
    
    # Subtle perspective grid
    for x in range(0, 1024, 40):
        draw.line([(x, 300), (int(x * 1.3 - 150), 500)], fill=(99, 102, 241, 30), width=1)
    for y in range(300, 500, 30):
        draw.line([(0, y), (1024, y)], fill=(99, 102, 241, 30), width=1)
    
    # Typography
    f_title = ImageFont.truetype(font_impact, 70)
    f_tagline = ImageFont.truetype(font_bold, 18)
    f_pill = ImageFont.truetype(font_bold, 14)
    
    # Title & Badge
    draw.text((62, 102), "BLOCK BLAST", fill=(168, 85, 247, 120), font=f_title)
    draw.text((60, 100), "BLOCK BLAST", fill=(255, 255, 255), font=f_title)
    
    draw.rounded_rectangle([485, 114, 605, 168], radius=14, fill=(255, 214, 0), outline=(255, 255, 255), width=2)
    f_star_txt = ImageFont.truetype(font_impact, 40)
    draw.text((505, 119), "STAR", fill=(10, 10, 20), font=f_star_txt)
    
    # Tagline
    draw.text((62, 195), "THE ULTIMATE BRAIN BLOCK PUZZLE", fill=(56, 189, 248), font=f_tagline)
    
    # 3 Feature Pills
    pills = [
        ("DAILY CHALLENGES", (168, 85, 247)),
        ("POWER BOOSTERS", (245, 158, 11)),
        ("3 STUNNING THEMES", (16, 185, 129)),
    ]
    px = 62
    py = 245
    for text, col in pills:
        draw.rounded_rectangle([px, py, px + 175, py + 36], radius=10, fill=(col[0], col[1], col[2], 50), outline=col, width=2)
        draw.text((px + 14, py + 10), text, fill=(248, 250, 252), font=f_pill)
        px += 185
        
    # Highlights
    draw.text((62, 315), "100% Offline Playable  |  Pure Skill Fair RNG  |  Satisfying Combos", fill=(148, 163, 184), font=f_tagline)
    
    # Right Side: 3D Blocks Cluster
    bsize = 82
    gap = 8
    rx = 690
    ry = 135
    
    blocks_art = [
        (0, 0, (98, 239, 255), (0, 180, 216), (200, 250, 255)),
        (0, 1, (255, 234, 96), (230, 150, 0), (255, 250, 200)),
        (0, 2, (100, 255, 166), (0, 180, 75), (210, 255, 230)),
        (1, 1, (255, 80, 130), (210, 0, 70), (255, 210, 230)),
        (1, 2, (180, 100, 255), (120, 20, 220), (230, 200, 255)),
        (2, 2, (255, 145, 0), (220, 80, 0), (255, 210, 170)),
    ]
    
    for r, c, c_top, c_bot, b_col in blocks_art:
        bx = rx + c * (bsize + gap)
        by = ry + r * (bsize + gap)
        draw_glossy_block(draw, bx, by, bsize, c_top, c_bot, b_col, r=16)
    
    # Stars
    draw_star(draw, 640, 140, 24, 11, (255, 214, 0, 255), (255, 255, 255, 200))
    draw_star(draw, 965, 115, 18, 8, (255, 214, 0, 255), (255, 255, 255, 200))
    draw_star(draw, 660, 340, 20, 9, (0, 229, 255, 255), (255, 255, 255, 200))
    draw_star(draw, 950, 390, 22, 10, (255, 80, 130, 255), (255, 255, 255, 200))

    img = img.convert("RGB")
    img.save("store-assets/feature-graphic-1024x500.png")
    print("Created store-assets/feature-graphic-1024x500.png")

create_icon()
create_feature_graphic()
