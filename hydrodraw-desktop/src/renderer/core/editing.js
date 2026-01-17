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
