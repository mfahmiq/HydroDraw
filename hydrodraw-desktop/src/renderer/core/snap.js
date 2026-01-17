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
