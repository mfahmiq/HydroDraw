import React, { useEffect, useRef, useState, useCallback } from 'react';
import '@/App.css';

// ==================== GEOMETRY UTILITIES ====================
const EPSILON = 1e-10;

const Geometry = {
  distance: (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)),

  midpoint: (p1, p2) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }),

  radToDeg: (rad) => rad * (180 / Math.PI),

  degToRad: (deg) => deg * (Math.PI / 180),

  normalizeAngle: (angle) => {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  },

  snapAngle: (angle, increment) => Math.round(angle / increment) * increment,

  applyOrtho: (start, end) => {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    return dx > dy ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
  },

  applyPolar: (start, end, increment) => {
    const angle = Geometry.radToDeg(Math.atan2(end.y - start.y, end.x - start.x));
    const snappedAngle = Geometry.snapAngle(angle, increment);
    const dist = Geometry.distance(start, end);
    const rad = Geometry.degToRad(snappedAngle);
    return { x: start.x + Math.cos(rad) * dist, y: start.y + Math.sin(rad) * dist };
  },

  pointToLineDistance: (point, lineStart, lineEnd) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    if (lenSq < EPSILON) return Geometry.distance(point, lineStart);
    let param = Math.max(0, Math.min(1, dot / lenSq));
    return Geometry.distance(point, {
      x: lineStart.x + param * C,
      y: lineStart.y + param * D
    });
  },

  lineLineIntersection: (p1, p2, p3, p4) => {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(d) < EPSILON) return null;
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y), t, u };
    }
    return null;
  },

  pointToCircleDistance: (point, center, radius) =>
    Math.abs(Geometry.distance(point, center) - radius),

  lineCircleIntersection: (p1, p2, center, radius) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const fx = p1.x - center.x;
    const fy = p1.y - center.y;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;
    let disc = b * b - 4 * a * c;
    if (disc < 0) return [];
    disc = Math.sqrt(disc);
    const t1 = (-b - disc) / (2 * a);
    const t2 = (-b + disc) / (2 * a);
    const points = [];
    if (t1 >= 0 && t1 <= 1) points.push({ x: p1.x + t1 * dx, y: p1.y + t1 * dy });
    if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > EPSILON)
      points.push({ x: p1.x + t2 * dx, y: p1.y + t2 * dy });
    return points;
  },

  getElementBounds: (el) => {
    switch (el.type) {
      case 'line':
        return {
          minX: Math.min(el.x1, el.x2), minY: Math.min(el.y1, el.y2),
          maxX: Math.max(el.x1, el.x2), maxY: Math.max(el.y1, el.y2)
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
        return { minX: el.x, minY: el.y, maxX: el.x + el.width, maxY: el.y + el.height };
      case 'circle':
        return {
          minX: el.cx - el.radius, minY: el.cy - el.radius,
          maxX: el.cx + el.radius, maxY: el.cy + el.radius
        };
      case 'arc':
        return {
          minX: el.cx - el.radius, minY: el.cy - el.radius,
          maxX: el.cx + el.radius, maxY: el.cy + el.radius
        };
      case 'text':
        const width = (el.text || '').length * (el.height || 12) * 0.6;
        return { minX: el.x, minY: el.y - (el.height || 12), maxX: el.x + width, maxY: el.y };
      default:
        return null;
    }
  },

  pointInRect: (point, rect) =>
    point.x >= rect.minX && point.x <= rect.maxX && point.y >= rect.minY && point.y <= rect.maxY,

  rectsIntersect: (r1, r2) =>
    !(r1.maxX < r2.minX || r1.minX > r2.maxX || r1.maxY < r2.minY || r1.minY > r2.maxY),

  rectContains: (outer, inner) =>
    inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY
};

// ==================== SNAP SYSTEM ====================
const SnapTypes = {
  GRID: 'grid', ENDPOINT: 'endpoint', MIDPOINT: 'midpoint',
  CENTER: 'center', INTERSECTION: 'intersection',
  PERPENDICULAR: 'perpendicular', TANGENT: 'tangent'
};

class SnapSystem {
  constructor() {
    this.enabled = {
      [SnapTypes.GRID]: true, [SnapTypes.ENDPOINT]: true, [SnapTypes.MIDPOINT]: true,
      [SnapTypes.CENTER]: true, [SnapTypes.INTERSECTION]: true,
      [SnapTypes.PERPENDICULAR]: false, [SnapTypes.TANGENT]: false
    };
    this.gridSize = 10;
    this.snapTolerance = 10;
  }

  findSnapPoint(point, elements, zoom) {
    const tolerance = this.snapTolerance / zoom;
    let bestSnap = null;
    let bestDist = tolerance;

    // Endpoint snap
    if (this.enabled[SnapTypes.ENDPOINT]) {
      elements.forEach(el => {
        const endpoints = this.getEndpoints(el);
        endpoints.forEach(ep => {
          const dist = Geometry.distance(point, ep);
          if (dist < bestDist) {
            bestDist = dist;
            bestSnap = { point: ep, type: SnapTypes.ENDPOINT, distance: dist };
          }
        });
      });
    }

    // Midpoint snap
    if (this.enabled[SnapTypes.MIDPOINT]) {
      elements.forEach(el => {
        if (el.type === 'line') {
          const mid = Geometry.midpoint({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
          const dist = Geometry.distance(point, mid);
          if (dist < bestDist) {
            bestDist = dist;
            bestSnap = { point: mid, type: SnapTypes.MIDPOINT, distance: dist };
          }
        }
      });
    }

    // Center snap
    if (this.enabled[SnapTypes.CENTER]) {
      elements.forEach(el => {
        if (el.type === 'circle' || el.type === 'arc') {
          const center = { x: el.cx, y: el.cy };
          const dist = Geometry.distance(point, center);
          if (dist < bestDist) {
            bestDist = dist;
            bestSnap = { point: center, type: SnapTypes.CENTER, distance: dist };
          }
        }
      });
    }

    // Intersection snap
    if (this.enabled[SnapTypes.INTERSECTION]) {
      for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
          const ints = this.getIntersections(elements[i], elements[j]);
          ints.forEach(ip => {
            const dist = Geometry.distance(point, ip);
            if (dist < bestDist) {
              bestDist = dist;
              bestSnap = { point: ip, type: SnapTypes.INTERSECTION, distance: dist };
            }
          });
        }
      }
    }

    // Grid snap (lowest priority)
    if (this.enabled[SnapTypes.GRID] && !bestSnap) {
      const gridSnap = {
        x: Math.round(point.x / this.gridSize) * this.gridSize,
        y: Math.round(point.y / this.gridSize) * this.gridSize
      };
      const gridDist = Geometry.distance(point, gridSnap);
      if (gridDist < tolerance) {
        bestSnap = { point: gridSnap, type: SnapTypes.GRID, distance: gridDist };
      }
    }

    return bestSnap;
  }

  getEndpoints(el) {
    switch (el.type) {
      case 'line': return [{ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }];
      case 'polyline': return el.points ? [...el.points] : [];
      case 'rectangle': return [
        { x: el.x, y: el.y }, { x: el.x + el.width, y: el.y },
        { x: el.x + el.width, y: el.y + el.height }, { x: el.x, y: el.y + el.height }
      ];
      default: return [];
    }
  }

  getIntersections(el1, el2) {
    const ints = [];
    if (el1.type === 'line' && el2.type === 'line') {
      const int = Geometry.lineLineIntersection(
        { x: el1.x1, y: el1.y1 }, { x: el1.x2, y: el1.y2 },
        { x: el2.x1, y: el2.y1 }, { x: el2.x2, y: el2.y2 }
      );
      if (int) ints.push(int);
    }
    if (el1.type === 'line' && el2.type === 'circle') {
      ints.push(...Geometry.lineCircleIntersection(
        { x: el1.x1, y: el1.y1 }, { x: el1.x2, y: el1.y2 },
        { x: el2.cx, y: el2.cy }, el2.radius
      ));
    }
    return ints;
  }
}

// ==================== ICONS ====================
const Icons = {
  New: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>,
  Open: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  Save: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" /></svg>,
  Export: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Undo: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>,
  Redo: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="23,4 23,10 17,10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
  Select: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>,
  Pan: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" /><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>,
  Line: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="5" y1="19" x2="19" y2="5" /></svg>,
  Polyline: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="3,17 8,12 14,15 21,7" /></svg>,
  Rectangle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>,
  Circle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="9" /></svg>,
  Arc: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 3a9 9 0 0 1 9 9" /><circle cx="12" cy="12" r="2" fill="currentColor" /></svg>,
  Text: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="4,7 4,4 20,4 20,7" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="8" y1="20" x2="16" y2="20" /></svg>,
  Split: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="4" y1="20" x2="12" y2="12" /><line x1="12" y1="12" x2="20" y2="4" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>,
  Trim: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="4" y1="20" x2="10" y2="14" /><line x1="14" y1="10" x2="20" y2="4" strokeDasharray="4,2" /><rect x="8" y="8" width="8" height="8" rx="1" /></svg>,
  Extend: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="4" y1="20" x2="12" y2="12" /><line x1="12" y1="12" x2="20" y2="4" strokeDasharray="4,2" /><polyline points="16,4 20,4 20,8" /></svg>,
  Delete: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  Move: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="5,9 2,12 5,15" /><polyline points="9,5 12,2 15,5" /><polyline points="15,19 12,22 9,19" /><polyline points="19,9 22,12 19,15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></svg>,
  Eye: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  EyeOff: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  Lock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  Unlock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Grid: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  ZoomIn: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>,
  ZoomOut: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>,
};

// Generate ID
const generateId = () => 'el_' + Math.random().toString(36).substr(2, 9);

// ==================== MAIN CAD COMPONENT ====================
function App() {
  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const snapSystemRef = useRef(new SnapSystem());

  // Canvas state
  const [canvasSize] = useState({ width: 2000, height: 1500 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      console.log("👍 beforeinstallprompt fired!");
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Debug log to confirm App.js is the new version
    console.log("🚀 HidroDraw PWA Version 1.1 Loaded");

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  // Elements & Layers
  const [elements, setElements] = useState([]);
  const [layers, setLayers] = useState([
    { id: 'layer_0', name: 'Layer 0', visible: true, locked: false, color: '#FFFFFF' }
  ]);
  const [activeLayerId, setActiveLayerId] = useState('layer_0');

  // Selection
  const [selectedElements, setSelectedElements] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);

  // Tools & Drawing
  const [activeTool, setActiveTool] = useState('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [currentElement, setCurrentElement] = useState(null);
  const [polylinePoints, setPolylinePoints] = useState([]);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  // Snap & Modes
  const [currentSnap, setCurrentSnap] = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [orthoEnabled, setOrthoEnabled] = useState(false);
  const [polarEnabled, setPolarEnabled] = useState(false);
  const [gridSize] = useState(10);
  const [polarIncrement] = useState(15);

  // Drawing settings
  const [strokeColor, setStrokeColor] = useState('#0066CC');
  const [strokeWidth, setStrokeWidth] = useState(2);

  // History
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Heads-up input
  const [showHeadsUp, setShowHeadsUp] = useState(false);
  const [headsUpData, setHeadsUpData] = useState({});
  const [headsUpPos, setHeadsUpPos] = useState({ x: 0, y: 0 });

  // Reference point for ortho/polar
  const [referencePoint, setReferencePoint] = useState(null);

  // Save history
  const saveHistory = useCallback((newElements) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.stringify(newElements));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Initialize history
  useEffect(() => {
    if (history.length === 0) {
      setHistory([JSON.stringify([])]);
      setHistoryIndex(0);
    }
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(JSON.parse(history[historyIndex - 1]));
      setSelectedElements([]);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(JSON.parse(history[historyIndex + 1]));
      setSelectedElements([]);
    }
  }, [history, historyIndex]);

  // Delete selected
  const deleteSelected = useCallback(() => {
    if (selectedElements.length === 0) return;
    const ids = selectedElements.map(el => el.id);
    const newElements = elements.filter(el => !ids.includes(el.id));
    setElements(newElements);
    saveHistory(newElements);
    setSelectedElements([]);
  }, [elements, selectedElements, saveHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z': e.preventDefault(); handleUndo(); break;
          case 'y': e.preventDefault(); handleRedo(); break;
          case 'a': e.preventDefault();
            setSelectedElements(elements.filter(el => {
              const layer = layers.find(l => l.id === el.layerId);
              return layer && layer.visible && !layer.locked;
            }));
            break;
        }
      } else {
        switch (e.key.toLowerCase()) {
          case 'v': setActiveTool('select'); break;
          case 'h': setActiveTool('pan'); break;
          case 'l': setActiveTool('line'); break;
          case 'r': setActiveTool('rectangle'); break;
          case 'c': setActiveTool('circle'); break;
          case 't': setActiveTool('text'); break;
          case 'm': setActiveTool('move'); break;
          case 'escape':
            setSelectedElements([]);
            setCurrentElement(null);
            setIsDrawing(false);
            setPolylinePoints([]);
            setSelectionBox(null);
            setShowHeadsUp(false);
            setActiveTool('select');
            break;
          case 'delete':
          case 'backspace':
            deleteSelected();
            break;
          case 'enter':
            if (activeTool === 'polyline' && polylinePoints.length >= 2) {
              finishPolyline();
            }
            break;
          case 'f8':
            e.preventDefault();
            setOrthoEnabled(o => !o);
            setPolarEnabled(false);
            break;
          case 'f10':
            e.preventDefault();
            setPolarEnabled(p => !p);
            setOrthoEnabled(false);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, deleteSelected, elements, layers, activeTool, polylinePoints]);

  // Get canvas coordinates
  const getCanvasCoords = useCallback((e) => {
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return { x: 0, y: 0 };
    // Account for pan offset and zoom
    return {
      x: (e.clientX - container.left - pan.x) / zoom,
      y: (e.clientY - container.top - pan.y) / zoom
    };
  }, [zoom, pan]);

  // Get snapped coordinates
  const getSnappedCoords = useCallback((coords) => {
    let result = { ...coords };

    if (currentSnap) {
      result = { ...currentSnap.point };
    }

    if (referencePoint) {
      if (orthoEnabled) {
        result = Geometry.applyOrtho(referencePoint, result);
      } else if (polarEnabled) {
        result = Geometry.applyPolar(referencePoint, result, polarIncrement);
      }
    }

    return result;
  }, [currentSnap, referencePoint, orthoEnabled, polarEnabled, polarIncrement]);

  // Find element at point
  const findElementAtPoint = useCallback((point) => {
    const tolerance = 5 / zoom;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const layer = layers.find(l => l.id === el.layerId);
      if (layer && !layer.visible) continue;

      let onElement = false;
      switch (el.type) {
        case 'line':
          onElement = Geometry.pointToLineDistance(point, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) < tolerance;
          break;
        case 'polyline':
          if (el.points && el.points.length >= 2) {
            for (let j = 0; j < el.points.length - 1; j++) {
              if (Geometry.pointToLineDistance(point, el.points[j], el.points[j + 1]) < tolerance) {
                onElement = true;
                break;
              }
            }
          }
          break;
        case 'rectangle':
          const edges = [
            [{ x: el.x, y: el.y }, { x: el.x + el.width, y: el.y }],
            [{ x: el.x + el.width, y: el.y }, { x: el.x + el.width, y: el.y + el.height }],
            [{ x: el.x + el.width, y: el.y + el.height }, { x: el.x, y: el.y + el.height }],
            [{ x: el.x, y: el.y + el.height }, { x: el.x, y: el.y }]
          ];
          for (const edge of edges) {
            if (Geometry.pointToLineDistance(point, edge[0], edge[1]) < tolerance) {
              onElement = true;
              break;
            }
          }
          break;
        case 'circle':
          onElement = Geometry.pointToCircleDistance(point, { x: el.cx, y: el.cy }, el.radius) < tolerance;
          break;
        case 'text':
          const bounds = Geometry.getElementBounds(el);
          onElement = bounds && Geometry.pointInRect(point, bounds);
          break;
      }

      if (onElement) return el;
    }
    return null;
  }, [elements, layers, zoom]);

  // Move element
  const moveElement = (el, dx, dy) => {
    switch (el.type) {
      case 'line':
        el.x1 += dx; el.y1 += dy; el.x2 += dx; el.y2 += dy;
        break;
      case 'polyline':
        el.points?.forEach(p => { p.x += dx; p.y += dy; });
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
    return el;
  };

  // Finish polyline
  const finishPolyline = () => {
    if (polylinePoints.length >= 2) {
      const newElement = {
        id: generateId(),
        type: 'polyline',
        points: [...polylinePoints],
        closed: false,
        stroke: strokeColor,
        strokeWidth,
        layerId: activeLayerId
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      saveHistory(newElements);
    }
    setPolylinePoints([]);
    setIsDrawing(false);
    setReferencePoint(null);
    setShowHeadsUp(false);
  };

  // Mouse handlers
  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    const snappedCoords = getSnappedCoords(coords);

    // Middle mouse or pan tool
    if (e.button === 1 || (e.button === 0 && activeTool === 'pan')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Right click = cancel
    if (e.button === 2) {
      setCurrentElement(null);
      setIsDrawing(false);
      setPolylinePoints([]);
      setShowHeadsUp(false);
      return;
    }

    switch (activeTool) {
      case 'select': {
        const element = findElementAtPoint(coords);
        if (element) {
          const layer = layers.find(l => l.id === element.layerId);
          if (layer && layer.locked) return;

          if (e.shiftKey) {
            const idx = selectedElements.findIndex(el => el.id === element.id);
            if (idx >= 0) {
              setSelectedElements(selectedElements.filter((_, i) => i !== idx));
            } else {
              setSelectedElements([...selectedElements, element]);
            }
          } else {
            if (!selectedElements.some(el => el.id === element.id)) {
              setSelectedElements([element]);
            }
            setIsDrawing(true);
            setDrawStart(coords);
          }
        } else {
          if (!e.shiftKey) setSelectedElements([]);
          setSelectionBox({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
        }
        break;
      }

      case 'line': {
        if (!isDrawing) {
          // First click - start line
          console.log('Starting line at:', snappedCoords);
          setIsDrawing(true);
          setDrawStart(snappedCoords);
          setReferencePoint(snappedCoords);
          setCurrentElement({
            id: generateId(), type: 'line',
            x1: snappedCoords.x, y1: snappedCoords.y,
            x2: snappedCoords.x, y2: snappedCoords.y,
            stroke: strokeColor, strokeWidth, layerId: activeLayerId
          });
        } else {
          // Second click - finish line
          console.log('Finishing line at:', snappedCoords);
          if (currentElement) {
            const finalElement = { ...currentElement, x2: snappedCoords.x, y2: snappedCoords.y };
            const length = Geometry.distance(
              { x: finalElement.x1, y: finalElement.y1 },
              { x: finalElement.x2, y: finalElement.y2 }
            );
            if (length > 1) {
              const newElements = [...elements, finalElement];
              setElements(newElements);
              saveHistory(newElements);
              console.log('Line saved, length:', length);
            }
          }
          setCurrentElement(null);
          setIsDrawing(false);
          setDrawStart(null);
          setReferencePoint(null);
          setShowHeadsUp(false);
        }
        break;
      }

      case 'polyline': {
        if (polylinePoints.length === 0) {
          setReferencePoint(snappedCoords);
        }
        setPolylinePoints([...polylinePoints, snappedCoords]);
        setReferencePoint(snappedCoords);
        setIsDrawing(true);
        setDrawStart(snappedCoords);
        break;
      }

      case 'rectangle': {
        if (!isDrawing) {
          // First click - start rectangle
          setIsDrawing(true);
          setDrawStart(snappedCoords);
          setCurrentElement({
            id: generateId(), type: 'rectangle',
            x: snappedCoords.x, y: snappedCoords.y,
            width: 0, height: 0,
            stroke: strokeColor, strokeWidth, fill: 'none',
            layerId: activeLayerId
          });
        } else {
          // Second click - finish rectangle
          if (currentElement) {
            const w = snappedCoords.x - drawStart.x;
            const h = snappedCoords.y - drawStart.y;
            const finalElement = {
              ...currentElement,
              x: w >= 0 ? drawStart.x : snappedCoords.x,
              y: h >= 0 ? drawStart.y : snappedCoords.y,
              width: Math.abs(w),
              height: Math.abs(h)
            };
            if (finalElement.width > 1 && finalElement.height > 1) {
              const newElements = [...elements, finalElement];
              setElements(newElements);
              saveHistory(newElements);
            }
          }
          setCurrentElement(null);
          setIsDrawing(false);
          setDrawStart(null);
          setShowHeadsUp(false);
        }
        break;
      }

      case 'circle': {
        if (!isDrawing) {
          // First click - set center
          setIsDrawing(true);
          setDrawStart(snappedCoords);
          setReferencePoint(snappedCoords);
          setCurrentElement({
            id: generateId(), type: 'circle',
            cx: snappedCoords.x, cy: snappedCoords.y, radius: 0,
            stroke: strokeColor, strokeWidth, fill: 'none',
            layerId: activeLayerId
          });
        } else {
          // Second click - finish circle
          if (currentElement) {
            const radius = Geometry.distance(drawStart, snappedCoords);
            const finalElement = { ...currentElement, radius };
            if (radius > 1) {
              const newElements = [...elements, finalElement];
              setElements(newElements);
              saveHistory(newElements);
            }
          }
          setCurrentElement(null);
          setIsDrawing(false);
          setDrawStart(null);
          setReferencePoint(null);
          setShowHeadsUp(false);
        }
        break;
      }

      case 'text': {
        const text = prompt('Enter text:', '');
        if (text) {
          const newElement = {
            id: generateId(), type: 'text',
            x: snappedCoords.x, y: snappedCoords.y,
            text, height: 16, stroke: strokeColor,
            layerId: activeLayerId
          };
          const newElements = [...elements, newElement];
          setElements(newElements);
          saveHistory(newElements);
        }
        break;
      }

      case 'move': {
        if (selectedElements.length === 0) {
          const element = findElementAtPoint(coords);
          if (element) setSelectedElements([element]);
        }
        if (selectedElements.length > 0) {
          setIsDrawing(true);
          setDrawStart(snappedCoords);
          setReferencePoint(snappedCoords);
        }
        break;
      }

      case 'delete': {
        const element = findElementAtPoint(coords);
        if (element) {
          const layer = layers.find(l => l.id === element.layerId);
          if (layer && layer.locked) return;
          const newElements = elements.filter(el => el.id !== element.id);
          setElements(newElements);
          saveHistory(newElements);
        }
        break;
      }
    }
  };

  const handleMouseMove = (e) => {
    const coords = getCanvasCoords(e);
    setMouseCoords(coords);

    // Update snap
    if (snapEnabled) {
      const snap = snapSystemRef.current.findSnapPoint(coords, elements, zoom);
      setCurrentSnap(snap);
    } else {
      setCurrentSnap(null);
    }

    // Panning
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const snappedCoords = getSnappedCoords(coords);

    // Selection box
    if (selectionBox) {
      setSelectionBox({ ...selectionBox, x2: coords.x, y2: coords.y });
      return;
    }

    // Dragging selected elements
    if (activeTool === 'select' && isDrawing && selectedElements.length > 0) {
      const dx = coords.x - drawStart.x;
      const dy = coords.y - drawStart.y;
      setElements(elements.map(el => {
        if (selectedElements.some(s => s.id === el.id)) {
          return moveElement({ ...el }, dx, dy);
        }
        return el;
      }));
      setSelectedElements(selectedElements.map(el => moveElement({ ...el }, dx, dy)));
      setDrawStart(coords);
      return;
    }

    // Move tool
    if (activeTool === 'move' && isDrawing && selectedElements.length > 0) {
      const dx = snappedCoords.x - drawStart.x;
      const dy = snappedCoords.y - drawStart.y;
      setElements(elements.map(el => {
        if (selectedElements.some(s => s.id === el.id)) {
          return moveElement({ ...el }, dx, dy);
        }
        return el;
      }));
      setSelectedElements(selectedElements.map(el => moveElement({ ...el }, dx, dy)));
      setDrawStart(snappedCoords);
      return;
    }

    // Drawing tools
    if (currentElement) {
      switch (activeTool) {
        case 'line':
          setCurrentElement({ ...currentElement, x2: snappedCoords.x, y2: snappedCoords.y });
          break;
        case 'rectangle': {
          const w = snappedCoords.x - drawStart.x;
          const h = snappedCoords.y - drawStart.y;
          setCurrentElement({
            ...currentElement,
            x: w >= 0 ? drawStart.x : snappedCoords.x,
            y: h >= 0 ? drawStart.y : snappedCoords.y,
            width: Math.abs(w),
            height: Math.abs(h)
          });
          break;
        }
        case 'circle':
          setCurrentElement({
            ...currentElement,
            radius: Geometry.distance(drawStart, snappedCoords)
          });
          break;
      }

      // Update heads-up display
      if (drawStart) {
        const dx = snappedCoords.x - drawStart.x;
        const dy = snappedCoords.y - drawStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Geometry.normalizeAngle(Geometry.radToDeg(Math.atan2(dy, dx)));
        setShowHeadsUp(true);
        setHeadsUpData({ length, angle, dx, dy });
        setHeadsUpPos({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = (e) => {
    const coords = getCanvasCoords(e);
    const snappedCoords = getSnappedCoords(coords);

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Selection box
    if (selectionBox) {
      const box = selectionBox;
      const isWindow = box.x2 > box.x1;
      const selRect = {
        minX: Math.min(box.x1, box.x2), minY: Math.min(box.y1, box.y2),
        maxX: Math.max(box.x1, box.x2), maxY: Math.max(box.y1, box.y2)
      };

      const selected = elements.filter(el => {
        const layer = layers.find(l => l.id === el.layerId);
        if (layer && (layer.locked || !layer.visible)) return false;
        const bounds = Geometry.getElementBounds(el);
        if (!bounds) return false;
        return isWindow ? Geometry.rectContains(selRect, bounds) : Geometry.rectsIntersect(selRect, bounds);
      });

      setSelectedElements(e.shiftKey ? [...selectedElements, ...selected] : selected);
      setSelectionBox(null);
      return;
    }

    // Finish drag
    if (activeTool === 'select' && isDrawing) {
      setIsDrawing(false);
      saveHistory(elements);
      return;
    }

    // Finish move
    if (activeTool === 'move' && isDrawing) {
      setIsDrawing(false);
      setReferencePoint(null);
      saveHistory(elements);
      return;
    }

    // Finish drawing is now handled in mouseDown for click-click model
    // Only reset if right-click cancelled
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, zoom * delta));

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dx = mouseX - pan.x;
      const dy = mouseY - pan.y;
      setPan({
        x: mouseX - dx * (newZoom / zoom),
        y: mouseY - dy * (newZoom / zoom)
      });
    }
    setZoom(newZoom);
  };

  // Double click to finish polyline
  const handleDoubleClick = () => {
    if (activeTool === 'polyline' && polylinePoints.length >= 2) {
      finishPolyline();
    }
  };

  // Export PNG
  const exportPNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    if (gridEnabled) {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw elements
    elements.forEach(el => {
      const layer = layers.find(l => l.id === el.layerId);
      if (layer && !layer.visible) return;

      ctx.strokeStyle = el.stroke || '#000';
      ctx.lineWidth = el.strokeWidth || 1;
      ctx.fillStyle = el.fill || 'transparent';

      switch (el.type) {
        case 'line':
          ctx.beginPath();
          ctx.moveTo(el.x1, el.y1);
          ctx.lineTo(el.x2, el.y2);
          ctx.stroke();
          break;
        case 'polyline':
          if (el.points && el.points.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            el.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
          }
          break;
        case 'rectangle':
          ctx.beginPath();
          ctx.rect(el.x, el.y, el.width, el.height);
          if (el.fill && el.fill !== 'none') ctx.fill();
          ctx.stroke();
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(el.cx, el.cy, el.radius, 0, Math.PI * 2);
          if (el.fill && el.fill !== 'none') ctx.fill();
          ctx.stroke();
          break;
        case 'text':
          ctx.font = `${el.height || 16}px Arial`;
          ctx.fillStyle = el.stroke;
          ctx.fillText(el.text, el.x, el.y);
          break;
      }
    });

    const link = document.createElement('a');
    link.download = 'hydrodraw_export.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  // Export DXF
  const exportDXF = () => {
    let dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';

    elements.forEach(el => {
      switch (el.type) {
        case 'line':
          dxf += `0\nLINE\n8\n${el.layerId}\n10\n${el.x1}\n20\n${el.y1}\n11\n${el.x2}\n21\n${el.y2}\n`;
          break;
        case 'circle':
          dxf += `0\nCIRCLE\n8\n${el.layerId}\n10\n${el.cx}\n20\n${el.cy}\n40\n${el.radius}\n`;
          break;
        case 'rectangle':
          dxf += `0\nLWPOLYLINE\n8\n${el.layerId}\n90\n4\n70\n1\n`;
          dxf += `10\n${el.x}\n20\n${el.y}\n`;
          dxf += `10\n${el.x + el.width}\n20\n${el.y}\n`;
          dxf += `10\n${el.x + el.width}\n20\n${el.y + el.height}\n`;
          dxf += `10\n${el.x}\n20\n${el.y + el.height}\n`;
          break;
        case 'text':
          dxf += `0\nTEXT\n8\n${el.layerId}\n10\n${el.x}\n20\n${el.y}\n40\n${el.height || 16}\n1\n${el.text}\n`;
          break;
      }
    });

    dxf += '0\nENDSEC\n0\nEOF\n';

    const blob = new Blob([dxf], { type: 'application/dxf' });
    const link = document.createElement('a');
    link.download = 'hydrodraw_export.dxf';
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // Render grid
  const renderGrid = () => {
    if (!gridEnabled) return null;
    const lines = [];
    for (let x = 0; x <= canvasSize.width; x += gridSize) {
      const sw = x % (gridSize * 10) === 0 ? 1 : 0.5;
      const color = x % (gridSize * 10) === 0 ? '#d0d0d0' : '#e8e8e8';
      lines.push(<line key={`v-${x}`} x1={x} y1={0} x2={x} y2={canvasSize.height} stroke={color} strokeWidth={sw} />);
    }
    for (let y = 0; y <= canvasSize.height; y += gridSize) {
      const sw = y % (gridSize * 10) === 0 ? 1 : 0.5;
      const color = y % (gridSize * 10) === 0 ? '#d0d0d0' : '#e8e8e8';
      lines.push(<line key={`h-${y}`} x1={0} y1={y} x2={canvasSize.width} y2={y} stroke={color} strokeWidth={sw} />);
    }
    return <g className="grid-layer">{lines}</g>;
  };

  // Render element
  const renderElement = (el, isPreview = false) => {
    const layer = layers.find(l => l.id === el.layerId);
    if (!isPreview && layer && !layer.visible) return null;

    const isSelected = selectedElements.some(s => s.id === el.id);
    const stroke = isSelected ? '#3b82f6' : (el.stroke || '#000');

    switch (el.type) {
      case 'line':
        return (
          <g key={el.id}>
            <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
              stroke={stroke} strokeWidth={el.strokeWidth || 1} />
            {isSelected && (
              <>
                <circle cx={el.x1} cy={el.y1} r={4 / zoom} fill="#3b82f6" />
                <circle cx={el.x2} cy={el.y2} r={4 / zoom} fill="#3b82f6" />
              </>
            )}
          </g>
        );
      case 'polyline':
        if (!el.points || el.points.length < 2) return null;
        return (
          <g key={el.id}>
            <polyline points={el.points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none" stroke={stroke} strokeWidth={el.strokeWidth || 1} />
            {isSelected && el.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={4 / zoom} fill="#3b82f6" />
            ))}
          </g>
        );
      case 'rectangle':
        return (
          <g key={el.id}>
            <rect x={el.x} y={el.y} width={el.width} height={el.height}
              fill={el.fill || 'none'} stroke={stroke} strokeWidth={el.strokeWidth || 1} />
            {isSelected && (
              <rect x={el.x - 2} y={el.y - 2} width={el.width + 4} height={el.height + 4}
                fill="none" stroke="#3b82f6" strokeWidth={1 / zoom} strokeDasharray="4,4" />
            )}
          </g>
        );
      case 'circle':
        return (
          <g key={el.id}>
            <circle cx={el.cx} cy={el.cy} r={el.radius}
              fill={el.fill || 'none'} stroke={stroke} strokeWidth={el.strokeWidth || 1} />
            {isSelected && (
              <>
                <circle cx={el.cx} cy={el.cy} r={el.radius + 4 / zoom}
                  fill="none" stroke="#3b82f6" strokeWidth={1 / zoom} strokeDasharray="4,4" />
                <circle cx={el.cx} cy={el.cy} r={4 / zoom} fill="#3b82f6" />
              </>
            )}
          </g>
        );
      case 'text':
        return (
          <g key={el.id}>
            <text x={el.x} y={el.y} fill={stroke} fontSize={el.height || 16} fontFamily="Arial">
              {el.text}
            </text>
            {isSelected && (
              <rect x={el.x - 2} y={el.y - (el.height || 16) - 2}
                width={(el.text || '').length * (el.height || 16) * 0.6 + 4} height={(el.height || 16) + 4}
                fill="none" stroke="#3b82f6" strokeWidth={1 / zoom} strokeDasharray="4,4" />
            )}
          </g>
        );
      default:
        return null;
    }
  };

  // Tools config
  const tools = [
    { id: 'select', icon: Icons.Select, label: 'Select (V)' },
    { id: 'pan', icon: Icons.Pan, label: 'Pan (H)' },
    { type: 'sep' },
    { id: 'line', icon: Icons.Line, label: 'Line (L)' },
    { id: 'polyline', icon: Icons.Polyline, label: 'Polyline' },
    { id: 'rectangle', icon: Icons.Rectangle, label: 'Rectangle (R)' },
    { id: 'circle', icon: Icons.Circle, label: 'Circle (C)' },
    { id: 'text', icon: Icons.Text, label: 'Text (T)' },
    { type: 'sep' },
    { id: 'move', icon: Icons.Move, label: 'Move (M)' },
    { id: 'delete', icon: Icons.Delete, label: 'Delete' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white" data-testid="cad-app">
      {/* PWA Install Banner */}
      {deferredPrompt && (
        <div className="bg-cyan-600 text-white px-4 py-2 flex items-center justify-between shadow-md z-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Install HidroDraw application separately for better performance!</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDeferredPrompt(null)}
              className="text-white/80 hover:text-white px-2 text-xs"
            >
              Later
            </button>
            <button
              onClick={handleInstallClick}
              className="bg-white text-cyan-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 shadow-sm"
            >
              Install App
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-2 py-1 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <img src="/logo-hdi.png" alt="HDI Logo" className="h-8 w-auto object-contain bg-white rounded-sm p-0.5" />
          <div>
            <h1 className="text-sm font-bold text-cyan-400">HydroDraw CAD</h1>
            <p className="text-[10px] text-gray-400">PT Hidro Dinamika Internasional</p>
          </div>
        </div>
        <div className="h-6 w-px bg-gray-700 mx-2" />
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-gray-700 rounded" title="New"><Icons.New /></button>
          <button className="p-1.5 hover:bg-gray-700 rounded" title="Open"><Icons.Open /></button>
          <button className="p-1.5 hover:bg-gray-700 rounded" title="Save"><Icons.Save /></button>
        </div>
        <div className="h-6 w-px bg-gray-700 mx-2" />
        <div className="flex items-center gap-1">
          <button onClick={exportDXF} className="px-2 py-1 text-xs hover:bg-gray-700 rounded flex items-center gap-1">
            <Icons.Export />DXF
          </button>
          <button onClick={exportPNG} className="px-2 py-1 text-xs hover:bg-gray-700 rounded flex items-center gap-1">
            <Icons.Export />PNG
          </button>
        </div>
        <div className="h-6 w-px bg-gray-700 mx-2" />
        <div className="flex items-center gap-1">
          <button onClick={handleUndo} disabled={historyIndex <= 0}
            className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30" title="Undo (Ctrl+Z)">
            <Icons.Undo />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
            className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30" title="Redo (Ctrl+Y)">
            <Icons.Redo />
          </button>
        </div>
        <div className="h-6 w-px bg-gray-700 mx-2" />
        <div className="flex items-center gap-1">
          <button onClick={() => setGridEnabled(!gridEnabled)}
            className={`px-2 py-1 text-[10px] font-bold rounded ${gridEnabled ? 'bg-green-600' : 'bg-gray-700'}`}>GRID</button>
          <button onClick={() => setSnapEnabled(!snapEnabled)}
            className={`px-2 py-1 text-[10px] font-bold rounded ${snapEnabled ? 'bg-green-600' : 'bg-gray-700'}`}>SNAP</button>
          <button onClick={() => { setOrthoEnabled(!orthoEnabled); setPolarEnabled(false); }}
            className={`px-2 py-1 text-[10px] font-bold rounded ${orthoEnabled ? 'bg-green-600' : 'bg-gray-700'}`}>ORTHO</button>
          <button onClick={() => { setPolarEnabled(!polarEnabled); setOrthoEnabled(false); }}
            className={`px-2 py-1 text-[10px] font-bold rounded ${polarEnabled ? 'bg-green-600' : 'bg-gray-700'}`}>POLAR</button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.min(10, z * 1.25))} className="p-1 hover:bg-gray-700 rounded"><Icons.ZoomIn /></button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.1, z / 1.25))} className="p-1 hover:bg-gray-700 rounded"><Icons.ZoomOut /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Tool Panel */}
        <div className="w-12 bg-gray-800 border-r border-gray-700 p-1 flex flex-col gap-1">
          {tools.map((tool, i) =>
            tool.type === 'sep' ? (
              <div key={i} className="h-px bg-gray-700 my-1" />
            ) : (
              <button key={tool.id} onClick={() => setActiveTool(tool.id)}
                className={`w-10 h-10 rounded flex items-center justify-center ${activeTool === tool.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                title={tool.label} data-testid={`tool-${tool.id}`}>
                <tool.icon />
              </button>
            )
          )}
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-950 relative"
          onWheel={handleWheel} onContextMenu={e => e.preventDefault()}>
          <svg ref={canvasRef}
            width={canvasSize.width * zoom} height={canvasSize.height * zoom}
            viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
            className="absolute cursor-crosshair"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            data-testid="cad-canvas">
            <rect x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="#f8f8f8" />
            {renderGrid()}
            {elements.map(el => renderElement(el))}
            {currentElement && renderElement(currentElement, true)}
            {/* Polyline preview */}
            {activeTool === 'polyline' && polylinePoints.length > 0 && (
              <g>
                {polylinePoints.length >= 2 && (
                  <polyline points={polylinePoints.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none" stroke="#00ff00" strokeWidth={1} />
                )}
                {polylinePoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={4 / zoom} fill="#00ff00" />
                ))}
                <line x1={polylinePoints[polylinePoints.length - 1].x}
                  y1={polylinePoints[polylinePoints.length - 1].y}
                  x2={mouseCoords.x} y2={mouseCoords.y}
                  stroke="#00ff00" strokeWidth={1} strokeDasharray="5,5" />
              </g>
            )}
          </svg>

          {/* Snap indicator */}
          {currentSnap && (
            <div className="absolute pointer-events-none"
              style={{ left: currentSnap.point.x * zoom + pan.x, top: currentSnap.point.y * zoom + pan.y }}>
              <div className={`w-3 h-3 border-2 border-green-400 -translate-x-1/2 -translate-y-1/2 ${currentSnap.type === 'midpoint' || currentSnap.type === 'center' ? 'rounded-full' : ''}`} />
            </div>
          )}

          {/* Selection box */}
          {selectionBox && (
            <div className="absolute border pointer-events-none"
              style={{
                left: Math.min(selectionBox.x1, selectionBox.x2) * zoom + pan.x,
                top: Math.min(selectionBox.y1, selectionBox.y2) * zoom + pan.y,
                width: Math.abs(selectionBox.x2 - selectionBox.x1) * zoom,
                height: Math.abs(selectionBox.y2 - selectionBox.y1) * zoom,
                borderColor: selectionBox.x2 > selectionBox.x1 ? '#3b82f6' : '#22c55e',
                backgroundColor: selectionBox.x2 > selectionBox.x1 ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
                borderStyle: 'dashed'
              }} />
          )}

          {/* Heads-up input */}
          {showHeadsUp && headsUpData.length !== undefined && (
            <div className="absolute bg-gray-800 border border-cyan-500 rounded p-2 text-xs"
              style={{ left: headsUpPos.x + 20, top: headsUpPos.y + 20 }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-400 w-12">Length:</span>
                <span className="text-green-400 font-mono">{headsUpData.length?.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-12">Angle:</span>
                <span className="text-green-400 font-mono">{headsUpData.angle?.toFixed(2)}°</span>
              </div>
            </div>
          )}

          {/* Coords display */}
          <div className="absolute bottom-2 left-2 bg-gray-800/80 px-2 py-1 rounded text-xs text-gray-400">
            X: {mouseCoords.x.toFixed(2)} Y: {mouseCoords.y.toFixed(2)}
            {currentSnap && <span className="text-green-400 ml-2">{currentSnap.type.toUpperCase()}</span>}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-56 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-2 border-b border-gray-700">
            <h3 className="text-xs font-bold text-gray-400">PROPERTIES</h3>
          </div>
          <div className="p-2 flex-1 overflow-y-auto text-xs">
            {selectedElements.length > 0 ? (
              <div>
                <p className="text-gray-400 mb-2">Selected: {selectedElements.length} element(s)</p>
                {selectedElements.length === 1 && (
                  <div className="space-y-2">
                    <p className="text-cyan-400 font-bold">{selectedElements[0].type.toUpperCase()}</p>
                    {selectedElements[0].type === 'line' && (
                      <>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-8">X1:</span>
                          <span className="text-white">{selectedElements[0].x1.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-8">Y1:</span>
                          <span className="text-white">{selectedElements[0].y1.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-8">X2:</span>
                          <span className="text-white">{selectedElements[0].x2.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-8">Y2:</span>
                          <span className="text-white">{selectedElements[0].y2.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-8">Len:</span>
                          <span className="text-green-400">
                            {Geometry.distance(
                              { x: selectedElements[0].x1, y: selectedElements[0].y1 },
                              { x: selectedElements[0].x2, y: selectedElements[0].y2 }
                            ).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                    {selectedElements[0].type === 'circle' && (
                      <>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-8">CX:</span>
                          <span className="text-white">{selectedElements[0].cx.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-8">CY:</span>
                          <span className="text-white">{selectedElements[0].cy.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-8">R:</span>
                          <span className="text-green-400">{selectedElements[0].radius.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No selection</p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-700">
              <h4 className="text-gray-400 font-bold mb-2">DRAWING</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-400">Stroke:</span>
                <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)}
                  className="w-8 h-6 rounded cursor-pointer" />
                <input type="number" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))}
                  min="1" max="10" className="w-12 bg-gray-900 rounded px-1 text-center" />
              </div>
            </div>
          </div>

          {/* Layers */}
          <div className="border-t border-gray-700">
            <div className="p-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-400">LAYERS</h3>
              <button onClick={() => {
                const name = prompt('Layer name:', `Layer ${layers.length}`);
                if (name) {
                  const newLayer = {
                    id: 'layer_' + generateId(),
                    name, visible: true, locked: false,
                    color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
                  };
                  setLayers([...layers, newLayer]);
                  setActiveLayerId(newLayer.id);
                }
              }} className="p-1 hover:bg-gray-700 rounded" title="Add Layer">
                <Icons.Plus />
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto">
              {layers.map(layer => (
                <div key={layer.id}
                  className={`flex items-center gap-2 px-2 py-1 cursor-pointer ${layer.id === activeLayerId ? 'bg-cyan-600/30' : 'hover:bg-gray-700'}`}
                  onClick={() => setActiveLayerId(layer.id)}>
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: layer.color }} />
                  <span className="flex-1 text-xs truncate">{layer.name}</span>
                  <button onClick={e => { e.stopPropagation(); setLayers(layers.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); }}
                    className={`p-0.5 ${layer.visible ? 'text-green-400' : 'text-gray-500'}`}>
                    {layer.visible ? <Icons.Eye /> : <Icons.EyeOff />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); setLayers(layers.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)); }}
                    className={`p-0.5 ${layer.locked ? 'text-red-400' : 'text-gray-500'}`}>
                    {layer.locked ? <Icons.Lock /> : <Icons.Unlock />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-1 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>Tool: {activeTool.toUpperCase()}</span>
          <span>Layer: {layers.find(l => l.id === activeLayerId)?.name}</span>
          <span>Elements: {elements.length}</span>
        </div>
        <span>HydroDraw CAD v1.0 - PT Hidro Dinamika Internasional</span>
      </footer>
    </div>
  );
}

export default App;
