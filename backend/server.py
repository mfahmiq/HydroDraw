from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone
from storage import storage  # Import our new storage handler

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app without a prefix
app = FastAPI(title="HydroDraw CAD API", description="CAD Application for PT Hidro Dinamika Internasional")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==================== MODELS ====================

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# CAD Project Models
class CADElement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # line, rectangle, circle, polygon, text
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None
    radius: Optional[float] = None
    points: Optional[List[Dict[str, float]]] = None
    text: Optional[str] = None
    stroke: str = "#000000"
    strokeWidth: float = 2
    fill: Optional[str] = None
    rotation: float = 0
    layer: str = "default"
    locked: bool = False

class CADLayer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    visible: bool = True
    locked: bool = False
    color: str = "#3B82F6"

class CADProject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    elements: List[Dict[str, Any]] = []
    layers: List[Dict[str, Any]] = [
        {"id": "default", "name": "Layer 1", "visible": True, "locked": False, "color": "#3B82F6"}
    ]
    canvas_width: float = 2000
    canvas_height: float = 1500
    grid_size: int = 20
    grid_enabled: bool = True
    snap_to_grid: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CADProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    canvas_width: float = 2000
    canvas_height: float = 1500

class CADProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    elements: Optional[List[Dict[str, Any]]] = None
    layers: Optional[List[Dict[str, Any]]] = None
    canvas_width: Optional[float] = None
    canvas_height: Optional[float] = None
    grid_size: Optional[int] = None
    grid_enabled: Optional[bool] = None
    snap_to_grid: Optional[bool] = None


# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "HydroDraw CAD API - PT Hidro Dinamika Internasional (Local Mode)"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    # Simplified status check, no persistence needed for this mostly diagnostic endpoint
    # or implement a simple log file if really needed
    return StatusCheck(client_name=input.client_name)

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    return [] # Simplified

# ==================== CAD PROJECT ROUTES ====================

@api_router.post("/projects", response_model=CADProject)
async def create_project(input: CADProjectCreate):
    """Create a new CAD project"""
    project = CADProject(**input.model_dump())
    doc = project.model_dump()
    # Serialize datetimes for JSON storage
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    saved_project = storage.create_project(doc)
    return project

@api_router.get("/projects", response_model=List[CADProject])
async def get_projects():
    """Get all CAD projects"""
    projects_data = storage.get_projects()
    projects = []
    for p_data in projects_data:
        # Convert back to CADProject model (handles isoformat parsing)
        projects.append(CADProject(**p_data))
    return projects

@api_router.get("/projects/{project_id}", response_model=CADProject)
async def get_project(project_id: str):
    """Get a specific CAD project"""
    project_data = storage.get_project(project_id)
    if not project_data:
        raise HTTPException(status_code=404, detail="Project not found")
    return CADProject(**project_data)

@api_router.put("/projects/{project_id}", response_model=CADProject)
async def update_project(project_id: str, input: CADProjectUpdate):
    """Update a CAD project"""
    # Check existence
    existing = storage.get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    updated_project_data = storage.update_project(project_id, update_data)
    if not updated_project_data:
         raise HTTPException(status_code=404, detail="Project not found")
         
    return CADProject(**updated_project_data)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a CAD project"""
    success = storage.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
