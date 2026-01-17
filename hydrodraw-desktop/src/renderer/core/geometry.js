// ==================== GEOMETRY UTILITIES ====================

const EPSILON = 1e-10;

// Vector operations
function vec(x, y) {
  return { x, y };
}

function vecAdd(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function vecSub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function vecScale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

function vecLength(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vecNormalize(v) {
  const len = vecLength(v);
  if (len < EPSILON) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function vecDot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function vecCross(a, b) {
  return a.x * b.y - a.y * b.x;
}

function vecPerpendicular(v) {
  return { x: -v.y, y: v.x };
}

function vecAngle(v) {
  return Math.atan2(v.y, v.x);
}

function vecFromAngle(angle, length = 1) {
  return { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
}

function distance(p1, p2) {
  return vecLength(vecSub(p2, p1));
}

function midpoint(p1, p2) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

// Angle utilities
function radToDeg(rad) {
  return rad * (180 / Math.PI);
}

function degToRad(deg) {
  return deg * (Math.PI / 180);
}

function normalizeAngle(angle) {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

// Snap angle to increment
function snapAngle(angle, increment) {
  return Math.round(angle / increment) * increment;
}

// Apply ortho constraint
function applyOrtho(start, end) {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  if (dx > dy) {
    return { x: end.x, y: start.y };
  } else {
    return { x: start.x, y: end.y };
  }
}

// Apply polar constraint
function applyPolar(start, end, increment) {
  const angle = radToDeg(Math.atan2(end.y - start.y, end.x - start.x));
  const snappedAngle = snapAngle(angle, increment);
  const dist = distance(start, end);
  const rad = degToRad(snappedAngle);
  return {
    x: start.x + Math.cos(rad) * dist,
    y: start.y + Math.sin(rad) * dist
  };
}

// ==================== LINE GEOMETRY ====================

function pointToLineDistance(point, lineStart, lineEnd) {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq < EPSILON) return distance(point, lineStart);
  
  let param = dot / lenSq;
  param = Math.max(0, Math.min(1, param));
  
  const closest = {
    x: lineStart.x + param * C,
    y: lineStart.y + param * D
  };
  
  return distance(point, closest);
}

function closestPointOnLine(point, lineStart, lineEnd) {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq < EPSILON) return { ...lineStart };
  
  let param = dot / lenSq;
  param = Math.max(0, Math.min(1, param));
  
  return {
    x: lineStart.x + param * C,
    y: lineStart.y + param * D
  };
}

function closestPointOnLineUnbounded(point, lineStart, lineEnd) {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq < EPSILON) return { ...lineStart };
  
  const param = dot / lenSq;
  
  return {
    x: lineStart.x + param * C,
    y: lineStart.y + param * D
  };
}

// Line-line intersection
function lineLineIntersection(p1, p2, p3, p4) {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < EPSILON) return null; // Parallel
  
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;
  
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
      t, u
    };
  }
  return null;
}

// Line-line intersection (unbounded)
function lineLineIntersectionUnbounded(p1, p2, p3, p4) {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < EPSILON) return null;
  
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
    t
  };
}

// ==================== CIRCLE GEOMETRY ====================

function pointToCircleDistance(point, center, radius) {
  return Math.abs(distance(point, center) - radius);
}

function closestPointOnCircle(point, center, radius) {
  const dir = vecNormalize(vecSub(point, center));
  return vecAdd(center, vecScale(dir, radius));
}

// Line-circle intersection
function lineCircleIntersection(p1, p2, center, radius) {
  const d = vecSub(p2, p1);
  const f = vecSub(p1, center);
  
  const a = vecDot(d, d);
  const b = 2 * vecDot(f, d);
  const c = vecDot(f, f) - radius * radius;
  
  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  
  discriminant = Math.sqrt(discriminant);
  
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);
  
  const points = [];
  if (t1 >= 0 && t1 <= 1) {
    points.push(vecAdd(p1, vecScale(d, t1)));
  }
  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > EPSILON) {
    points.push(vecAdd(p1, vecScale(d, t2)));
  }
  
  return points;
}

// Circle-circle intersection
function circleCircleIntersection(c1, r1, c2, r2) {
  const d = distance(c1, c2);
  if (d > r1 + r2 || d < Math.abs(r1 - r2) || d < EPSILON) return [];
  
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(r1 * r1 - a * a);
  
  const p = vecAdd(c1, vecScale(vecNormalize(vecSub(c2, c1)), a));
  const perp = vecPerpendicular(vecNormalize(vecSub(c2, c1)));
  
  return [
    vecAdd(p, vecScale(perp, h)),
    vecSub(p, vecScale(perp, h))
  ];
}

// ==================== ARC GEOMETRY ====================

function pointOnArc(center, radius, startAngle, endAngle, point) {
  const angle = radToDeg(Math.atan2(point.y - center.y, point.x - center.x));
  const normAngle = normalizeAngle(angle);
  const normStart = normalizeAngle(startAngle);
  const normEnd = normalizeAngle(endAngle);
  
  if (normStart <= normEnd) {
    return normAngle >= normStart && normAngle <= normEnd;
  } else {
    return normAngle >= normStart || normAngle <= normEnd;
  }
}

function arcEndpoints(center, radius, startAngle, endAngle) {
  return {
    start: {
      x: center.x + Math.cos(degToRad(startAngle)) * radius,
      y: center.y + Math.sin(degToRad(startAngle)) * radius
    },
    end: {
      x: center.x + Math.cos(degToRad(endAngle)) * radius,
      y: center.y + Math.sin(degToRad(endAngle)) * radius
    }
  };
}

// ==================== PERPENDICULAR & TANGENT ====================

function perpendicularPointOnLine(point, lineStart, lineEnd) {
  return closestPointOnLineUnbounded(point, lineStart, lineEnd);
}

function tangentPointsOnCircle(point, center, radius) {
  const d = distance(point, center);
  if (d < radius) return []; // Point inside circle
  if (Math.abs(d - radius) < EPSILON) return [point]; // Point on circle
  
  const a = Math.acos(radius / d);
  const baseAngle = Math.atan2(center.y - point.y, center.x - point.x);
  
  return [
    {
      x: center.x + radius * Math.cos(baseAngle + Math.PI + a),
      y: center.y + radius * Math.sin(baseAngle + Math.PI + a)
    },
    {
      x: center.x + radius * Math.cos(baseAngle + Math.PI - a),
      y: center.y + radius * Math.sin(baseAngle + Math.PI - a)
    }
  ];
}

// ==================== BOUNDING BOX ====================

function getBoundingBox(elements) {
  if (elements.length === 0) return null;
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  elements.forEach(el => {
    const bounds = getElementBounds(el);
    if (bounds) {
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    }
  });
  
  if (minX === Infinity) return null;
  
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

function getElementBounds(el) {
  switch (el.type) {
    case 'line':
      return {
        minX: Math.min(el.x1, el.x2),
        minY: Math.min(el.y1, el.y2),
        maxX: Math.max(el.x1, el.x2),
        maxY: Math.max(el.y1, el.y2)
      };
    case 'polyline':
      if (!el.points || el.points.length === 0) return null;
      return {
        minX: Math.min(...el.points.map(p => p.x)),
        minY: Math.min(...el.points.map(p => p.y)),
        maxX: Math.max(...el.points.map(p => p.x)),
        maxY: Math.max(...el.points.map(p => p.y))
      };
    case 'rectangle':
      return {
        minX: el.x,
        minY: el.y,
        maxX: el.x + el.width,
        maxY: el.y + el.height
      };
    case 'circle':
      return {
        minX: el.cx - el.radius,
        minY: el.cy - el.radius,
        maxX: el.cx + el.radius,
        maxY: el.cy + el.radius
      };
    case 'arc':
      // Simplified arc bounds
      return {
        minX: el.cx - el.radius,
        minY: el.cy - el.radius,
        maxX: el.cx + el.radius,
        maxY: el.cy + el.radius
      };
    case 'text':
      const width = (el.text || '').length * (el.height || 12) * 0.6;
      return {
        minX: el.x,
        minY: el.y - (el.height || 12),
        maxX: el.x + width,
        maxY: el.y
      };
    default:
      return null;
  }
}

// Point in rectangle
function pointInRect(point, rect) {
  return point.x >= rect.minX && point.x <= rect.maxX &&
         point.y >= rect.minY && point.y <= rect.maxY;
}

// Rectangle intersection
function rectsIntersect(r1, r2) {
  return !(r1.maxX < r2.minX || r1.minX > r2.maxX ||
           r1.maxY < r2.minY || r1.minY > r2.maxY);
}

// Rectangle contains rectangle
function rectContains(outer, inner) {
  return inner.minX >= outer.minX && inner.maxX <= outer.maxX &&
         inner.minY >= outer.minY && inner.maxY <= outer.maxY;
}

// Export for use
window.Geometry = {
  EPSILON,
  vec, vecAdd, vecSub, vecScale, vecLength, vecNormalize,
  vecDot, vecCross, vecPerpendicular, vecAngle, vecFromAngle,
  distance, midpoint,
  radToDeg, degToRad, normalizeAngle, snapAngle,
  applyOrtho, applyPolar,
  pointToLineDistance, closestPointOnLine, closestPointOnLineUnbounded,
  lineLineIntersection, lineLineIntersectionUnbounded,
  pointToCircleDistance, closestPointOnCircle,
  lineCircleIntersection, circleCircleIntersection,
  pointOnArc, arcEndpoints,
  perpendicularPointOnLine, tangentPointsOnCircle,
  getBoundingBox, getElementBounds, pointInRect, rectsIntersect, rectContains
};
