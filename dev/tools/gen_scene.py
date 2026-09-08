import math, random
random.seed(20)

def jit(pts, amp):
    return [(x + random.uniform(-amp, amp), y + random.uniform(-amp, amp)) for x, y in pts]

def smooth(pts, closed=False, tension=0.5):
    """Catmull-Rom → cubic bezier path string."""
    p = list(pts)
    if closed: p = [p[-1]] + p + [p[0], p[1]]
    else: p = [p[0]] + p + [p[-1]]
    d = f"M{p[1][0]:.1f} {p[1][1]:.1f}"
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i-1], p[i], p[i+1], p[i+2]
        c1 = (p1[0] + (p2[0]-p0[0]) * tension / 3, p1[1] + (p2[1]-p0[1]) * tension / 3)
        c2 = (p2[0] - (p3[0]-p1[0]) * tension / 3, p2[1] - (p3[1]-p1[1]) * tension / 3)
        d += f" C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d + (" Z" if closed else "")

def line(pts, amp=1.5, closed=False, n=None):
    """Resample a polyline into many points, jitter, smooth."""
    pts = list(pts)
    if closed: pts = pts + [pts[0]]
    # resample every ~18 units
    out = [pts[0]]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        L = math.hypot(x1-x0, y1-y0); k = max(1, int(L / 18))
        for j in range(1, k+1):
            out.append((x0 + (x1-x0)*j/k, y0 + (y1-y0)*j/k))
    if closed: out = out[:-1]
    return smooth(jit(out, amp), closed)

def scallop(cx, cy, rx, ry, n, bulge=0.28, amp=1.5, start=0.0, top_heavy=False):
    """Puffy closed outline (canopy / cloud / bush)."""
    d = ""
    pts = []
    for i in range(n):
        a = start + 2*math.pi*i/n
        pts.append((cx + rx*math.cos(a), cy + ry*math.sin(a)))
    pts = jit(pts, amp)
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(n):
        x0, y0 = pts[i]; x1, y1 = pts[(i+1) % n]
        mx, my = (x0+x1)/2, (y0+y1)/2
        ang = math.atan2(my-cy, mx-cx)
        b = bulge * (1.0 if not top_heavy or my < cy else 0.35)
        qx, qy = mx + math.cos(ang)*rx*b, my + math.sin(ang)*ry*b
        d += f" Q{qx:.1f} {qy:.1f} {x1:.1f} {y1:.1f}"
    return d + " Z"

def hatch(x, y, count, dx, dy, length, step):
    """Parallel short strokes for shading."""
    d = ""
    for i in range(count):
        sx, sy = x + step[0]*i, y + step[1]*i
        d += f"M{sx:.0f} {sy:.0f} l{dx*length:.0f} {dy*length:.0f} "
    return d.strip()

def tuft(x, y):
    return f"M{x} {y} l-5 -13 M{x} {y} l1 -16 M{x} {y} l6 -12"



far, mid, near, occ_far, occ_mid = [], [], [], [], []
def P(layer, d, cls, t, dur):
    layer.append(f'      <path pathLength="1" class="{cls}" style="--t:{t}s;--d:{dur}s" d="{d}"/>')

def closed_below(pts, amp=1.6, bottom=560):
    stroke = line(pts, amp=amp)
    return stroke, stroke + f" L{pts[-1][0]} {bottom} L{pts[0][0]} {bottom} Z"

def bush(cx, cy, w):
    r1, r2 = w*0.22, w*0.3
    return f"M{cx-w/2:.0f} {cy} a{r1:.0f} {r1:.0f} 0 0 1 {w*0.34:.0f} {-w*0.18:.0f} a{r2:.0f} {r2:.0f} 0 0 1 {w*0.32:.0f} 0 a{r1:.0f} {r1:.0f} 0 0 1 {w*0.34:.0f} {w*0.18:.0f} Z"

def tuft(x, y):
    return f"M{x-5} {y} q-3 -5 -5 -10 M{x} {y+1} q0 -6 1 -12 M{x+6} {y} q3 -4 6 -9"

# ---------- far: mountains, sun, clouds, birds ----------
P(far, line([(-500,262),(-430,215),(-370,150),(-330,118),(-290,140),(-255,175),(-215,120),(-170,72),(-130,82),(-90,140),(-50,215),(-15,282),(10,320)], amp=2.2), 'far', 0.2, 1.4)
P(far, hatch(-160, 84, 4, -0.45, 0.9, 14, (8, 6)), 'far', 1.4, .4)
P(far, hatch(-120, 110, 5, 0.5, 0.86, 24, (10, 16)), 'far', 1.6, .5)
P(far, line([(380,322),(410,272),(450,208),(490,160),(530,150),(560,178),(600,120),(650,60),(700,52),(740,80),(790,150),(840,215),(900,262)], amp=2.2), 'far', 0.6, 1.4)
P(far, hatch(680, 66, 4, 0.45, 0.9, 14, (9, 5)), 'far', 1.8, .4)
P(far, hatch(720, 100, 5, 0.5, 0.86, 26, (12, 18)), 'far', 2.0, .5)
P(far, "M700 -86 l0 -12 M740 -70 l8 -8 M756 -30 l12 0 M740 10 l8 8 M660 -70 l-8 -8 M644 -30 l-12 0 M660 10 l-8 8 M700 26 l0 12", 'far', 2.7, .5)
P(far, "M-130 10 q9 -11 18 0 q9 -11 18 0 M-92 34 q7 -9 14 0 q7 -9 14 0 M300 -70 q7 -9 14 0 q7 -9 14 0", 'far', 8.8, .6)
sun = scallop(700, -30, 38, 38, 24, bulge=0.02, amp=1.2); occ_far.append(sun); P(mid, sun, 'far', 2.2, .6)
c1 = scallop(-280, -40, 78, 26, 12, bulge=0.32, amp=1.4, top_heavy=True); occ_far.append(c1); P(mid, c1, 'far', 2.5, .8)
c2 = scallop(500, 30, 60, 20, 10, bulge=0.32, amp=1.4, top_heavy=True); occ_far.append(c2); P(mid, c2, 'far', 3.0, .7)

# ---------- mid: hills (occlude mountains) ----------
s1, f1 = closed_below([(-500,345),(-420,318),(-330,306),(-240,318),(-150,336),(-60,344),(15,352),(60,360)]); occ_far.append(f1); P(mid, s1, 'mid', 1.6, .8)
s2, f2 = closed_below([(340,362),(380,354),(450,338),(530,324),(620,330),(710,338),(810,322),(900,332)]); occ_far.append(f2); P(mid, s2, 'mid', 1.9, .8)
P(mid, hatch(-400, 326, 6, 0.6, 0.8, 12, (16, -2)), 'far', 2.4, .4)
P(mid, hatch(770, 334, 6, -0.6, 0.8, 12, (16, -2)), 'far', 2.6, .4)

# ---------- mid: trees (canopies occlude everything behind) ----------
P(mid, line([(-322,428),(-318,380),(-312,330),(-306,300)], amp=1.2) + " " + line([(-292,428),(-294,380),(-296,340),(-296,300)], amp=1.2), 'mid', 3.2, .6)
P(mid, line([(-306,300),(-330,270),(-350,250)], amp=1.2) + " " + line([(-296,300),(-280,268),(-262,244)], amp=1.2) + " " + line([(-301,300),(-300,262),(-304,236)], amp=1.2), 'mid', 3.7, .5)
P(mid, hatch(-318, 346, 5, 0.25, 1, 18, (3, 14)), 'far', 5.2, .4)
can = scallop(-300, 212, 118, 82, 16, bulge=0.26, amp=2.0); occ_far.append(can); occ_mid.append(can)
P(near, can, 'mid', 4.0, 1.2)
P(near, "M-350 200 q10 -8 18 4 M-320 176 q8 -10 16 -2 M-270 190 q10 -6 16 6 M-330 236 q12 -8 20 2 M-250 226 q8 -8 16 0 M-380 222 q8 -8 14 0 M-300 250 q8 -8 16 0", 'far', 5.0, .6)
P(mid, line([(646,426),(648,372),(652,340)], amp=1.0) + " " + line([(664,426),(662,372),(660,340)], amp=1.0), 'mid', 4.4, .4)
can2 = scallop(655, 302, 58, 46, 12, bulge=0.28, amp=1.6); occ_far.append(can2); occ_mid.append(can2)
P(near, can2, 'mid', 4.7, .8)
P(near, "M630 296 q8 -8 14 2 M660 280 q8 -8 14 0 M672 312 q8 -6 14 2", 'far', 5.4, .4)

# ---------- mid: fence ----------
posts = ""
for i, (x, h) in enumerate([(418,46),(466,42),(510,38),(550,34),(586,30),(618,27)]):
    posts += line([(x, 430 - i*1.2), (x + 1, 430 - i*1.2 - h)], amp=0.8) + " "
P(mid, posts.strip(), 'mid', 5.2, .8)
P(mid, line([(408,398),(470,396),(530,396),(590,404),(628,410)], amp=1.2) + " " + line([(408,416),(470,414),(530,414),(590,420),(628,424)], amp=1.2), 'mid', 5.8, .6)

# ---------- near: ground (occludes hill/mountain bottoms), path, bushes, grass, signpost ----------
sg, fg = closed_below([(-500,432),(-400,406),(-300,428),(-200,420),(-100,404),(-20,432),(60,430),(200,428),(340,430),(420,432),(520,410),(640,428),(760,404),(900,428)], amp=1.8)
occ_far.append(fg); occ_mid.append(fg)
P(near, sg, 'near', 1.0, 1.4)
P(near, line([(118,430),(80,440),(20,452),(-60,462),(-130,472)], amp=1.6) + " " + line([(186,432),(150,446),(90,462),(20,476),(-60,486),(-130,494)], amp=1.6), 'near', 6.2, .9)
for cx, cy, w, t in [(-104,424,72,6.6),(394,426,56,6.9),(-440,428,48,7.0)]:
    b = bush(cx, cy, w); occ_mid.append(b); P(near, b, 'mid', t, .5)
grass = " ".join(tuft(x, y) for x, y in [(-470,420),(-360,422),(-250,424),(-160,414),(-30,436),(250,432),(330,436),(470,428),(600,428),(690,420),(800,414),(860,428),(-320,458),(230,452),(-200,480),(100,470)])
P(near, grass, 'near', 7.4, 1.0)
P(near, line([(-170,470),(-172,392)], amp=0.8) + " M-176 404 l40 0 l8 -8 l-8 -8 l-40 0 Z", 'mid', 9.2, .6)

rect = '<rect x="-500" y="-120" width="1400" height="640" fill="#fff"/>'
defs = '      <mask id="occ-far" maskUnits="userSpaceOnUse" x="-500" y="-120" width="1400" height="640">' + rect + "".join(f'<path d="{d}" fill="#000"/>' for d in occ_far) + '</mask>\n'
defs += '      <mask id="occ-mid" maskUnits="userSpaceOnUse" x="-500" y="-120" width="1400" height="640">' + rect + "".join(f'<path d="{d}" fill="#000"/>' for d in occ_mid) + '</mask>'
print("<!--DEFS-->"); print(defs); print("<!--BODY-->")
print('    <g mask="url(#occ-far)">'); print("\n".join(far)); print('    </g>')
print('    <g mask="url(#occ-mid)">'); print("\n".join(mid)); print('    </g>')
print('    <g>'); print("\n".join(near)); print('    </g>')
