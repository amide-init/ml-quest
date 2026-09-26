"""Generate the home-hero loss landscape: contour paths + a real gradient-descent path.

f(x, y) is an anisotropic, rotated valley with a gentle secondary bump, on a 600x420 canvas.
Output: TypeScript constants for src/components/viz/ValleyLandscapeData.ts

Usage (from client/): python3 scripts/generate_valley_landscape.py > /tmp/out.ts
then replace everything below the header comment in ValleyLandscapeData.ts.
"""
import math

W, H = 600, 420
MIN = (408.0, 282.0)  # global minimum (lower right of centre)


def f(x, y):
    # rotate into the valley's frame
    dx, dy = x - MIN[0], y - MIN[1]
    a = math.radians(-28)
    u = dx * math.cos(a) - dy * math.sin(a)
    v = dx * math.sin(a) + dy * math.cos(a)
    base = (u / 150.0) ** 2 + (v / 62.0) ** 2        # long narrow valley
    ridge = 0.9 * math.exp(-(((x - 170) / 70) ** 2 + ((y - 300) / 55) ** 2))  # a hill to the lower left
    wobble = 0.08 * math.sin(x / 55.0) * math.cos(y / 47.0)
    return base + ridge + wobble


def grad(x, y, h=0.5):
    return ((f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h))


# ---- marching squares ---------------------------------------------------------
STEP = 6
nx, ny = W // STEP + 1, H // STEP + 1
grid = [[f(i * STEP, j * STEP) for i in range(nx)] for j in range(ny)]


def interp(p1, p2, v1, v2, lvl):
    t = (lvl - v1) / (v2 - v1) if v2 != v1 else 0.5
    return (p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]))


def segments(lvl):
    segs = []
    for j in range(ny - 1):
        for i in range(nx - 1):
            x0, y0 = i * STEP, j * STEP
            c = [(x0, y0), (x0 + STEP, y0), (x0 + STEP, y0 + STEP), (x0, y0 + STEP)]
            v = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]]
            edges = []
            for k in range(4):
                a, b = k, (k + 1) % 4
                if (v[a] < lvl) != (v[b] < lvl):
                    edges.append(interp(c[a], c[b], v[a], v[b], lvl))
            if len(edges) == 2:
                segs.append((edges[0], edges[1]))
            elif len(edges) == 4:
                segs.append((edges[0], edges[1]))
                segs.append((edges[2], edges[3]))
    return segs


def join(segs):
    key = lambda p: (round(p[0], 3), round(p[1], 3))
    adj = {}
    for a, b in segs:
        adj.setdefault(key(a), []).append(b)
        adj.setdefault(key(b), []).append(a)
    used = set()
    lines = []
    for a, b in segs:
        s = (key(a), key(b))
        if s in used or (s[1], s[0]) in used:
            continue
        line = [a, b]
        used.add(s)
        for direction in (1, -1):
            while True:
                end = line[-1] if direction == 1 else line[0]
                nxt = None
                for cand in adj.get(key(end), []):
                    e = (key(end), key(cand))
                    if e not in used and (e[1], e[0]) not in used:
                        nxt = cand
                        used.add(e)
                        break
                if nxt is None:
                    break
                if direction == 1:
                    line.append(nxt)
                else:
                    line.insert(0, nxt)
        if len(line) > 6:
            lines.append(line)
    return lines


def simplify(line, every=2):
    return line[::every] + ([line[-1]] if (len(line) - 1) % every else [])


def to_path(line):
    pts = simplify(line)
    d = f"M{pts[0][0]:.0f} {pts[0][1]:.0f}"
    for p in pts[1:]:
        d += f"L{p[0]:.0f} {p[1]:.0f}"
    closed = math.dist(line[0], line[-1]) < STEP * 1.5
    return d + ("Z" if closed else "")


levels = [0.06, 0.18, 0.36, 0.6, 0.9, 1.25, 1.65, 2.1, 2.6, 3.2, 3.9, 4.7, 5.6, 6.6, 7.7, 8.9, 10.2]
contours = []
for idx, lvl in enumerate(levels):
    for line in join(segments(lvl)):
        contours.append((idx, to_path(line)))

# ---- gradient descent ----------------------------------------------------------
x, y = 96.0, 88.0
lr = 2600.0
path = [(x, y, f(x, y))]
for _ in range(30):
    gx, gy = grad(x, y)
    x, y = x - lr * gx, y - lr * gy
    path.append((x, y, f(x, y)))
    if abs(path[-2][2] - path[-1][2]) < 0.01:
        break

# ---- emit TS -------------------------------------------------------------------
print("// contours:", len(contours), "steps:", len(path) - 1)
print(f"export const LEVEL_COUNT = {len(levels)}")
print("export const CONTOURS: readonly { level: number; d: string }[] = [")
for idx, d in contours:
    print(f"  {{ level: {idx}, d: '{d}' }},")
print("]")
print("export const DESCENT: readonly { x: number; y: number; loss: number }[] = [")
for px, py, l in path:
    print(f"  {{ x: {px:.1f}, y: {py:.1f}, loss: {l:.2f} }},")
print("]")
print(f"export const MINIMUM = {{ x: {path[-1][0]:.0f}, y: {path[-1][1]:.0f} }}")
