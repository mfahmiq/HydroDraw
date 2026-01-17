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
// ==================== SNAP SYSTEM ====================

const SnapTypes = {
  GRID: 'grid',
  ENDPOINT: 'endpoint',
  MIDPOINT: 'midpoint',
  CENTER: 'center',
  INTERSECTION: 'intersection',
  PERPENDICULAR: 'perpendicular',
  TANGENT: 'tangent'
};

class SnapSystem {
  constructor() {
    this.enabled = {
      [SnapTypes.GRID]: true,
      [SnapTypes.ENDPOINT]: true,
      [SnapTypes.MIDPOINT]: true,
      [SnapTypes.CENTER]: true,
      [SnapTypes.INTERSECTION]: true,
      [SnapTypes.PERPENDICULAR]: false,
      [SnapTypes.TANGENT]: false
    };
    this.gridSize = 10;
    this.snapTolerance = 10; // pixels
  }

  setEnabled(type, enabled) {
    this.enabled[type] = enabled;
  }

  setGridSize(size) {
    this.gridSize = size;
  }

  setSnapTolerance(tolerance) {
    this.snapTolerance = tolerance;
  }

  // Get snap tolerance adjusted for zoom
  getAdjustedTolerance(zoom) {
    return this.snapTolerance / zoom;
  }

  // Find snap point
  findSnapPoint(point, elements, zoom, referencePoint = null) {
    const tolerance = this.getAdjustedTolerance(zoom);
    let bestSnap = null;
    let bestDist = tolerance;

    // Object snaps first (higher priority)
    if (this.enabled[SnapTypes.ENDPOINT]) {
      const snap = this.findEndpointSnap(point, elements, tolerance);
      if (snap && snap.distance < bestDist) {
        bestSnap = snap;
        bestDist = snap.distance;
      }
    }

    if (this.enabled[SnapTypes.MIDPOINT]) {
      const snap = this.findMidpointSnap(point, elements, tolerance);
      if (snap && snap.distance < bestDist) {
        bestSnap = snap;
        bestDist = snap.distance;
      }
    }

    if (this.enabled[SnapTypes.CENTER]) {
      const snap = this.findCenterSnap(point, elements, tolerance);
      if (snap && snap.distance < bestDist) {
        bestSnap = snap;
        bestDist = snap.distance;
      }
    }

    if (this.enabled[SnapTypes.INTERSECTION]) {
      const snap = this.findIntersectionSnap(point, elements, tolerance);
      if (snap && snap.distance < bestDist) {
        bestSnap = snap;
        bestDist = snap.distance;
      }
    }

    if (this.enabled[SnapTypes.PERPENDICULAR] && referencePoint) {
      const snap = this.findPerpendicularSnap(point, referencePoint, elements, tolerance);
      if (snap && snap.distance < bestDist) {
        bestSnap = snap;
        bestDist = snap.distance;
      }
    }

    if (this.enabled[SnapTypes.TANGENT] && referencePoint) {
      const snap = this.findTangentSnap(point, referencePoint, elements, tolerance);
      if (snap && snap.distance < bestDist) {
        bestSnap = snap;
        bestDist = snap.distance;
      }
    }

    // Grid snap (lowest priority)
    if (this.enabled[SnapTypes.GRID] && !bestSnap) {
      const gridSnap = this.snapToGrid(point);
      const gridDist = Geometry.distance(point, gridSnap);
      if (gridDist < tolerance) {
        bestSnap = {
          point: gridSnap,
          type: SnapTypes.GRID,
          distance: gridDist
        };
      }
    }

    return bestSnap;
  }

  // Snap to grid
  snapToGrid(point) {
    return {
      x: Math.round(point.x / this.gridSize) * this.gridSize,
      y: Math.round(point.y / this.gridSize) * this.gridSize
    };
  }

  // Find endpoint snap
  findEndpointSnap(point, elements, tolerance) {
    let best = null;
    let bestDist = tolerance;

    elements.forEach(el => {
      const endpoints = this.getEndpoints(el);
      endpoints.forEach(ep => {
        const dist = Geometry.distance(point, ep);
        if (dist < bestDist) {
          bestDist = dist;
          best = {
            point: ep,
            type: SnapTypes.ENDPOINT,
            distance: dist,
            element: el
          };
        }
      });
    });

    return best;
  }

  // Find midpoint snap
  findMidpointSnap(point, elements, tolerance) {
    let best = null;
    let bestDist = tolerance;

    elements.forEach(el => {
      const midpoints = this.getMidpoints(el);
      midpoints.forEach(mp => {
        const dist = Geometry.distance(point, mp);
        if (dist < bestDist) {
          bestDist = dist;
          best = {
            point: mp,
            type: SnapTypes.MIDPOINT,
            distance: dist,
            element: el
          };
        }
      });
    });

    return best;
  }

  // Find center snap
  findCenterSnap(point, elements, tolerance) {
    let best = null;
    let bestDist = tolerance;

    elements.forEach(el => {
      const center = this.getCenter(el);
      if (center) {
        const dist = Geometry.distance(point, center);
        if (dist < bestDist) {
          bestDist = dist;
          best = {
            point: center,
            type: SnapTypes.CENTER,
            distance: dist,
            element: el
          };
        }
      }
    });

    return best;
  }

  // Find intersection snap
  findIntersectionSnap(point, elements, tolerance) {
    let best = null;
    let bestDist = tolerance;

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const intersections = this.getIntersections(elements[i], elements[j]);
        intersections.forEach(ip => {
          const dist = Geometry.distance(point, ip);
          if (dist < bestDist) {
            bestDist = dist;
            best = {
              point: ip,
              type: SnapTypes.INTERSECTION,
              distance: dist,
              elements: [elements[i], elements[j]]
            };
          }
        });
      }
    }

    return best;
  }

  // Find perpendicular snap
  findPerpendicularSnap(point, referencePoint, elements, tolerance) {
    let best = null;
    let bestDist = tolerance;

    elements.forEach(el => {
      if (el.type === 'line') {
        const perpPoint = Geometry.perpendicularPointOnLine(
          referencePoint,
          { x: el.x1, y: el.y1 },
          { x: el.x2, y: el.y2 }
        );
        
        // Check if perpendicular point is on the line segment
        const onLine = this.isPointOnLineSegment(perpPoint, el);
        if (onLine) {
          const dist = Geometry.distance(point, perpPoint);
          if (dist < bestDist) {
            bestDist = dist;
            best = {
              point: perpPoint,
              type: SnapTypes.PERPENDICULAR,
              distance: dist,
              element: el
            };
          }
        }
      }
    });

    return best;
  }

  // Find tangent snap
  findTangentSnap(point, referencePoint, elements, tolerance) {
    let best = null;
    let bestDist = tolerance;

    elements.forEach(el => {
      if (el.type === 'circle' || el.type === 'arc') {
        const tangentPoints = Geometry.tangentPointsOnCircle(
          referencePoint,
          { x: el.cx, y: el.cy },
          el.radius
        );
        
        tangentPoints.forEach(tp => {
          const dist = Geometry.distance(point, tp);
          if (dist < bestDist) {
            bestDist = dist;
            best = {
              point: tp,
              type: SnapTypes.TANGENT,
              distance: dist,
              element: el
            };
          }
        });
      }
    });

    return best;
  }

  // Get endpoints of element
  getEndpoints(el) {
    switch (el.type) {
      case 'line':
        return [{ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }];
      case 'polyline':
        return el.points ? [...el.points] : [];
      case 'rectangle':
        return [
          { x: el.x, y: el.y },
          { x: el.x + el.width, y: el.y },
          { x: el.x + el.width, y: el.y + el.height },
          { x: el.x, y: el.y + el.height }
        ];
      case 'arc':
        const endpoints = Geometry.arcEndpoints(
          { x: el.cx, y: el.cy },
          el.radius,
          el.startAngle,
          el.endAngle
        );
        return [endpoints.start, endpoints.end];
      default:
        return [];
    }
  }

  // Get midpoints of element
  getMidpoints(el) {
    switch (el.type) {
      case 'line':
        return [Geometry.midpoint({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 })];
      case 'polyline':
        if (!el.points || el.points.length < 2) return [];
        const mids = [];
        for (let i = 0; i < el.points.length - 1; i++) {
          mids.push(Geometry.midpoint(el.points[i], el.points[i + 1]));
        }
        return mids;
      case 'rectangle':
        return [
          { x: el.x + el.width / 2, y: el.y },
          { x: el.x + el.width, y: el.y + el.height / 2 },
          { x: el.x + el.width / 2, y: el.y + el.height },
          { x: el.x, y: el.y + el.height / 2 }
        ];
      default:
        return [];
    }
  }

  // Get center of element
  getCenter(el) {
    switch (el.type) {
      case 'circle':
      case 'arc':
        return { x: el.cx, y: el.cy };
      case 'rectangle':
        return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
      default:
        return null;
    }
  }

  // Get intersections between two elements
  getIntersections(el1, el2) {
    const intersections = [];

    // Line-Line
    if (el1.type === 'line' && el2.type === 'line') {
      const int = Geometry.lineLineIntersection(
        { x: el1.x1, y: el1.y1 }, { x: el1.x2, y: el1.y2 },
        { x: el2.x1, y: el2.y1 }, { x: el2.x2, y: el2.y2 }
      );
      if (int) intersections.push(int);
    }

    // Line-Circle
    if (el1.type === 'line' && el2.type === 'circle') {
      const ints = Geometry.lineCircleIntersection(
        { x: el1.x1, y: el1.y1 }, { x: el1.x2, y: el1.y2 },
        { x: el2.cx, y: el2.cy }, el2.radius
      );
      intersections.push(...ints);
    }
    if (el1.type === 'circle' && el2.type === 'line') {
      const ints = Geometry.lineCircleIntersection(
        { x: el2.x1, y: el2.y1 }, { x: el2.x2, y: el2.y2 },
        { x: el1.cx, y: el1.cy }, el1.radius
      );
      intersections.push(...ints);
    }

    // Circle-Circle
    if (el1.type === 'circle' && el2.type === 'circle') {
      const ints = Geometry.circleCircleIntersection(
        { x: el1.cx, y: el1.cy }, el1.radius,
        { x: el2.cx, y: el2.cy }, el2.radius
      );
      intersections.push(...ints);
    }

    return intersections;
  }

  // Check if point is on line segment
  isPointOnLineSegment(point, line) {
    const d1 = Geometry.distance(point, { x: line.x1, y: line.y1 });
    const d2 = Geometry.distance(point, { x: line.x2, y: line.y2 });
    const lineLen = Geometry.distance({ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 });
    return Math.abs(d1 + d2 - lineLen) < 0.01;
  }
}

window.SnapSystem = SnapSystem;
window.SnapTypes = SnapTypes;
// ==================== EDITING TOOLS: SPLIT, TRIM, EXTEND ====================

class EditingTools {
  constructor() {
    this.mode = null; // 'split', 'trim', 'extend'
    this.cuttingEdges = [];
  }

  // ==================== SPLIT ====================
  
  // Split element at a point
  splitAtPoint(element, point) {
    switch (element.type) {
      case 'line':
        return this.splitLine(element, point);
      case 'polyline':
        return this.splitPolyline(element, point);
      case 'circle':
        return this.splitCircle(element, point);
      case 'arc':
        return this.splitArc(element, point);
      default:
        return [element];
    }
  }

  // Split line at point
  splitLine(line, point) {
    // Check if point is on the line
    const dist = Geometry.pointToLineDistance(
      point,
      { x: line.x1, y: line.y1 },
      { x: line.x2, y: line.y2 }
    );
    
    if (dist > 1) return [line]; // Point not on line
    
    // Check if point is not at endpoints
    const d1 = Geometry.distance(point, { x: line.x1, y: line.y1 });
    const d2 = Geometry.distance(point, { x: line.x2, y: line.y2 });
    
    if (d1 < 1 || d2 < 1) return [line]; // Point at endpoint
    
    // Create two new lines
    const line1 = {
      ...line,
      id: this.generateId(),
      x2: point.x,
      y2: point.y
    };
    
    const line2 = {
      ...line,
      id: this.generateId(),
      x1: point.x,
      y1: point.y
    };
    
    return [line1, line2];
  }

  // Split polyline at point
  splitPolyline(polyline, point) {
    if (!polyline.points || polyline.points.length < 2) return [polyline];
    
    // Find which segment the point is on
    for (let i = 0; i < polyline.points.length - 1; i++) {
      const p1 = polyline.points[i];
      const p2 = polyline.points[i + 1];
      const dist = Geometry.pointToLineDistance(point, p1, p2);
      
      if (dist < 1) {
        // Split at this segment
        const poly1 = {
          ...polyline,
          id: this.generateId(),
          points: [...polyline.points.slice(0, i + 1), { ...point }]
        };
        
        const poly2 = {
          ...polyline,
          id: this.generateId(),
          points: [{ ...point }, ...polyline.points.slice(i + 1)]
        };
        
        return [poly1, poly2];
      }
    }
    
    return [polyline];
  }

  // Split circle at point (converts to arc)
  splitCircle(circle, point) {
    const angle = Geometry.radToDeg(
      Math.atan2(point.y - circle.cy, point.x - circle.cx)
    );
    
    // Create arc from the split point going full circle minus a small gap
    const arc = {
      ...circle,
      type: 'arc',
      id: this.generateId(),
      startAngle: angle + 1,
      endAngle: angle - 1
    };
    
    return [arc];
  }

  // Split arc at point
  splitArc(arc, point) {
    const angle = Geometry.radToDeg(
      Math.atan2(point.y - arc.cy, point.x - arc.cx)
    );
    
    const arc1 = {
      ...arc,
      id: this.generateId(),
      endAngle: angle
    };
    
    const arc2 = {
      ...arc,
      id: this.generateId(),
      startAngle: angle
    };
    
    return [arc1, arc2];
  }

  // ==================== SPLIT AT INTERSECTIONS ====================
  
  // Find all intersection points for an element
  findIntersections(element, otherElements) {
    const intersections = [];
    
    otherElements.forEach(other => {
      if (other.id === element.id) return;
      
      const ints = this.getElementIntersections(element, other);
      intersections.push(...ints);
    });
    
    return intersections;
  }

  // Get intersections between two elements
  getElementIntersections(el1, el2) {
    const intersections = [];

    if (el1.type === 'line') {
      if (el2.type === 'line') {
        const int = Geometry.lineLineIntersection(
          { x: el1.x1, y: el1.y1 }, { x: el1.x2, y: el1.y2 },
          { x: el2.x1, y: el2.y1 }, { x: el2.x2, y: el2.y2 }
        );
        if (int) intersections.push({ x: int.x, y: int.y });
      }
      else if (el2.type === 'circle' || el2.type === 'arc') {
        const ints = Geometry.lineCircleIntersection(
          { x: el1.x1, y: el1.y1 }, { x: el1.x2, y: el1.y2 },
          { x: el2.cx, y: el2.cy }, el2.radius
        );
        intersections.push(...ints);
      }
      else if (el2.type === 'rectangle') {
        // Check intersection with all 4 sides
        const sides = this.getRectangleSides(el2);
        sides.forEach(side => {
          const int = Geometry.lineLineIntersection(
            { x: el1.x1, y: el1.y1 }, { x: el1.x2, y: el1.y2 },
            side.p1, side.p2
          );
          if (int) intersections.push({ x: int.x, y: int.y });
        });
      }
    }
    else if (el1.type === 'circle') {
      if (el2.type === 'line') {
        const ints = Geometry.lineCircleIntersection(
          { x: el2.x1, y: el2.y1 }, { x: el2.x2, y: el2.y2 },
          { x: el1.cx, y: el1.cy }, el1.radius
        );
        intersections.push(...ints);
      }
      else if (el2.type === 'circle') {
        const ints = Geometry.circleCircleIntersection(
          { x: el1.cx, y: el1.cy }, el1.radius,
          { x: el2.cx, y: el2.cy }, el2.radius
        );
        intersections.push(...ints);
      }
    }

    return intersections;
  }

  // Get rectangle sides as line segments
  getRectangleSides(rect) {
    return [
      { p1: { x: rect.x, y: rect.y }, p2: { x: rect.x + rect.width, y: rect.y } },
      { p1: { x: rect.x + rect.width, y: rect.y }, p2: { x: rect.x + rect.width, y: rect.y + rect.height } },
      { p1: { x: rect.x + rect.width, y: rect.y + rect.height }, p2: { x: rect.x, y: rect.y + rect.height } },
      { p1: { x: rect.x, y: rect.y + rect.height }, p2: { x: rect.x, y: rect.y } }
    ];
  }

  // Split element at all intersections
  splitAtAllIntersections(element, otherElements) {
    const intersections = this.findIntersections(element, otherElements);
    
    if (intersections.length === 0) return [element];
    
    // Sort intersections by distance from start
    if (element.type === 'line') {
      intersections.sort((a, b) => {
        const distA = Geometry.distance({ x: element.x1, y: element.y1 }, a);
        const distB = Geometry.distance({ x: element.x1, y: element.y1 }, b);
        return distA - distB;
      });
    }
    
    // Split progressively
    let segments = [element];
    intersections.forEach(point => {
      const newSegments = [];
      segments.forEach(seg => {
        const split = this.splitAtPoint(seg, point);
        newSegments.push(...split);
      });
      segments = newSegments;
    });
    
    return segments;
  }

  // ==================== TRIM ====================
  
  // Trim element to cutting edges
  trimElement(element, clickPoint, cuttingEdges, allElements) {
    if (element.type !== 'line') {
      // For now, only support line trimming
      return [element];
    }
    
    // Find all intersection points with cutting edges
    const intersections = [];
    cuttingEdges.forEach(edge => {
      const ints = this.getElementIntersections(element, edge);
      intersections.push(...ints);
    });
    
    if (intersections.length === 0) return [element];
    
    // Sort by distance from start
    const start = { x: element.x1, y: element.y1 };
    const end = { x: element.x2, y: element.y2 };
    
    intersections.sort((a, b) => {
      return Geometry.distance(start, a) - Geometry.distance(start, b);
    });
    
    // Find which segment the click point is in
    const clickDistFromStart = Geometry.distance(start, clickPoint);
    
    // Determine which part to keep
    let trimStart = start;
    let trimEnd = end;
    
    for (let i = 0; i < intersections.length; i++) {
      const intDist = Geometry.distance(start, intersections[i]);
      if (clickDistFromStart < intDist) {
        // Click is before this intersection
        trimEnd = intersections[i];
        if (i > 0) {
          trimStart = intersections[i - 1];
        }
        break;
      }
      trimStart = intersections[i];
    }
    
    // Create trimmed line
    const trimmedLine = {
      ...element,
      x1: trimStart.x,
      y1: trimStart.y,
      x2: trimEnd.x,
      y2: trimEnd.y
    };
    
    // Check if the trimmed portion should be removed (click was on it)
    const clickOnTrimmed = Geometry.pointToLineDistance(
      clickPoint,
      trimStart,
      trimEnd
    ) < 5;
    
    if (clickOnTrimmed) {
      // Remove the clicked portion, keep the rest
      const remaining = [];
      
      if (Geometry.distance(start, trimStart) > 1) {
        remaining.push({
          ...element,
          id: this.generateId(),
          x2: trimStart.x,
          y2: trimStart.y
        });
      }
      
      if (Geometry.distance(trimEnd, end) > 1) {
        remaining.push({
          ...element,
          id: this.generateId(),
          x1: trimEnd.x,
          y1: trimEnd.y
        });
      }
      
      return remaining.length > 0 ? remaining : [];
    }
    
    return [trimmedLine];
  }

  // ==================== EXTEND ====================
  
  // Extend element to boundary
  extendElement(element, boundaryElements, extendEnd = 'nearest') {
    if (element.type !== 'line') {
      return element;
    }
    
    const start = { x: element.x1, y: element.y1 };
    const end = { x: element.x2, y: element.y2 };
    const dir = Geometry.vecNormalize(Geometry.vecSub(end, start));
    
    // Find intersection with boundaries (extended line)
    let nearestIntersection = null;
    let nearestDist = Infinity;
    
    // Extend from end point
    const extendedEnd = Geometry.vecAdd(end, Geometry.vecScale(dir, 10000));
    
    boundaryElements.forEach(boundary => {
      if (boundary.id === element.id) return;
      
      let int = null;
      
      if (boundary.type === 'line') {
        int = Geometry.lineLineIntersectionUnbounded(
          end, extendedEnd,
          { x: boundary.x1, y: boundary.y1 },
          { x: boundary.x2, y: boundary.y2 }
        );
        
        // Check if intersection is on the boundary line segment
        if (int) {
          const onBoundary = Geometry.pointToLineDistance(
            int,
            { x: boundary.x1, y: boundary.y1 },
            { x: boundary.x2, y: boundary.y2 }
          ) < 1;
          
          if (!onBoundary) int = null;
        }
      }
      else if (boundary.type === 'circle') {
        const ints = Geometry.lineCircleIntersection(
          end, extendedEnd,
          { x: boundary.cx, y: boundary.cy },
          boundary.radius
        );
        if (ints.length > 0) {
          // Find nearest intersection in the direction of extension
          ints.forEach(i => {
            const toInt = Geometry.vecSub(i, end);
            if (Geometry.vecDot(toInt, dir) > 0) {
              const dist = Geometry.distance(end, i);
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestIntersection = i;
              }
            }
          });
        }
        return;
      }
      
      if (int) {
        // Check if intersection is in the direction of extension
        const toInt = Geometry.vecSub(int, end);
        if (Geometry.vecDot(toInt, dir) > 0) {
          const dist = Geometry.distance(end, int);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIntersection = int;
          }
        }
      }
    });
    
    if (nearestIntersection) {
      return {
        ...element,
        x2: nearestIntersection.x,
        y2: nearestIntersection.y
      };
    }
    
    return element;
  }

  // Generate unique ID
  generateId() {
    return 'el_' + Math.random().toString(36).substr(2, 9);
  }
}

window.EditingTools = EditingTools;
// ==================== DXF PARSER ====================
// Parses DXF files and converts to HydroDraw format

class DXFParser {
  constructor() {
    this.warnings = [];
  }

  parse(dxfContent) {
    this.warnings = [];
    const lines = dxfContent.split(/\r?\n/);
    const elements = [];
    const layers = new Map();
    
    let i = 0;
    let currentSection = null;
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0 && value === 'SECTION') {
        i += 2;
        if (parseInt(lines[i], 10) === 2) {
          currentSection = lines[i + 1]?.trim();
          i += 2;
        }
        continue;
      }
      
      if (code === 0 && value === 'ENDSEC') {
        currentSection = null;
        i += 2;
        continue;
      }
      
      // Parse TABLES section for layers
      if (currentSection === 'TABLES' && code === 0 && value === 'LAYER') {
        const layer = this.parseLayer(lines, i + 2);
        if (layer) {
          layers.set(layer.name, layer);
        }
        i += 2;
        continue;
      }
      
      // Parse ENTITIES section
      if (currentSection === 'ENTITIES' && code === 0) {
        let entity = null;
        
        switch (value) {
          case 'LINE':
            entity = this.parseLine(lines, i + 2);
            break;
          case 'LWPOLYLINE':
          case 'POLYLINE':
            entity = this.parsePolyline(lines, i + 2);
            break;
          case 'CIRCLE':
            entity = this.parseCircle(lines, i + 2);
            break;
          case 'ARC':
            entity = this.parseArc(lines, i + 2);
            break;
          case 'TEXT':
          case 'MTEXT':
            entity = this.parseText(lines, i + 2);
            break;
          default:
            if (value && value !== 'ENDSEC' && value !== 'EOF') {
              this.warnings.push(`Skipped unsupported entity: ${value}`);
            }
        }
        
        if (entity) {
          elements.push(entity);
        }
      }
      
      i += 2;
    }
    
    // Convert layers map to array
    const layersArray = Array.from(layers.values());
    if (layersArray.length === 0) {
      layersArray.push({
        id: '0',
        name: '0',
        visible: true,
        locked: false,
        color: '#FFFFFF'
      });
    }
    
    return {
      elements,
      layers: layersArray,
      warnings: this.warnings
    };
  }

  parseLayer(lines, startIndex) {
    let i = startIndex;
    const layer = {
      id: '',
      name: '',
      visible: true,
      locked: false,
      color: '#FFFFFF'
    };
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0) break;
      
      switch (code) {
        case 2:
          layer.name = value;
          layer.id = value;
          break;
        case 62:
          layer.color = this.aciToHex(parseInt(value, 10));
          break;
        case 70:
          const flags = parseInt(value, 10);
          layer.locked = (flags & 4) !== 0;
          layer.visible = (flags & 1) === 0;
          break;
      }
      
      i += 2;
    }
    
    return layer.name ? layer : null;
  }

  parseLine(lines, startIndex) {
    let i = startIndex;
    const line = {
      id: this.generateId(),
      type: 'line',
      x1: 0, y1: 0, x2: 0, y2: 0,
      stroke: '#FFFFFF',
      strokeWidth: 1,
      layerId: '0'
    };
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0) break;
      
      switch (code) {
        case 8: line.layerId = value; break;
        case 10: line.x1 = parseFloat(value); break;
        case 20: line.y1 = parseFloat(value); break;
        case 11: line.x2 = parseFloat(value); break;
        case 21: line.y2 = parseFloat(value); break;
        case 62: line.stroke = this.aciToHex(parseInt(value, 10)); break;
      }
      
      i += 2;
    }
    
    return line;
  }

  parsePolyline(lines, startIndex) {
    let i = startIndex;
    const polyline = {
      id: this.generateId(),
      type: 'polyline',
      points: [],
      closed: false,
      stroke: '#FFFFFF',
      strokeWidth: 1,
      layerId: '0'
    };
    
    let vertexCount = 0;
    let currentX = 0, currentY = 0;
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0 && value !== 'VERTEX') break;
      
      switch (code) {
        case 8: polyline.layerId = value; break;
        case 10:
          currentX = parseFloat(value);
          break;
        case 20:
          currentY = parseFloat(value);
          polyline.points.push({ x: currentX, y: currentY });
          break;
        case 70:
          polyline.closed = (parseInt(value, 10) & 1) !== 0;
          break;
        case 90:
          vertexCount = parseInt(value, 10);
          break;
        case 62: polyline.stroke = this.aciToHex(parseInt(value, 10)); break;
      }
      
      i += 2;
    }
    
    return polyline.points.length >= 2 ? polyline : null;
  }

  parseCircle(lines, startIndex) {
    let i = startIndex;
    const circle = {
      id: this.generateId(),
      type: 'circle',
      cx: 0, cy: 0, radius: 0,
      stroke: '#FFFFFF',
      strokeWidth: 1,
      layerId: '0'
    };
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0) break;
      
      switch (code) {
        case 8: circle.layerId = value; break;
        case 10: circle.cx = parseFloat(value); break;
        case 20: circle.cy = parseFloat(value); break;
        case 40: circle.radius = parseFloat(value); break;
        case 62: circle.stroke = this.aciToHex(parseInt(value, 10)); break;
      }
      
      i += 2;
    }
    
    return circle;
  }

  parseArc(lines, startIndex) {
    let i = startIndex;
    const arc = {
      id: this.generateId(),
      type: 'arc',
      cx: 0, cy: 0, radius: 0,
      startAngle: 0, endAngle: 360,
      stroke: '#FFFFFF',
      strokeWidth: 1,
      layerId: '0'
    };
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0) break;
      
      switch (code) {
        case 8: arc.layerId = value; break;
        case 10: arc.cx = parseFloat(value); break;
        case 20: arc.cy = parseFloat(value); break;
        case 40: arc.radius = parseFloat(value); break;
        case 50: arc.startAngle = parseFloat(value); break;
        case 51: arc.endAngle = parseFloat(value); break;
        case 62: arc.stroke = this.aciToHex(parseInt(value, 10)); break;
      }
      
      i += 2;
    }
    
    return arc;
  }

  parseText(lines, startIndex) {
    let i = startIndex;
    const text = {
      id: this.generateId(),
      type: 'text',
      x: 0, y: 0,
      text: '',
      height: 10,
      rotation: 0,
      stroke: '#FFFFFF',
      layerId: '0'
    };
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0) break;
      
      switch (code) {
        case 8: text.layerId = value; break;
        case 10: text.x = parseFloat(value); break;
        case 20: text.y = parseFloat(value); break;
        case 1: text.text = value; break;
        case 40: text.height = parseFloat(value); break;
        case 50: text.rotation = parseFloat(value); break;
        case 62: text.stroke = this.aciToHex(parseInt(value, 10)); break;
      }
      
      i += 2;
    }
    
    return text.text ? text : null;
  }

  // AutoCAD Color Index to Hex
  aciToHex(aci) {
    const colors = {
      0: '#000000', // ByBlock
      1: '#FF0000', // Red
      2: '#FFFF00', // Yellow
      3: '#00FF00', // Green
      4: '#00FFFF', // Cyan
      5: '#0000FF', // Blue
      6: '#FF00FF', // Magenta
      7: '#FFFFFF', // White
      8: '#808080', // Gray
      9: '#C0C0C0', // Light Gray
    };
    return colors[aci] || '#FFFFFF';
  }

  generateId() {
    return 'dxf_' + Math.random().toString(36).substr(2, 9);
  }
}

window.DXFParser = DXFParser;
// ==================== DXF WRITER ====================
// Exports HydroDraw elements to DXF format

class DXFWriter {
  constructor() {
    this.content = [];
  }

  write(project) {
    this.content = [];
    
    // Header
    this.writeHeader();
    
    // Tables (layers)
    this.writeTables(project.layers);
    
    // Entities
    this.writeEntities(project.elements, project.layers);
    
    // EOF
    this.addPair(0, 'EOF');
    
    return this.content.join('\n');
  }

  writeHeader() {
    this.addPair(0, 'SECTION');
    this.addPair(2, 'HEADER');
    
    // Version
    this.addPair(9, '$ACADVER');
    this.addPair(1, 'AC1015'); // AutoCAD 2000
    
    // Units
    this.addPair(9, '$INSUNITS');
    this.addPair(70, '4'); // Millimeters
    
    this.addPair(0, 'ENDSEC');
  }

  writeTables(layers) {
    this.addPair(0, 'SECTION');
    this.addPair(2, 'TABLES');
    
    // Layer table
    this.addPair(0, 'TABLE');
    this.addPair(2, 'LAYER');
    this.addPair(70, layers.length.toString());
    
    layers.forEach(layer => {
      this.addPair(0, 'LAYER');
      this.addPair(2, layer.name || layer.id);
      this.addPair(70, layer.locked ? '4' : '0');
      this.addPair(62, this.hexToAci(layer.color).toString());
      this.addPair(6, 'CONTINUOUS');
    });
    
    this.addPair(0, 'ENDTAB');
    this.addPair(0, 'ENDSEC');
  }

  writeEntities(elements, layers) {
    this.addPair(0, 'SECTION');
    this.addPair(2, 'ENTITIES');
    
    elements.forEach(el => {
      const layer = layers.find(l => l.id === el.layerId) || layers[0];
      
      switch (el.type) {
        case 'line':
          this.writeLine(el, layer);
          break;
        case 'polyline':
          this.writePolyline(el, layer);
          break;
        case 'rectangle':
          this.writeRectangle(el, layer);
          break;
        case 'circle':
          this.writeCircle(el, layer);
          break;
        case 'arc':
          this.writeArc(el, layer);
          break;
        case 'text':
          this.writeText(el, layer);
          break;
      }
    });
    
    this.addPair(0, 'ENDSEC');
  }

  writeLine(line, layer) {
    this.addPair(0, 'LINE');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(line.stroke));
    this.addPair(10, line.x1.toFixed(6));
    this.addPair(20, line.y1.toFixed(6));
    this.addPair(30, '0.0');
    this.addPair(11, line.x2.toFixed(6));
    this.addPair(21, line.y2.toFixed(6));
    this.addPair(31, '0.0');
  }

  writePolyline(polyline, layer) {
    if (!polyline.points || polyline.points.length < 2) return;
    
    this.addPair(0, 'LWPOLYLINE');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(polyline.stroke));
    this.addPair(90, polyline.points.length.toString());
    this.addPair(70, polyline.closed ? '1' : '0');
    
    polyline.points.forEach(point => {
      this.addPair(10, point.x.toFixed(6));
      this.addPair(20, point.y.toFixed(6));
    });
  }

  writeRectangle(rect, layer) {
    // Write rectangle as LWPOLYLINE
    this.addPair(0, 'LWPOLYLINE');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(rect.stroke));
    this.addPair(90, '4');
    this.addPair(70, '1'); // Closed
    
    this.addPair(10, rect.x.toFixed(6));
    this.addPair(20, rect.y.toFixed(6));
    this.addPair(10, (rect.x + rect.width).toFixed(6));
    this.addPair(20, rect.y.toFixed(6));
    this.addPair(10, (rect.x + rect.width).toFixed(6));
    this.addPair(20, (rect.y + rect.height).toFixed(6));
    this.addPair(10, rect.x.toFixed(6));
    this.addPair(20, (rect.y + rect.height).toFixed(6));
  }

  writeCircle(circle, layer) {
    this.addPair(0, 'CIRCLE');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(circle.stroke));
    this.addPair(10, circle.cx.toFixed(6));
    this.addPair(20, circle.cy.toFixed(6));
    this.addPair(30, '0.0');
    this.addPair(40, circle.radius.toFixed(6));
  }

  writeArc(arc, layer) {
    this.addPair(0, 'ARC');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(arc.stroke));
    this.addPair(10, arc.cx.toFixed(6));
    this.addPair(20, arc.cy.toFixed(6));
    this.addPair(30, '0.0');
    this.addPair(40, arc.radius.toFixed(6));
    this.addPair(50, arc.startAngle.toFixed(6));
    this.addPair(51, arc.endAngle.toFixed(6));
  }

  writeText(text, layer) {
    this.addPair(0, 'TEXT');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(text.stroke));
    this.addPair(10, text.x.toFixed(6));
    this.addPair(20, text.y.toFixed(6));
    this.addPair(30, '0.0');
    this.addPair(40, (text.height || 10).toFixed(6));
    this.addPair(1, text.text || '');
    if (text.rotation) {
      this.addPair(50, text.rotation.toFixed(6));
    }
  }

  addPair(code, value) {
    this.content.push(code.toString());
    this.content.push(value);
  }

  // Hex color to AutoCAD Color Index
  hexToAci(hex) {
    if (!hex) return 7;
    const color = hex.toUpperCase();
    const colorMap = {
      '#000000': 0,
      '#FF0000': 1,
      '#FFFF00': 2,
      '#00FF00': 3,
      '#00FFFF': 4,
      '#0000FF': 5,
      '#FF00FF': 6,
      '#FFFFFF': 7,
      '#808080': 8,
      '#C0C0C0': 9
    };
    return colorMap[color] || 7;
  }
}

window.DXFWriter = DXFWriter;
// ==================== HYDRO FILE FORMAT ====================
// .hydro file format handler (JSON-based)

const HYDRO_VERSION = '1.0.0';

class HydroFormat {
  // Create new empty project
  static createNew() {
    return {
      version: HYDRO_VERSION,
      name: 'Untitled',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      settings: {
        gridSize: 10,
        gridEnabled: true,
        snapEnabled: true,
        orthoEnabled: false,
        polarEnabled: false,
        polarIncrement: 15,
        snapSettings: {
          grid: true,
          endpoint: true,
          midpoint: true,
          center: true,
          intersection: true,
          perpendicular: false,
          tangent: false
        }
      },
      canvas: {
        width: 2000,
        height: 1500,
        backgroundColor: '#1a1a2e'
      },
      layers: [
        {
          id: 'layer_0',
          name: 'Layer 0',
          visible: true,
          locked: false,
          color: '#FFFFFF'
        }
      ],
      elements: []
    };
  }

  // Serialize project to JSON string
  static serialize(project) {
    const data = {
      ...project,
      version: HYDRO_VERSION,
      modified: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  // Parse JSON string to project
  static parse(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      // Validate version
      if (!data.version) {
        console.warn('No version found in file, assuming v1.0.0');
        data.version = '1.0.0';
      }
      
      // Ensure required fields exist
      data.settings = data.settings || this.createNew().settings;
      data.canvas = data.canvas || this.createNew().canvas;
      data.layers = data.layers || this.createNew().layers;
      data.elements = data.elements || [];
      
      // Validate and fix element IDs
      data.elements = data.elements.map(el => {
        if (!el.id) {
          el.id = this.generateId();
        }
        return el;
      });
      
      return {
        success: true,
        project: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Import from DXF
  static importDXF(dxfContent) {
    const parser = new DXFParser();
    const result = parser.parse(dxfContent);
    
    const project = this.createNew();
    project.elements = result.elements;
    
    // Merge layers
    if (result.layers.length > 0) {
      project.layers = result.layers.map(l => ({
        id: l.id || l.name,
        name: l.name,
        visible: l.visible !== false,
        locked: l.locked === true,
        color: l.color || '#FFFFFF'
      }));
    }
    
    return {
      success: true,
      project,
      warnings: result.warnings
    };
  }

  // Export to DXF
  static exportDXF(project) {
    const writer = new DXFWriter();
    return writer.write(project);
  }

  // Export to PNG (returns data URL)
  static exportPNG(svgElement, backgroundColor = '#FFFFFF') {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw SVG
        ctx.drawImage(img, 0, 0);
        
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  static generateId() {
    return 'el_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}

window.HydroFormat = HydroFormat;
window.HYDRO_VERSION = HYDRO_VERSION;
// ==================== HYDRODRAW CAD - MAIN APPLICATION ====================
// PT Hidro Dinamika Internasional
// Version 1.0.0

// ==================== SVG ICONS ====================
const Icons = {
  new: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
  open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>',
  saveAs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M21 15v4a2 2 0 0 1-2 2"/><polyline points="17,21 17,13 7,13 7,21"/></svg>',
  import: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  select: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>',
  pan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
  line: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>',
  polyline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,17 8,12 14,15 21,7"/></svg>',
  rectangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
  circle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>',
  arc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 0 1 9 9"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4,7 4,4 20,4 20,7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>',
  split: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="20" x2="12" y2="12"/><line x1="12" y1="12" x2="20" y2="4"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  trim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="20" x2="10" y2="14"/><line x1="14" y1="10" x2="20" y2="4" stroke-dasharray="4,2"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>',
  extend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="20" x2="12" y2="12"/><line x1="12" y1="12" x2="20" y2="4" stroke-dasharray="4,2"/><polyline points="16,4 20,4 20,8"/></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  zoomIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  zoomOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5,9 2,12 5,15"/><polyline points="9,5 12,2 15,5"/><polyline points="15,19 12,22 9,19"/><polyline points="19,9 22,12 19,15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>',
};

// ==================== APPLICATION STATE ====================
const AppState = {
  // Project
  project: null,
  isModified: false,
  
  // Canvas
  zoom: 1,
  panX: 0,
  panY: 0,
  
  // Tools
  activeTool: 'select',
  activeLayerId: 'layer_0',
  
  // Drawing state
  isDrawing: false,
  drawStart: null,
  currentElement: null,
  polylinePoints: [],
  
  // Selection
  selectedElements: [],
  selectionBox: null,
  
  // Snapping
  currentSnap: null,
  referencePoint: null,
  
  // Modes
  orthoEnabled: false,
  polarEnabled: false,
  polarIncrement: 15,
  
  // Editing
  editMode: null, // 'split', 'trim', 'extend'
  cuttingEdges: [],
  
  // History
  history: [],
  historyIndex: -1,
  
  // UI
  showHeadsUp: false,
  headsUpPosition: { x: 0, y: 0 },
  headsUpData: {},
  
  // Snap system instance
  snapSystem: null,
  editingTools: null,
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize systems
  AppState.snapSystem = new SnapSystem();
  AppState.editingTools = new EditingTools();
  
  // Create new project
  AppState.project = HydroFormat.createNew();
  
  // Render app
  renderApp();
  
  // Setup event listeners
  setupEventListeners();
  
  // Save initial history
  saveHistory();
});

// ==================== RENDER FUNCTIONS ====================
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-container">
      ${renderTopToolbar()}
      <div class="main-content">
        ${renderToolPanel()}
        ${renderCanvasContainer()}
        ${renderPropertiesPanel()}
      </div>
      ${renderStatusBar()}
    </div>
    ${AppState.showHeadsUp ? renderHeadsUpInput() : ''}
  `;
  
  // Draw canvas after render
  setTimeout(() => {
    drawCanvas();
    setupCanvasEvents();
  }, 0);
}

function renderTopToolbar() {
  return `
    <div class="top-toolbar">
      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="handleNew()" title="New (Ctrl+N)">
          ${Icons.new}<span>New</span>
        </button>
        <button class="toolbar-btn" onclick="handleOpen()" title="Open (Ctrl+O)">
          ${Icons.open}<span>Open</span>
        </button>
        <button class="toolbar-btn" onclick="handleSave()" title="Save (Ctrl+S)">
          ${Icons.save}<span>Save</span>
        </button>
        <button class="toolbar-btn" onclick="handleSaveAs()" title="Save As">
          ${Icons.saveAs}<span>Save As</span>
        </button>
      </div>
      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="handleImportDXF()" title="Import DXF">
          ${Icons.import}<span>Import DXF</span>
        </button>
        <button class="toolbar-btn" onclick="handleExportDXF()" title="Export DXF">
          ${Icons.export}<span>Export DXF</span>
        </button>
        <button class="toolbar-btn" onclick="handleExportPNG()" title="Export PNG">
          ${Icons.image}<span>Export PNG</span>
        </button>
      </div>
      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="handleUndo()" title="Undo (Ctrl+Z)">
          ${Icons.undo}
        </button>
        <button class="toolbar-btn" onclick="handleRedo()" title="Redo (Ctrl+Y)">
          ${Icons.redo}
        </button>
      </div>
      <div class="toolbar-group toggle-bar">
        <button class="toggle-btn ${AppState.project?.settings?.gridEnabled ? 'on' : ''}" 
                onclick="toggleGrid()" title="Grid">
          ${Icons.grid}<span>GRID</span>
        </button>
        <button class="toggle-btn ${AppState.project?.settings?.snapEnabled ? 'on' : ''}" 
                onclick="toggleSnap()" title="Snap">
          SNAP
        </button>
        <button class="toggle-btn ${AppState.orthoEnabled ? 'on' : ''}" 
                onclick="toggleOrtho()" title="Ortho Mode (F8)">
          ORTHO
        </button>
        <button class="toggle-btn ${AppState.polarEnabled ? 'on' : ''}" 
                onclick="togglePolar()" title="Polar Tracking (F10)">
          POLAR
        </button>
      </div>
      <div class="toolbar-group toggle-bar">
        <button class="toggle-btn ${AppState.snapSystem?.enabled?.endpoint ? 'on' : ''}" 
                onclick="toggleSnapType('endpoint')" title="Endpoint Snap">
          END
        </button>
        <button class="toggle-btn ${AppState.snapSystem?.enabled?.midpoint ? 'on' : ''}" 
                onclick="toggleSnapType('midpoint')" title="Midpoint Snap">
          MID
        </button>
        <button class="toggle-btn ${AppState.snapSystem?.enabled?.center ? 'on' : ''}" 
                onclick="toggleSnapType('center')" title="Center Snap">
          CEN
        </button>
        <button class="toggle-btn ${AppState.snapSystem?.enabled?.intersection ? 'on' : ''}" 
                onclick="toggleSnapType('intersection')" title="Intersection Snap">
          INT
        </button>
        <button class="toggle-btn ${AppState.snapSystem?.enabled?.perpendicular ? 'on' : ''}" 
                onclick="toggleSnapType('perpendicular')" title="Perpendicular Snap">
          PER
        </button>
        <button class="toggle-btn ${AppState.snapSystem?.enabled?.tangent ? 'on' : ''}" 
                onclick="toggleSnapType('tangent')" title="Tangent Snap">
          TAN
        </button>
      </div>
      <div class="toolbar-group" style="margin-left:auto;">
        <button class="toolbar-btn small" onclick="handleZoomIn()" title="Zoom In">
          ${Icons.zoomIn}
        </button>
        <span style="font-size:11px;color:#a0a0a0;min-width:50px;text-align:center;">
          ${Math.round(AppState.zoom * 100)}%
        </span>
        <button class="toolbar-btn small" onclick="handleZoomOut()" title="Zoom Out">
          ${Icons.zoomOut}
        </button>
        <button class="toolbar-btn small" onclick="handleZoomFit()" title="Zoom Fit">
          FIT
        </button>
      </div>
    </div>
  `;
}

function renderToolPanel() {
  const tools = [
    { id: 'select', icon: 'select', label: 'Select (V)' },
    { id: 'pan', icon: 'pan', label: 'Pan (H)' },
    { type: 'separator' },
    { id: 'line', icon: 'line', label: 'Line (L)' },
    { id: 'polyline', icon: 'polyline', label: 'Polyline (PL)' },
    { id: 'rectangle', icon: 'rectangle', label: 'Rectangle (R)' },
    { id: 'circle', icon: 'circle', label: 'Circle (C)' },
    { id: 'arc', icon: 'arc', label: 'Arc (A)' },
    { id: 'text', icon: 'text', label: 'Text (T)' },
    { type: 'separator' },
    { id: 'split', icon: 'split', label: 'Split' },
    { id: 'trim', icon: 'trim', label: 'Trim (TR)' },
    { id: 'extend', icon: 'extend', label: 'Extend (EX)' },
    { type: 'separator' },
    { id: 'move', icon: 'move', label: 'Move (M)' },
    { id: 'rotate', icon: 'rotate', label: 'Rotate (RO)' },
    { type: 'separator' },
    { id: 'delete', icon: 'delete', label: 'Delete (DEL)' },
  ];
  
  return `
    <div class="tool-panel">
      ${tools.map(tool => {
        if (tool.type === 'separator') {
          return '<div class="tool-separator"></div>';
        }
        return `
          <button class="tool-btn ${AppState.activeTool === tool.id ? 'active' : ''}" 
                  onclick="setTool('${tool.id}')" 
                  title="${tool.label}">
            ${Icons[tool.icon]}
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderCanvasContainer() {
  const canvasWidth = AppState.project?.canvas?.width || 2000;
  const canvasHeight = AppState.project?.canvas?.height || 1500;
  
  return `
    <div class="canvas-container" id="canvasContainer">
      <div class="canvas-wrapper" id="canvasWrapper" 
           style="transform: translate(${AppState.panX}px, ${AppState.panY}px) scale(${AppState.zoom})">
        <svg class="cad-canvas" id="cadCanvas" 
             width="${canvasWidth}" height="${canvasHeight}"
             viewBox="0 0 ${canvasWidth} ${canvasHeight}">
        </svg>
      </div>
      ${renderSnapIndicator()}
      ${renderSelectionBox()}
    </div>
  `;
}

function renderPropertiesPanel() {
  const selected = AppState.selectedElements[0];
  const layers = AppState.project?.layers || [];
  const activeLayer = layers.find(l => l.id === AppState.activeLayerId);
  
  return `
    <div class="properties-panel">
      <div class="panel-header">Properties</div>
      <div class="panel-content">
        ${selected ? renderElementProperties(selected) : renderNoSelection()}
        
        <div class="property-group">
          <div class="property-group-title">Drawing Settings</div>
          <div class="property-row">
            <span class="property-label">Stroke:</span>
            <input type="color" class="property-input" style="width:40px;height:24px;padding:0;" 
                   value="${AppState.project?.defaultStroke || '#FFFFFF'}" 
                   onchange="setDefaultStroke(this.value)">
            <input type="number" class="property-input property-input-small" 
                   value="${AppState.project?.defaultStrokeWidth || 1}" min="1" max="10"
                   onchange="setDefaultStrokeWidth(this.value)" placeholder="Width">
          </div>
        </div>
      </div>
      
      <div class="layers-panel">
        <div class="panel-header">
          Layers
          <button class="toolbar-btn small" onclick="addLayer()" title="Add Layer">
            ${Icons.plus}
          </button>
        </div>
        <div class="panel-content" style="padding:4px;">
          ${layers.map(layer => `
            <div class="layer-item ${layer.id === AppState.activeLayerId ? 'active' : ''}" 
                 onclick="setActiveLayer('${layer.id}')">
              <div class="layer-color" style="background:${layer.color}"></div>
              <span class="layer-name">${layer.name}</span>
              <div class="layer-icons">
                <span class="layer-icon ${layer.visible ? 'on' : 'off'}" 
                      onclick="event.stopPropagation(); toggleLayerVisibility('${layer.id}')">
                  ${layer.visible ? Icons.eye : Icons.eyeOff}
                </span>
                <span class="layer-icon ${layer.locked ? 'on' : 'off'}" 
                      onclick="event.stopPropagation(); toggleLayerLock('${layer.id}')">
                  ${layer.locked ? Icons.lock : Icons.unlock}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderElementProperties(el) {
  let props = '';
  
  switch (el.type) {
    case 'line':
      props = `
        <div class="property-row">
          <span class="property-label">X1:</span>
          <input type="number" class="property-input" value="${el.x1.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'x1', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">Y1:</span>
          <input type="number" class="property-input" value="${el.y1.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'y1', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">X2:</span>
          <input type="number" class="property-input" value="${el.x2.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'x2', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">Y2:</span>
          <input type="number" class="property-input" value="${el.y2.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'y2', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">Length:</span>
          <input type="number" class="property-input" 
                 value="${Geometry.distance({x:el.x1,y:el.y1},{x:el.x2,y:el.y2}).toFixed(2)}" disabled>
        </div>
        <div class="property-row">
          <span class="property-label">Angle:</span>
          <input type="number" class="property-input" 
                 value="${Geometry.radToDeg(Math.atan2(el.y2-el.y1, el.x2-el.x1)).toFixed(2)}" disabled>
        </div>
      `;
      break;
    case 'circle':
      props = `
        <div class="property-row">
          <span class="property-label">Center X:</span>
          <input type="number" class="property-input" value="${el.cx.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'cx', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">Center Y:</span>
          <input type="number" class="property-input" value="${el.cy.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'cy', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">Radius:</span>
          <input type="number" class="property-input" value="${el.radius.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'radius', parseFloat(this.value))">
        </div>
      `;
      break;
    case 'rectangle':
      props = `
        <div class="property-row">
          <span class="property-label">X:</span>
          <input type="number" class="property-input" value="${el.x.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'x', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">Y:</span>
          <input type="number" class="property-input" value="${el.y.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'y', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">Width:</span>
          <input type="number" class="property-input" value="${el.width.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'width', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">Height:</span>
          <input type="number" class="property-input" value="${el.height.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'height', parseFloat(this.value))">
        </div>
      `;
      break;
    case 'text':
      props = `
        <div class="property-row">
          <span class="property-label">X:</span>
          <input type="number" class="property-input" value="${el.x.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'x', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">Y:</span>
          <input type="number" class="property-input" value="${el.y.toFixed(2)}" 
                 onchange="updateElement('${el.id}', 'y', parseFloat(this.value))">
        </div>
        <div class="property-row">
          <span class="property-label">Text:</span>
          <input type="text" class="property-input" value="${el.text || ''}" 
                 onchange="updateElement('${el.id}', 'text', this.value)">
        </div>
        <div class="property-row">
          <span class="property-label">Height:</span>
          <input type="number" class="property-input" value="${el.height || 12}" 
                 onchange="updateElement('${el.id}', 'height', parseFloat(this.value))">
        </div>
      `;
      break;
    default:
      props = `<p style="color:#808080;font-size:11px;">Type: ${el.type}</p>`;
  }
  
  return `
    <div class="property-group">
      <div class="property-group-title">${el.type.toUpperCase()}</div>
      ${props}
      <div class="property-row">
        <span class="property-label">Stroke:</span>
        <input type="color" class="property-input" style="width:40px;height:24px;padding:0;" 
               value="${el.stroke || '#FFFFFF'}" 
               onchange="updateElement('${el.id}', 'stroke', this.value)">
      </div>
      <div class="property-row">
        <span class="property-label">Layer:</span>
        <select class="property-input" onchange="updateElement('${el.id}', 'layerId', this.value)">
          ${AppState.project.layers.map(l => `
            <option value="${l.id}" ${l.id === el.layerId ? 'selected' : ''}>${l.name}</option>
          `).join('')}
        </select>
      </div>
    </div>
  `;
}

function renderNoSelection() {
  return `
    <div style="padding:20px;text-align:center;color:#606060;font-size:11px;">
      No element selected<br>
      <span style="font-size:10px;">Click to select or draw</span>
    </div>
  `;
}

function renderStatusBar() {
  const coords = AppState.mouseCoords || { x: 0, y: 0 };
  return `
    <div class="status-bar">
      <div class="status-left">
        <span class="status-item">Tool: ${AppState.activeTool.toUpperCase()}</span>
        <span class="status-item">X: ${coords.x.toFixed(2)} Y: ${coords.y.toFixed(2)}</span>
        ${AppState.currentSnap ? `<span class="status-item" style="color:#4ade80;">Snap: ${AppState.currentSnap.type.toUpperCase()}</span>` : ''}
      </div>
      <div class="status-right">
        <span class="status-item">Elements: ${AppState.project?.elements?.length || 0}</span>
        <span class="status-item">Selected: ${AppState.selectedElements.length}</span>
        <span class="status-item">HydroDraw CAD v1.0 - PT Hidro Dinamika Internasional</span>
      </div>
    </div>
  `;
}

function renderSnapIndicator() {
  if (!AppState.currentSnap) return '';
  
  const x = AppState.currentSnap.point.x * AppState.zoom + AppState.panX;
  const y = AppState.currentSnap.point.y * AppState.zoom + AppState.panY;
  
  return `
    <div class="snap-indicator" style="left:${x}px;top:${y}px;">
      <div class="snap-marker ${AppState.currentSnap.type}"></div>
    </div>
  `;
}

function renderSelectionBox() {
  if (!AppState.selectionBox) return '';
  
  const box = AppState.selectionBox;
  const isWindow = box.x2 > box.x1; // Left to right = window, right to left = crossing
  
  const left = Math.min(box.x1, box.x2) * AppState.zoom + AppState.panX;
  const top = Math.min(box.y1, box.y2) * AppState.zoom + AppState.panY;
  const width = Math.abs(box.x2 - box.x1) * AppState.zoom;
  const height = Math.abs(box.y2 - box.y1) * AppState.zoom;
  
  return `
    <div class="selection-box ${isWindow ? 'window' : 'crossing'}" 
         style="left:${left}px;top:${top}px;width:${width}px;height:${height}px;"></div>
  `;
}

function renderHeadsUpInput() {
  const data = AppState.headsUpData;
  
  return `
    <div class="heads-up-input" style="left:${AppState.headsUpPosition.x + 20}px;top:${AppState.headsUpPosition.y + 20}px;">
      ${data.length !== undefined ? `
        <div class="heads-up-row">
          <span class="heads-up-label">Length:</span>
          <input type="number" class="heads-up-value" id="headsUpLength" 
                 value="${data.length.toFixed(2)}" 
                 onkeydown="handleHeadsUpKey(event)" 
                 onchange="updateHeadsUpLength(this.value)">
        </div>
      ` : ''}
      ${data.angle !== undefined ? `
        <div class="heads-up-row">
          <span class="heads-up-label">Angle:</span>
          <input type="number" class="heads-up-value" id="headsUpAngle" 
                 value="${data.angle.toFixed(2)}" 
                 onkeydown="handleHeadsUpKey(event)" 
                 onchange="updateHeadsUpAngle(this.value)">
        </div>
      ` : ''}
      ${data.dx !== undefined ? `
        <div class="heads-up-row">
          <span class="heads-up-label">dX:</span>
          <input type="number" class="heads-up-value" id="headsUpDx" 
                 value="${data.dx.toFixed(2)}" 
                 onkeydown="handleHeadsUpKey(event)">
        </div>
        <div class="heads-up-row">
          <span class="heads-up-label">dY:</span>
          <input type="number" class="heads-up-value" id="headsUpDy" 
                 value="${data.dy.toFixed(2)}" 
                 onkeydown="handleHeadsUpKey(event)">
        </div>
      ` : ''}
      ${data.radius !== undefined ? `
        <div class="heads-up-row">
          <span class="heads-up-label">Radius:</span>
          <input type="number" class="heads-up-value" id="headsUpRadius" 
                 value="${data.radius.toFixed(2)}" 
                 onkeydown="handleHeadsUpKey(event)">
        </div>
      ` : ''}
    </div>
  `;
}

// Continue in app-part2.js...
// ==================== HYDRODRAW CAD - PART 2 ====================
// Canvas Drawing & Event Handlers

// ==================== CANVAS DRAWING ====================
function drawCanvas() {
  const svg = document.getElementById('cadCanvas');
  if (!svg) return;
  
  const project = AppState.project;
  const canvasWidth = project.canvas.width;
  const canvasHeight = project.canvas.height;
  
  let content = '';
  
  // Background
  content += `<rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" fill="#f8f8f8"/>`;
  
  // Grid
  if (project.settings.gridEnabled) {
    const gridSize = project.settings.gridSize || 10;
    content += '<g class="grid-layer" stroke="#e0e0e0" stroke-width="0.5">';
    
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      const strokeWidth = x % (gridSize * 10) === 0 ? '1' : '0.5';
      const color = x % (gridSize * 10) === 0 ? '#d0d0d0' : '#e8e8e8';
      content += `<line x1="${x}" y1="0" x2="${x}" y2="${canvasHeight}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    }
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      const strokeWidth = y % (gridSize * 10) === 0 ? '1' : '0.5';
      const color = y % (gridSize * 10) === 0 ? '#d0d0d0' : '#e8e8e8';
      content += `<line x1="0" y1="${y}" x2="${canvasWidth}" y2="${y}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    }
    
    content += '</g>';
  }
  
  // Elements
  content += '<g class="elements-layer">';
  project.elements.forEach(el => {
    const layer = project.layers.find(l => l.id === el.layerId);
    if (layer && !layer.visible) return;
    
    const isSelected = AppState.selectedElements.some(s => s.id === el.id);
    const stroke = el.stroke || '#000000';
    const strokeWidth = el.strokeWidth || 1;
    
    content += renderElement(el, isSelected, stroke, strokeWidth);
  });
  content += '</g>';
  
  // Current drawing element
  if (AppState.currentElement) {
    content += '<g class="current-element">';
    content += renderElement(AppState.currentElement, false, AppState.currentElement.stroke, AppState.currentElement.strokeWidth);
    content += '</g>';
  }
  
  // Polyline preview
  if (AppState.activeTool === 'polyline' && AppState.polylinePoints.length > 0) {
    content += '<g class="polyline-preview">';
    const points = AppState.polylinePoints;
    for (let i = 0; i < points.length - 1; i++) {
      content += `<line x1="${points[i].x}" y1="${points[i].y}" x2="${points[i+1].x}" y2="${points[i+1].y}" 
                        stroke="#00ff00" stroke-width="1"/>`;
    }
    // Preview line to current mouse
    if (AppState.mouseCoords && points.length > 0) {
      const last = points[points.length - 1];
      content += `<line x1="${last.x}" y1="${last.y}" x2="${AppState.mouseCoords.x}" y2="${AppState.mouseCoords.y}" 
                        stroke="#00ff00" stroke-width="1" stroke-dasharray="5,5"/>`;
    }
    content += '</g>';
  }
  
  // Selection grips
  if (AppState.selectedElements.length > 0) {
    content += renderGrips();
  }
  
  svg.innerHTML = content;
}

function renderElement(el, isSelected, stroke, strokeWidth) {
  let svg = '';
  const selectionStyle = isSelected ? `filter="url(#glow)" stroke-dasharray=""` : '';
  const selColor = isSelected ? '#3b82f6' : stroke;
  
  switch (el.type) {
    case 'line':
      svg += `<line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" 
                    stroke="${selColor}" stroke-width="${strokeWidth}" ${selectionStyle}/>`;
      break;
      
    case 'polyline':
      if (el.points && el.points.length >= 2) {
        const pointsStr = el.points.map(p => `${p.x},${p.y}`).join(' ');
        svg += `<polyline points="${pointsStr}" fill="none" 
                          stroke="${selColor}" stroke-width="${strokeWidth}" ${selectionStyle}/>`;
      }
      break;
      
    case 'rectangle':
      svg += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" 
                    fill="${el.fill || 'none'}" stroke="${selColor}" stroke-width="${strokeWidth}" ${selectionStyle}/>`;
      break;
      
    case 'circle':
      svg += `<circle cx="${el.cx}" cy="${el.cy}" r="${el.radius}" 
                      fill="${el.fill || 'none'}" stroke="${selColor}" stroke-width="${strokeWidth}" ${selectionStyle}/>`;
      break;
      
    case 'arc':
      const startRad = Geometry.degToRad(el.startAngle);
      const endRad = Geometry.degToRad(el.endAngle);
      const x1 = el.cx + el.radius * Math.cos(startRad);
      const y1 = el.cy + el.radius * Math.sin(startRad);
      const x2 = el.cx + el.radius * Math.cos(endRad);
      const y2 = el.cy + el.radius * Math.sin(endRad);
      const largeArc = Math.abs(el.endAngle - el.startAngle) > 180 ? 1 : 0;
      const sweep = el.endAngle > el.startAngle ? 1 : 0;
      svg += `<path d="M ${x1} ${y1} A ${el.radius} ${el.radius} 0 ${largeArc} ${sweep} ${x2} ${y2}" 
                    fill="none" stroke="${selColor}" stroke-width="${strokeWidth}" ${selectionStyle}/>`;
      break;
      
    case 'text':
      svg += `<text x="${el.x}" y="${el.y}" fill="${selColor}" 
                    font-size="${el.height || 12}" font-family="Arial">${el.text || ''}</text>`;
      break;
  }
  
  return svg;
}

function renderGrips() {
  let svg = '<g class="grips-layer">';
  
  AppState.selectedElements.forEach(el => {
    const bounds = Geometry.getElementBounds(el);
    if (!bounds) return;
    
    const gripSize = 6 / AppState.zoom;
    const grips = [
      { x: bounds.minX, y: bounds.minY, cursor: 'nw-resize', type: 'corner' },
      { x: bounds.maxX, y: bounds.minY, cursor: 'ne-resize', type: 'corner' },
      { x: bounds.maxX, y: bounds.maxY, cursor: 'se-resize', type: 'corner' },
      { x: bounds.minX, y: bounds.maxY, cursor: 'sw-resize', type: 'corner' },
      { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY, cursor: 'n-resize', type: 'edge' },
      { x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2, cursor: 'e-resize', type: 'edge' },
      { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY, cursor: 's-resize', type: 'edge' },
      { x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2, cursor: 'w-resize', type: 'edge' },
    ];
    
    // Bounding box
    svg += `<rect x="${bounds.minX}" y="${bounds.minY}" 
                  width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" 
                  fill="none" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4,4"/>`;
    
    // Grips
    grips.forEach(grip => {
      svg += `<rect x="${grip.x - gripSize/2}" y="${grip.y - gripSize/2}" 
                    width="${gripSize}" height="${gripSize}" 
                    fill="#3b82f6" stroke="#ffffff" stroke-width="1" 
                    style="cursor:${grip.cursor}" data-grip="${grip.type}"/>`;
    });
    
    // Rotate handle
    const rotateY = bounds.minY - 20 / AppState.zoom;
    svg += `<line x1="${(bounds.minX + bounds.maxX) / 2}" y1="${bounds.minY}" 
                  x2="${(bounds.minX + bounds.maxX) / 2}" y2="${rotateY}" 
                  stroke="#22c55e" stroke-width="1"/>`;
    svg += `<circle cx="${(bounds.minX + bounds.maxX) / 2}" cy="${rotateY}" r="${gripSize/2}" 
                    fill="#22c55e" stroke="#ffffff" stroke-width="1" style="cursor:grab" data-grip="rotate"/>`;
  });
  
  svg += '</g>';
  return svg;
}

// ==================== EVENT SETUP ====================
function setupEventListeners() {
  // Keyboard events
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  
  // Prevent context menu
  document.addEventListener('contextmenu', e => e.preventDefault());
}

function setupCanvasEvents() {
  const container = document.getElementById('canvasContainer');
  const canvas = document.getElementById('cadCanvas');
  
  if (!container || !canvas) return;
  
  canvas.addEventListener('mousedown', handleCanvasMouseDown);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('mouseup', handleCanvasMouseUp);
  canvas.addEventListener('wheel', handleCanvasWheel);
  canvas.addEventListener('dblclick', handleCanvasDoubleClick);
  
  container.addEventListener('mouseleave', handleCanvasMouseUp);
}

// ==================== MOUSE HANDLERS ====================
function getCanvasCoords(e) {
  const canvas = document.getElementById('cadCanvas');
  const rect = canvas.getBoundingClientRect();
  
  let x = (e.clientX - rect.left) / AppState.zoom;
  let y = (e.clientY - rect.top) / AppState.zoom;
  
  return { x, y };
}

function handleCanvasMouseDown(e) {
  const coords = getCanvasCoords(e);
  const snappedCoords = getSnappedCoords(coords);
  
  // Middle mouse button = pan
  if (e.button === 1) {
    AppState.isPanning = true;
    AppState.panStart = { x: e.clientX - AppState.panX, y: e.clientY - AppState.panY };
    return;
  }
  
  // Right click = cancel
  if (e.button === 2) {
    cancelCurrentOperation();
    return;
  }
  
  switch (AppState.activeTool) {
    case 'select':
      handleSelectMouseDown(coords, e);
      break;
    case 'pan':
      AppState.isPanning = true;
      AppState.panStart = { x: e.clientX - AppState.panX, y: e.clientY - AppState.panY };
      break;
    case 'line':
      handleLineMouseDown(snappedCoords);
      break;
    case 'polyline':
      handlePolylineMouseDown(snappedCoords);
      break;
    case 'rectangle':
      handleRectangleMouseDown(snappedCoords);
      break;
    case 'circle':
      handleCircleMouseDown(snappedCoords);
      break;
    case 'arc':
      handleArcMouseDown(snappedCoords);
      break;
    case 'text':
      handleTextMouseDown(snappedCoords);
      break;
    case 'split':
      handleSplitMouseDown(coords);
      break;
    case 'trim':
      handleTrimMouseDown(coords);
      break;
    case 'extend':
      handleExtendMouseDown(coords);
      break;
    case 'move':
      handleMoveMouseDown(snappedCoords);
      break;
    case 'delete':
      handleDeleteMouseDown(coords);
      break;
  }
}

function handleCanvasMouseMove(e) {
  const coords = getCanvasCoords(e);
  AppState.mouseCoords = coords;
  
  // Update snap
  if (AppState.project.settings.snapEnabled) {
    const snap = AppState.snapSystem.findSnapPoint(
      coords,
      AppState.project.elements,
      AppState.zoom,
      AppState.referencePoint
    );
    AppState.currentSnap = snap;
  } else {
    AppState.currentSnap = null;
  }
  
  // Panning
  if (AppState.isPanning) {
    AppState.panX = e.clientX - AppState.panStart.x;
    AppState.panY = e.clientY - AppState.panStart.y;
    updateCanvasTransform();
    return;
  }
  
  const snappedCoords = getSnappedCoords(coords);
  
  // Drawing operations
  switch (AppState.activeTool) {
    case 'select':
      handleSelectMouseMove(coords);
      break;
    case 'line':
      handleLineMouseMove(snappedCoords);
      break;
    case 'rectangle':
      handleRectangleMouseMove(snappedCoords);
      break;
    case 'circle':
      handleCircleMouseMove(snappedCoords);
      break;
    case 'arc':
      handleArcMouseMove(snappedCoords);
      break;
    case 'move':
      handleMoveMouseMove(snappedCoords);
      break;
  }
  
  // Update heads-up display
  updateHeadsUpDisplay(e.clientX, e.clientY);
  
  // Update status bar
  updateStatusBar();
}

function handleCanvasMouseUp(e) {
  if (AppState.isPanning) {
    AppState.isPanning = false;
    return;
  }
  
  const coords = getCanvasCoords(e);
  const snappedCoords = getSnappedCoords(coords);
  
  switch (AppState.activeTool) {
    case 'select':
      handleSelectMouseUp(coords);
      break;
    case 'line':
      handleLineMouseUp(snappedCoords);
      break;
    case 'rectangle':
      handleRectangleMouseUp(snappedCoords);
      break;
    case 'circle':
      handleCircleMouseUp(snappedCoords);
      break;
    case 'arc':
      handleArcMouseUp(snappedCoords);
      break;
    case 'move':
      handleMoveMouseUp(snappedCoords);
      break;
  }
}

function handleCanvasWheel(e) {
  e.preventDefault();
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.1, Math.min(10, AppState.zoom * delta));
  
  // Zoom towards mouse position
  const rect = e.target.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const dx = mouseX - AppState.panX;
  const dy = mouseY - AppState.panY;
  
  AppState.panX = mouseX - dx * (newZoom / AppState.zoom);
  AppState.panY = mouseY - dy * (newZoom / AppState.zoom);
  AppState.zoom = newZoom;
  
  updateCanvasTransform();
  renderApp();
}

function handleCanvasDoubleClick(e) {
  const coords = getCanvasCoords(e);
  
  if (AppState.activeTool === 'polyline' && AppState.polylinePoints.length >= 2) {
    finishPolyline();
  }
}

// ==================== KEYBOARD HANDLERS ====================
function handleKeyDown(e) {
  // Tool shortcuts
  if (!e.ctrlKey && !e.altKey) {
    switch (e.key.toLowerCase()) {
      case 'v': setTool('select'); break;
      case 'h': setTool('pan'); break;
      case 'l': setTool('line'); break;
      case 'r': setTool('rectangle'); break;
      case 'c': setTool('circle'); break;
      case 'a': setTool('arc'); break;
      case 't': setTool('text'); break;
      case 'm': setTool('move'); break;
      case 'escape':
        cancelCurrentOperation();
        break;
      case 'delete':
      case 'backspace':
        deleteSelected();
        break;
      case 'enter':
        if (AppState.activeTool === 'polyline') {
          finishPolyline();
        }
        break;
      case 'f8':
        e.preventDefault();
        toggleOrtho();
        break;
      case 'f10':
        e.preventDefault();
        togglePolar();
        break;
    }
  }
  
  // Ctrl shortcuts
  if (e.ctrlKey) {
    switch (e.key.toLowerCase()) {
      case 'z':
        e.preventDefault();
        handleUndo();
        break;
      case 'y':
        e.preventDefault();
        handleRedo();
        break;
      case 's':
        e.preventDefault();
        handleSave();
        break;
      case 'o':
        e.preventDefault();
        handleOpen();
        break;
      case 'n':
        e.preventDefault();
        handleNew();
        break;
      case 'a':
        e.preventDefault();
        selectAll();
        break;
    }
  }
  
  // Shift for multi-select
  AppState.shiftKey = e.shiftKey;
}

function handleKeyUp(e) {
  AppState.shiftKey = e.shiftKey;
}

// ==================== HELPER FUNCTIONS ====================
function getSnappedCoords(coords) {
  let result = { ...coords };
  
  // Apply snap
  if (AppState.currentSnap) {
    result = { ...AppState.currentSnap.point };
  }
  
  // Apply ortho/polar constraints
  if (AppState.referencePoint) {
    if (AppState.orthoEnabled) {
      result = Geometry.applyOrtho(AppState.referencePoint, result);
    } else if (AppState.polarEnabled) {
      result = Geometry.applyPolar(AppState.referencePoint, result, AppState.polarIncrement);
    }
  }
  
  return result;
}

function updateCanvasTransform() {
  const wrapper = document.getElementById('canvasWrapper');
  if (wrapper) {
    wrapper.style.transform = `translate(${AppState.panX}px, ${AppState.panY}px) scale(${AppState.zoom})`;
  }
}

function updateStatusBar() {
  const statusBar = document.querySelector('.status-bar');
  if (statusBar) {
    statusBar.innerHTML = renderStatusBar().replace('<div class="status-bar">', '').replace('</div>', '');
  }
}

function updateHeadsUpDisplay(clientX, clientY) {
  if (!AppState.isDrawing || !AppState.drawStart) {
    AppState.showHeadsUp = false;
    return;
  }
  
  const snapped = getSnappedCoords(AppState.mouseCoords);
  
  AppState.showHeadsUp = true;
  AppState.headsUpPosition = { x: clientX, y: clientY };
  
  const dx = snapped.x - AppState.drawStart.x;
  const dy = snapped.y - AppState.drawStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Geometry.radToDeg(Math.atan2(dy, dx));
  
  AppState.headsUpData = {
    length,
    angle: Geometry.normalizeAngle(angle),
    dx,
    dy
  };
  
  // Re-render heads-up only
  const existingHU = document.querySelector('.heads-up-input');
  if (existingHU) {
    existingHU.outerHTML = renderHeadsUpInput();
  } else if (AppState.showHeadsUp) {
    const container = document.querySelector('.app-container');
    if (container) {
      container.insertAdjacentHTML('beforeend', renderHeadsUpInput());
    }
  }
}

function cancelCurrentOperation() {
  AppState.isDrawing = false;
  AppState.drawStart = null;
  AppState.currentElement = null;
  AppState.polylinePoints = [];
  AppState.selectionBox = null;
  AppState.referencePoint = null;
  AppState.showHeadsUp = false;
  AppState.editMode = null;
  AppState.cuttingEdges = [];
  
  if (AppState.activeTool !== 'select') {
    setTool('select');
  }
  
  drawCanvas();
}

function generateId() {
  return 'el_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

// ==================== HISTORY ====================
function saveHistory() {
  // Remove future history if we're not at the end
  AppState.history = AppState.history.slice(0, AppState.historyIndex + 1);
  
  // Save current state
  const state = JSON.stringify({
    elements: AppState.project.elements,
    layers: AppState.project.layers
  });
  
  AppState.history.push(state);
  AppState.historyIndex = AppState.history.length - 1;
  AppState.isModified = true;
  
  // Limit history size
  if (AppState.history.length > 50) {
    AppState.history.shift();
    AppState.historyIndex--;
  }
}

function handleUndo() {
  if (AppState.historyIndex <= 0) return;
  
  AppState.historyIndex--;
  const state = JSON.parse(AppState.history[AppState.historyIndex]);
  AppState.project.elements = state.elements;
  AppState.project.layers = state.layers;
  AppState.selectedElements = [];
  
  renderApp();
}

function handleRedo() {
  if (AppState.historyIndex >= AppState.history.length - 1) return;
  
  AppState.historyIndex++;
  const state = JSON.parse(AppState.history[AppState.historyIndex]);
  AppState.project.elements = state.elements;
  AppState.project.layers = state.layers;
  AppState.selectedElements = [];
  
  renderApp();
}
// ==================== HYDRODRAW CAD - PART 3 ====================
// Tool Handlers & Drawing Operations

// ==================== SELECTION TOOL ====================
function handleSelectMouseDown(coords, e) {
  // Check if clicking on an element
  const element = findElementAtPoint(coords);
  
  if (element) {
    // Check if layer is locked
    const layer = AppState.project.layers.find(l => l.id === element.layerId);
    if (layer && layer.locked) return;
    
    if (AppState.shiftKey) {
      // Toggle selection
      const idx = AppState.selectedElements.findIndex(el => el.id === element.id);
      if (idx >= 0) {
        AppState.selectedElements.splice(idx, 1);
      } else {
        AppState.selectedElements.push(element);
      }
    } else {
      // Single select
      if (!AppState.selectedElements.some(el => el.id === element.id)) {
        AppState.selectedElements = [element];
      }
      // Start drag move
      AppState.isDragging = true;
      AppState.dragStart = coords;
    }
  } else {
    // Start selection box
    if (!AppState.shiftKey) {
      AppState.selectedElements = [];
    }
    AppState.selectionBox = {
      x1: coords.x, y1: coords.y,
      x2: coords.x, y2: coords.y
    };
  }
  
  drawCanvas();
  renderApp();
}

function handleSelectMouseMove(coords) {
  if (AppState.selectionBox) {
    AppState.selectionBox.x2 = coords.x;
    AppState.selectionBox.y2 = coords.y;
    renderApp();
  } else if (AppState.isDragging && AppState.selectedElements.length > 0) {
    const dx = coords.x - AppState.dragStart.x;
    const dy = coords.y - AppState.dragStart.y;
    
    AppState.selectedElements.forEach(el => {
      moveElement(el, dx, dy);
    });
    
    AppState.dragStart = coords;
    drawCanvas();
  }
}

function handleSelectMouseUp(coords) {
  if (AppState.selectionBox) {
    // Select elements in box
    const box = AppState.selectionBox;
    const isWindow = box.x2 > box.x1;
    
    const selectionRect = {
      minX: Math.min(box.x1, box.x2),
      minY: Math.min(box.y1, box.y2),
      maxX: Math.max(box.x1, box.x2),
      maxY: Math.max(box.y1, box.y2)
    };
    
    AppState.project.elements.forEach(el => {
      const layer = AppState.project.layers.find(l => l.id === el.layerId);
      if (layer && (layer.locked || !layer.visible)) return;
      
      const bounds = Geometry.getElementBounds(el);
      if (!bounds) return;
      
      let selected = false;
      if (isWindow) {
        // Window selection - element must be completely inside
        selected = Geometry.rectContains(selectionRect, bounds);
      } else {
        // Crossing selection - element must intersect
        selected = Geometry.rectsIntersect(selectionRect, bounds);
      }
      
      if (selected && !AppState.selectedElements.some(s => s.id === el.id)) {
        AppState.selectedElements.push(el);
      }
    });
    
    AppState.selectionBox = null;
  }
  
  if (AppState.isDragging) {
    AppState.isDragging = false;
    saveHistory();
  }
  
  renderApp();
}

function findElementAtPoint(point) {
  const tolerance = 5 / AppState.zoom;
  
  // Search in reverse order (top elements first)
  for (let i = AppState.project.elements.length - 1; i >= 0; i--) {
    const el = AppState.project.elements[i];
    const layer = AppState.project.layers.find(l => l.id === el.layerId);
    if (layer && !layer.visible) continue;
    
    if (isPointOnElement(point, el, tolerance)) {
      return el;
    }
  }
  return null;
}

function isPointOnElement(point, el, tolerance) {
  switch (el.type) {
    case 'line':
      return Geometry.pointToLineDistance(point, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) < tolerance;
    case 'polyline':
      if (!el.points || el.points.length < 2) return false;
      for (let i = 0; i < el.points.length - 1; i++) {
        if (Geometry.pointToLineDistance(point, el.points[i], el.points[i + 1]) < tolerance) {
          return true;
        }
      }
      return false;
    case 'rectangle':
      const bounds = { minX: el.x, minY: el.y, maxX: el.x + el.width, maxY: el.y + el.height };
      // Check edges
      const edges = [
        [{ x: bounds.minX, y: bounds.minY }, { x: bounds.maxX, y: bounds.minY }],
        [{ x: bounds.maxX, y: bounds.minY }, { x: bounds.maxX, y: bounds.maxY }],
        [{ x: bounds.maxX, y: bounds.maxY }, { x: bounds.minX, y: bounds.maxY }],
        [{ x: bounds.minX, y: bounds.maxY }, { x: bounds.minX, y: bounds.minY }]
      ];
      for (const edge of edges) {
        if (Geometry.pointToLineDistance(point, edge[0], edge[1]) < tolerance) return true;
      }
      return false;
    case 'circle':
      return Geometry.pointToCircleDistance(point, { x: el.cx, y: el.cy }, el.radius) < tolerance;
    case 'text':
      const textBounds = Geometry.getElementBounds(el);
      return Geometry.pointInRect(point, textBounds);
    default:
      return false;
  }
}

function moveElement(el, dx, dy) {
  switch (el.type) {
    case 'line':
      el.x1 += dx; el.y1 += dy;
      el.x2 += dx; el.y2 += dy;
      break;
    case 'polyline':
      el.points.forEach(p => {
        p.x += dx; p.y += dy;
      });
      break;
    case 'rectangle':
    case 'text':
      el.x += dx; el.y += dy;
      break;
    case 'circle':
    case 'arc':
      el.cx += dx; el.cy += dy;
      break;
  }
}

function selectAll() {
  AppState.selectedElements = AppState.project.elements.filter(el => {
    const layer = AppState.project.layers.find(l => l.id === el.layerId);
    return layer && layer.visible && !layer.locked;
  });
  renderApp();
}

function deleteSelected() {
  if (AppState.selectedElements.length === 0) return;
  
  const ids = AppState.selectedElements.map(el => el.id);
  AppState.project.elements = AppState.project.elements.filter(el => !ids.includes(el.id));
  AppState.selectedElements = [];
  
  saveHistory();
  renderApp();
}

// ==================== LINE TOOL ====================
function handleLineMouseDown(coords) {
  if (!AppState.isDrawing) {
    AppState.isDrawing = true;
    AppState.drawStart = coords;
    AppState.referencePoint = coords;
    AppState.currentElement = {
      id: generateId(),
      type: 'line',
      x1: coords.x, y1: coords.y,
      x2: coords.x, y2: coords.y,
      stroke: AppState.project.defaultStroke || '#000000',
      strokeWidth: AppState.project.defaultStrokeWidth || 1,
      layerId: AppState.activeLayerId
    };
  }
}

function handleLineMouseMove(coords) {
  if (AppState.isDrawing && AppState.currentElement) {
    AppState.currentElement.x2 = coords.x;
    AppState.currentElement.y2 = coords.y;
    drawCanvas();
  }
}

function handleLineMouseUp(coords) {
  if (AppState.isDrawing && AppState.currentElement) {
    AppState.currentElement.x2 = coords.x;
    AppState.currentElement.y2 = coords.y;
    
    // Only add if line has length
    const length = Geometry.distance(
      { x: AppState.currentElement.x1, y: AppState.currentElement.y1 },
      { x: AppState.currentElement.x2, y: AppState.currentElement.y2 }
    );
    
    if (length > 1) {
      AppState.project.elements.push(AppState.currentElement);
      saveHistory();
    }
    
    AppState.isDrawing = false;
    AppState.currentElement = null;
    AppState.drawStart = null;
    AppState.referencePoint = null;
    AppState.showHeadsUp = false;
    
    drawCanvas();
    renderApp();
  }
}

// ==================== POLYLINE TOOL ====================
function handlePolylineMouseDown(coords) {
  if (AppState.polylinePoints.length === 0) {
    AppState.referencePoint = coords;
  }
  
  AppState.polylinePoints.push(coords);
  AppState.referencePoint = coords;
  AppState.isDrawing = true;
  AppState.drawStart = coords;
  
  drawCanvas();
}

function finishPolyline() {
  if (AppState.polylinePoints.length >= 2) {
    const polyline = {
      id: generateId(),
      type: 'polyline',
      points: [...AppState.polylinePoints],
      closed: false,
      stroke: AppState.project.defaultStroke || '#000000',
      strokeWidth: AppState.project.defaultStrokeWidth || 1,
      layerId: AppState.activeLayerId
    };
    
    AppState.project.elements.push(polyline);
    saveHistory();
  }
  
  AppState.polylinePoints = [];
  AppState.isDrawing = false;
  AppState.referencePoint = null;
  AppState.showHeadsUp = false;
  
  drawCanvas();
  renderApp();
}

// ==================== RECTANGLE TOOL ====================
function handleRectangleMouseDown(coords) {
  if (!AppState.isDrawing) {
    AppState.isDrawing = true;
    AppState.drawStart = coords;
    AppState.currentElement = {
      id: generateId(),
      type: 'rectangle',
      x: coords.x, y: coords.y,
      width: 0, height: 0,
      stroke: AppState.project.defaultStroke || '#000000',
      strokeWidth: AppState.project.defaultStrokeWidth || 1,
      fill: 'none',
      layerId: AppState.activeLayerId
    };
  }
}

function handleRectangleMouseMove(coords) {
  if (AppState.isDrawing && AppState.currentElement) {
    const width = coords.x - AppState.drawStart.x;
    const height = coords.y - AppState.drawStart.y;
    
    AppState.currentElement.x = width >= 0 ? AppState.drawStart.x : coords.x;
    AppState.currentElement.y = height >= 0 ? AppState.drawStart.y : coords.y;
    AppState.currentElement.width = Math.abs(width);
    AppState.currentElement.height = Math.abs(height);
    
    drawCanvas();
  }
}

function handleRectangleMouseUp(coords) {
  if (AppState.isDrawing && AppState.currentElement) {
    if (AppState.currentElement.width > 1 && AppState.currentElement.height > 1) {
      AppState.project.elements.push(AppState.currentElement);
      saveHistory();
    }
    
    AppState.isDrawing = false;
    AppState.currentElement = null;
    AppState.drawStart = null;
    
    drawCanvas();
    renderApp();
  }
}

// ==================== CIRCLE TOOL ====================
function handleCircleMouseDown(coords) {
  if (!AppState.isDrawing) {
    AppState.isDrawing = true;
    AppState.drawStart = coords;
    AppState.referencePoint = coords;
    AppState.currentElement = {
      id: generateId(),
      type: 'circle',
      cx: coords.x, cy: coords.y,
      radius: 0,
      stroke: AppState.project.defaultStroke || '#000000',
      strokeWidth: AppState.project.defaultStrokeWidth || 1,
      fill: 'none',
      layerId: AppState.activeLayerId
    };
  }
}

function handleCircleMouseMove(coords) {
  if (AppState.isDrawing && AppState.currentElement) {
    AppState.currentElement.radius = Geometry.distance(AppState.drawStart, coords);
    drawCanvas();
  }
}

function handleCircleMouseUp(coords) {
  if (AppState.isDrawing && AppState.currentElement) {
    if (AppState.currentElement.radius > 1) {
      AppState.project.elements.push(AppState.currentElement);
      saveHistory();
    }
    
    AppState.isDrawing = false;
    AppState.currentElement = null;
    AppState.drawStart = null;
    AppState.referencePoint = null;
    
    drawCanvas();
    renderApp();
  }
}

// ==================== ARC TOOL ====================
let arcPhase = 0; // 0 = center, 1 = radius, 2 = start angle, 3 = end angle
let arcCenter = null;
let arcRadius = 0;
let arcStartAngle = 0;

function handleArcMouseDown(coords) {
  switch (arcPhase) {
    case 0: // Set center
      arcCenter = coords;
      arcPhase = 1;
      break;
    case 1: // Set radius and start angle
      arcRadius = Geometry.distance(arcCenter, coords);
      arcStartAngle = Geometry.radToDeg(Math.atan2(coords.y - arcCenter.y, coords.x - arcCenter.x));
      arcPhase = 2;
      AppState.currentElement = {
        id: generateId(),
        type: 'arc',
        cx: arcCenter.x, cy: arcCenter.y,
        radius: arcRadius,
        startAngle: arcStartAngle,
        endAngle: arcStartAngle,
        stroke: AppState.project.defaultStroke || '#000000',
        strokeWidth: AppState.project.defaultStrokeWidth || 1,
        layerId: AppState.activeLayerId
      };
      break;
    case 2: // Set end angle and finish
      const endAngle = Geometry.radToDeg(Math.atan2(coords.y - arcCenter.y, coords.x - arcCenter.x));
      AppState.currentElement.endAngle = endAngle;
      AppState.project.elements.push(AppState.currentElement);
      saveHistory();
      
      // Reset
      arcPhase = 0;
      arcCenter = null;
      AppState.currentElement = null;
      drawCanvas();
      renderApp();
      break;
  }
}

function handleArcMouseMove(coords) {
  if (arcPhase === 2 && AppState.currentElement) {
    const endAngle = Geometry.radToDeg(Math.atan2(coords.y - arcCenter.y, coords.x - arcCenter.x));
    AppState.currentElement.endAngle = endAngle;
    drawCanvas();
  }
}

function handleArcMouseUp(coords) {
  // Arc is handled in mousedown
}

// ==================== TEXT TOOL ====================
function handleTextMouseDown(coords) {
  const text = prompt('Enter text:', '');
  if (text) {
    const textElement = {
      id: generateId(),
      type: 'text',
      x: coords.x,
      y: coords.y,
      text: text,
      height: 20,
      rotation: 0,
      stroke: AppState.project.defaultStroke || '#000000',
      layerId: AppState.activeLayerId
    };
    
    AppState.project.elements.push(textElement);
    saveHistory();
    drawCanvas();
    renderApp();
  }
}

// ==================== MOVE TOOL ====================
function handleMoveMouseDown(coords) {
  if (AppState.selectedElements.length === 0) {
    // Select element first
    const element = findElementAtPoint(coords);
    if (element) {
      AppState.selectedElements = [element];
    }
  }
  
  if (AppState.selectedElements.length > 0) {
    AppState.isDrawing = true;
    AppState.drawStart = coords;
    AppState.referencePoint = coords;
  }
}

function handleMoveMouseMove(coords) {
  if (AppState.isDrawing && AppState.selectedElements.length > 0) {
    const dx = coords.x - AppState.drawStart.x;
    const dy = coords.y - AppState.drawStart.y;
    
    AppState.selectedElements.forEach(el => {
      moveElement(el, dx, dy);
    });
    
    AppState.drawStart = coords;
    drawCanvas();
  }
}

function handleMoveMouseUp(coords) {
  if (AppState.isDrawing) {
    AppState.isDrawing = false;
    AppState.drawStart = null;
    AppState.referencePoint = null;
    saveHistory();
    renderApp();
  }
}

// ==================== DELETE TOOL ====================
function handleDeleteMouseDown(coords) {
  const element = findElementAtPoint(coords);
  if (element) {
    const layer = AppState.project.layers.find(l => l.id === element.layerId);
    if (layer && layer.locked) return;
    
    AppState.project.elements = AppState.project.elements.filter(el => el.id !== element.id);
    saveHistory();
    drawCanvas();
    renderApp();
  }
}

// ==================== SPLIT TOOL ====================
function handleSplitMouseDown(coords) {
  const element = findElementAtPoint(coords);
  if (!element) return;
  
  const layer = AppState.project.layers.find(l => l.id === element.layerId);
  if (layer && layer.locked) return;
  
  // Find intersection point with other elements
  const intersections = AppState.editingTools.findIntersections(element, AppState.project.elements);
  
  if (intersections.length > 0) {
    // Find nearest intersection to click
    let nearest = intersections[0];
    let nearestDist = Geometry.distance(coords, nearest);
    
    intersections.forEach(int => {
      const dist = Geometry.distance(coords, int);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = int;
      }
    });
    
    // Split at nearest intersection
    const splits = AppState.editingTools.splitAtPoint(element, nearest);
    
    if (splits.length > 1) {
      // Remove original and add splits
      AppState.project.elements = AppState.project.elements.filter(el => el.id !== element.id);
      AppState.project.elements.push(...splits);
      saveHistory();
    }
  }
  
  drawCanvas();
  renderApp();
}

// ==================== TRIM TOOL ====================
function handleTrimMouseDown(coords) {
  if (AppState.cuttingEdges.length === 0) {
    // First click: select cutting edge
    const element = findElementAtPoint(coords);
    if (element) {
      AppState.cuttingEdges.push(element);
      AppState.selectedElements = [element];
      renderApp();
      return;
    }
  }
  
  // Subsequent clicks: trim elements
  const element = findElementAtPoint(coords);
  if (element && !AppState.cuttingEdges.includes(element)) {
    const trimmed = AppState.editingTools.trimElement(
      element, coords, AppState.cuttingEdges, AppState.project.elements
    );
    
    // Remove original and add trimmed
    AppState.project.elements = AppState.project.elements.filter(el => el.id !== element.id);
    AppState.project.elements.push(...trimmed);
    saveHistory();
    drawCanvas();
    renderApp();
  }
}

// ==================== EXTEND TOOL ====================
function handleExtendMouseDown(coords) {
  if (AppState.cuttingEdges.length === 0) {
    // First click: select boundary
    const element = findElementAtPoint(coords);
    if (element) {
      AppState.cuttingEdges.push(element);
      AppState.selectedElements = [element];
      renderApp();
      return;
    }
  }
  
  // Subsequent clicks: extend elements
  const element = findElementAtPoint(coords);
  if (element && !AppState.cuttingEdges.includes(element)) {
    const extended = AppState.editingTools.extendElement(element, AppState.cuttingEdges);
    
    // Update element
    const idx = AppState.project.elements.findIndex(el => el.id === element.id);
    if (idx >= 0) {
      AppState.project.elements[idx] = extended;
      saveHistory();
      drawCanvas();
      renderApp();
    }
  }
}
// ==================== HYDRODRAW CAD - PART 4 ====================
// File Operations, Layer Management, UI Actions

// ==================== FILE OPERATIONS ====================
async function handleNew() {
  if (AppState.isModified) {
    const confirm = window.confirm('Discard unsaved changes?');
    if (!confirm) return;
  }
  
  if (window.electronAPI) {
    await window.electronAPI.newFile();
  }
  
  AppState.project = HydroFormat.createNew();
  AppState.selectedElements = [];
  AppState.history = [];
  AppState.historyIndex = -1;
  AppState.isModified = false;
  AppState.zoom = 1;
  AppState.panX = 0;
  AppState.panY = 0;
  
  saveHistory();
  renderApp();
}

async function handleOpen() {
  if (window.electronAPI) {
    const result = await window.electronAPI.openFile();
    
    if (result.success) {
      if (result.format === 'dxf') {
        // Import DXF
        const imported = HydroFormat.importDXF(result.content);
        if (imported.success) {
          AppState.project = imported.project;
          if (imported.warnings.length > 0) {
            alert('Import warnings:\n' + imported.warnings.join('\n'));
          }
        }
      } else {
        // Open .hydro
        const parsed = HydroFormat.parse(result.content);
        if (parsed.success) {
          AppState.project = parsed.project;
        } else {
          alert('Error opening file: ' + parsed.error);
          return;
        }
      }
      
      AppState.selectedElements = [];
      AppState.history = [];
      AppState.historyIndex = -1;
      AppState.isModified = false;
      AppState.activeLayerId = AppState.project.layers[0]?.id || 'layer_0';
      
      saveHistory();
      renderApp();
    }
  } else {
    // Browser fallback - file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.hydro,.dxf';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const content = await file.text();
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (ext === 'dxf') {
        const imported = HydroFormat.importDXF(content);
        if (imported.success) {
          AppState.project = imported.project;
        }
      } else {
        const parsed = HydroFormat.parse(content);
        if (parsed.success) {
          AppState.project = parsed.project;
        }
      }
      
      AppState.selectedElements = [];
      AppState.history = [];
      saveHistory();
      renderApp();
    };
    input.click();
  }
}

async function handleSave() {
  const data = HydroFormat.serialize(AppState.project);
  
  if (window.electronAPI) {
    const result = await window.electronAPI.saveFile(data);
    if (result.success) {
      AppState.isModified = false;
      renderApp();
    } else if (result.error) {
      alert('Error saving: ' + result.error);
    }
  } else {
    // Browser fallback - download
    downloadFile(data, 'drawing.hydro', 'application/json');
  }
}

async function handleSaveAs() {
  const data = HydroFormat.serialize(AppState.project);
  
  if (window.electronAPI) {
    const result = await window.electronAPI.saveFileAs(data);
    if (result.success) {
      AppState.isModified = false;
      renderApp();
    }
  } else {
    downloadFile(data, 'drawing.hydro', 'application/json');
  }
}

async function handleImportDXF() {
  if (window.electronAPI) {
    const result = await window.electronAPI.importDXF();
    
    if (result.success) {
      const imported = HydroFormat.importDXF(result.content);
      
      if (imported.success) {
        // Merge imported elements with current project
        imported.project.elements.forEach(el => {
          el.id = generateId(); // New IDs to avoid conflicts
          AppState.project.elements.push(el);
        });
        
        // Merge layers
        imported.project.layers.forEach(layer => {
          if (!AppState.project.layers.some(l => l.name === layer.name)) {
            AppState.project.layers.push(layer);
          }
        });
        
        if (imported.warnings.length > 0) {
          alert('Import completed with warnings:\n' + imported.warnings.join('\n'));
        }
        
        saveHistory();
        renderApp();
      }
    }
  }
}

async function handleExportDXF() {
  const dxfContent = HydroFormat.exportDXF(AppState.project);
  
  if (window.electronAPI) {
    await window.electronAPI.exportDXF(dxfContent);
  } else {
    downloadFile(dxfContent, 'drawing.dxf', 'application/dxf');
  }
}

async function handleExportPNG() {
  const svg = document.getElementById('cadCanvas');
  if (!svg) return;
  
  try {
    const dataUrl = await HydroFormat.exportPNG(svg, '#ffffff');
    
    if (window.electronAPI) {
      await window.electronAPI.exportPNG(dataUrl);
    } else {
      const link = document.createElement('a');
      link.download = 'drawing.png';
      link.href = dataUrl;
      link.click();
    }
  } catch (error) {
    alert('Error exporting PNG: ' + error.message);
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ==================== ZOOM FUNCTIONS ====================
function handleZoomIn() {
  AppState.zoom = Math.min(10, AppState.zoom * 1.25);
  updateCanvasTransform();
  renderApp();
}

function handleZoomOut() {
  AppState.zoom = Math.max(0.1, AppState.zoom / 1.25);
  updateCanvasTransform();
  renderApp();
}

function handleZoomFit() {
  const container = document.getElementById('canvasContainer');
  if (!container) return;
  
  const containerRect = container.getBoundingClientRect();
  const canvasWidth = AppState.project.canvas.width;
  const canvasHeight = AppState.project.canvas.height;
  
  const scaleX = (containerRect.width - 40) / canvasWidth;
  const scaleY = (containerRect.height - 40) / canvasHeight;
  
  AppState.zoom = Math.min(scaleX, scaleY, 1);
  AppState.panX = (containerRect.width - canvasWidth * AppState.zoom) / 2;
  AppState.panY = (containerRect.height - canvasHeight * AppState.zoom) / 2;
  
  updateCanvasTransform();
  renderApp();
}

// ==================== TOGGLE FUNCTIONS ====================
function toggleGrid() {
  AppState.project.settings.gridEnabled = !AppState.project.settings.gridEnabled;
  renderApp();
}

function toggleSnap() {
  AppState.project.settings.snapEnabled = !AppState.project.settings.snapEnabled;
  renderApp();
}

function toggleOrtho() {
  AppState.orthoEnabled = !AppState.orthoEnabled;
  if (AppState.orthoEnabled) AppState.polarEnabled = false;
  renderApp();
}

function togglePolar() {
  AppState.polarEnabled = !AppState.polarEnabled;
  if (AppState.polarEnabled) AppState.orthoEnabled = false;
  renderApp();
}

function toggleSnapType(type) {
  AppState.snapSystem.setEnabled(type, !AppState.snapSystem.enabled[type]);
  renderApp();
}

// ==================== TOOL FUNCTIONS ====================
function setTool(toolId) {
  // Reset state when changing tools
  cancelCurrentOperation();
  
  AppState.activeTool = toolId;
  AppState.cuttingEdges = [];
  
  // Reset arc phase
  arcPhase = 0;
  arcCenter = null;
  
  renderApp();
}

// ==================== LAYER FUNCTIONS ====================
function setActiveLayer(layerId) {
  AppState.activeLayerId = layerId;
  renderApp();
}

function addLayer() {
  const name = prompt('Layer name:', `Layer ${AppState.project.layers.length + 1}`);
  if (!name) return;
  
  const layer = {
    id: 'layer_' + generateId(),
    name: name,
    visible: true,
    locked: false,
    color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
  };
  
  AppState.project.layers.push(layer);
  AppState.activeLayerId = layer.id;
  saveHistory();
  renderApp();
}

function toggleLayerVisibility(layerId) {
  const layer = AppState.project.layers.find(l => l.id === layerId);
  if (layer) {
    layer.visible = !layer.visible;
    drawCanvas();
    renderApp();
  }
}

function toggleLayerLock(layerId) {
  const layer = AppState.project.layers.find(l => l.id === layerId);
  if (layer) {
    layer.locked = !layer.locked;
    renderApp();
  }
}

// ==================== PROPERTY FUNCTIONS ====================
function updateElement(id, prop, value) {
  const element = AppState.project.elements.find(el => el.id === id);
  if (element) {
    element[prop] = value;
    saveHistory();
    drawCanvas();
    renderApp();
  }
}

function setDefaultStroke(color) {
  AppState.project.defaultStroke = color;
}

function setDefaultStrokeWidth(width) {
  AppState.project.defaultStrokeWidth = parseFloat(width);
}

// ==================== HEADS-UP INPUT FUNCTIONS ====================
function handleHeadsUpKey(e) {
  if (e.key === 'Enter') {
    applyHeadsUpInput();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    // Focus next input
    const inputs = document.querySelectorAll('.heads-up-value');
    const current = document.activeElement;
    const idx = Array.from(inputs).indexOf(current);
    if (idx >= 0 && idx < inputs.length - 1) {
      inputs[idx + 1].focus();
    }
  }
}

function applyHeadsUpInput() {
  if (!AppState.isDrawing || !AppState.currentElement || !AppState.drawStart) return;
  
  const lengthInput = document.getElementById('headsUpLength');
  const angleInput = document.getElementById('headsUpAngle');
  
  if (lengthInput && angleInput) {
    const length = parseFloat(lengthInput.value);
    const angle = parseFloat(angleInput.value);
    
    if (!isNaN(length) && !isNaN(angle)) {
      const rad = Geometry.degToRad(angle);
      const endX = AppState.drawStart.x + Math.cos(rad) * length;
      const endY = AppState.drawStart.y + Math.sin(rad) * length;
      
      if (AppState.currentElement.type === 'line') {
        AppState.currentElement.x2 = endX;
        AppState.currentElement.y2 = endY;
        
        // Finish the line
        AppState.project.elements.push(AppState.currentElement);
        saveHistory();
        
        AppState.isDrawing = false;
        AppState.currentElement = null;
        AppState.drawStart = null;
        AppState.showHeadsUp = false;
        
        drawCanvas();
        renderApp();
      }
    }
  }
}

function updateHeadsUpLength(value) {
  const length = parseFloat(value);
  if (isNaN(length) || !AppState.drawStart) return;
  
  // Keep angle, update end point
  const dx = AppState.mouseCoords.x - AppState.drawStart.x;
  const dy = AppState.mouseCoords.y - AppState.drawStart.y;
  const currentAngle = Math.atan2(dy, dx);
  
  if (AppState.currentElement && AppState.currentElement.type === 'line') {
    AppState.currentElement.x2 = AppState.drawStart.x + Math.cos(currentAngle) * length;
    AppState.currentElement.y2 = AppState.drawStart.y + Math.sin(currentAngle) * length;
    drawCanvas();
  }
}

function updateHeadsUpAngle(value) {
  const angle = parseFloat(value);
  if (isNaN(angle) || !AppState.drawStart) return;
  
  // Keep length, update end point
  const dx = AppState.mouseCoords.x - AppState.drawStart.x;
  const dy = AppState.mouseCoords.y - AppState.drawStart.y;
  const currentLength = Math.sqrt(dx * dx + dy * dy);
  const rad = Geometry.degToRad(angle);
  
  if (AppState.currentElement && AppState.currentElement.type === 'line') {
    AppState.currentElement.x2 = AppState.drawStart.x + Math.cos(rad) * currentLength;
    AppState.currentElement.y2 = AppState.drawStart.y + Math.sin(rad) * currentLength;
    drawCanvas();
  }
}

// ==================== GLOBAL EXPORTS ====================
// Make functions available globally for onclick handlers
window.handleNew = handleNew;
window.handleOpen = handleOpen;
window.handleSave = handleSave;
window.handleSaveAs = handleSaveAs;
window.handleImportDXF = handleImportDXF;
window.handleExportDXF = handleExportDXF;
window.handleExportPNG = handleExportPNG;
window.handleUndo = handleUndo;
window.handleRedo = handleRedo;
window.handleZoomIn = handleZoomIn;
window.handleZoomOut = handleZoomOut;
window.handleZoomFit = handleZoomFit;
window.toggleGrid = toggleGrid;
window.toggleSnap = toggleSnap;
window.toggleOrtho = toggleOrtho;
window.togglePolar = togglePolar;
window.toggleSnapType = toggleSnapType;
window.setTool = setTool;
window.setActiveLayer = setActiveLayer;
window.addLayer = addLayer;
window.toggleLayerVisibility = toggleLayerVisibility;
window.toggleLayerLock = toggleLayerLock;
window.updateElement = updateElement;
window.setDefaultStroke = setDefaultStroke;
window.setDefaultStrokeWidth = setDefaultStrokeWidth;
window.handleHeadsUpKey = handleHeadsUpKey;
window.updateHeadsUpLength = updateHeadsUpLength;
window.updateHeadsUpAngle = updateHeadsUpAngle;
