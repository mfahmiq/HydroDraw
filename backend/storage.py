import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

import sys

class JSONStore:
    def __init__(self, data_dir: str = "HidroDrawData"):
        # Determine base path for data storage
        if getattr(sys, 'frozen', False):
            # If running as executable, use user's home directory or AppData
            # Windows: C:\Users\Username\HidroDrawData
            base_path = Path.home()
        else:
            # If running from source, use local directory
            base_path = Path(__file__).parent
            
        self.data_dir = base_path / data_dir
        self.data_dir.mkdir(exist_ok=True)
        self.projects_file = self.data_dir / "projects.json"
        
        # Initialize file if it doesn't exist
        if not self.projects_file.exists():
            self._write_json(self.projects_file, [])

    def _read_json(self, file_path: Path) -> Any:
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _write_json(self, file_path: Path, data: Any):
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)

    def get_projects(self) -> List[Dict[str, Any]]:
        return self._read_json(self.projects_file)

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        projects = self.get_projects()
        for p in projects:
            if p.get('id') == project_id:
                return p
        return None

    def create_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        projects = self.get_projects()
        projects.append(project_data)
        self._write_json(self.projects_file, projects)
        return project_data

    def update_project(self, project_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        projects = self.get_projects()
        for i, p in enumerate(projects):
            if p.get('id') == project_id:
                # Merge update_data into existing project
                updated_project = {**p, **update_data}
                projects[i] = updated_project
                self._write_json(self.projects_file, projects)
                return updated_project
        return None

    def delete_project(self, project_id: str) -> bool:
        projects = self.get_projects()
        initial_len = len(projects)
        projects = [p for p in projects if p.get('id') != project_id]
        
        if len(projects) < initial_len:
            self._write_json(self.projects_file, projects)
            return True
        return False

# Create a global instance
storage = JSONStore()
