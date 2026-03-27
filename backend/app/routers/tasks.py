from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models.user import User, Profile
from ..models.task import EnhancedTask
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    client_id: UUID
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    status: str = "todo"
    linked_project: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    linked_project: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    completed_at: Optional[datetime] = None


class TaskResponse(BaseModel):
    id: UUID
    client_id: UUID
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    status: str = "todo"
    linked_project: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[TaskResponse])
async def get_my_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's tasks."""
    tasks = db.query(EnhancedTask).filter(
        EnhancedTask.client_id == current_user.id
    ).order_by(EnhancedTask.created_at.desc()).all()
    
    return tasks


@router.get("/my", response_model=List[TaskResponse])
async def get_my_tasks_alias(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's tasks (alias for /)."""
    tasks = db.query(EnhancedTask).filter(
        EnhancedTask.client_id == current_user.id
    ).order_by(EnhancedTask.created_at.desc()).all()
    
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific task."""
    profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    
    task = db.query(EnhancedTask).filter(EnhancedTask.id == task_id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Only allow access to own tasks unless admin
    if str(task.client_id) != str(current_user.id) and (not profile or profile.role != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return task


# Admin endpoints
@router.post("/", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a task (admin only)."""
    new_task = EnhancedTask(
        client_id=task.client_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        status=task.status,
        linked_project=task.linked_project,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    return new_task


@router.post("/bulk", response_model=List[TaskResponse])
async def create_tasks_bulk(
    tasks: List[TaskCreate],
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create multiple tasks (admin only)."""
    new_tasks = []
    for task in tasks:
        new_task = EnhancedTask(
            client_id=task.client_id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            status=task.status,
            linked_project=task.linked_project,
            due_date=task.due_date,
            estimated_hours=task.estimated_hours,
        )
        db.add(new_task)
        new_tasks.append(new_task)
    
    db.commit()
    
    for task in new_tasks:
        db.refresh(task)
    
    return new_tasks


@router.get("/admin/client/{client_id}", response_model=List[TaskResponse])
async def get_client_tasks(
    client_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get tasks for a specific client (admin only)."""
    tasks = db.query(EnhancedTask).filter(
        EnhancedTask.client_id == client_id
    ).order_by(EnhancedTask.created_at.desc()).all()
    
    return tasks


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    updates: TaskUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a task (admin only)."""
    task = db.query(EnhancedTask).filter(EnhancedTask.id == task_id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    
    # Auto-set completed_at when status changes to done
    if "status" in update_data and update_data["status"] == "done" and not task.completed_at:
        update_data["completed_at"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(task, field, value)
    
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    
    return task


@router.delete("/{task_id}")
async def delete_task(
    task_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a task (admin only)."""
    result = db.query(EnhancedTask).filter(EnhancedTask.id == task_id).delete()
    
    if result == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.commit()
    
    return {"success": True}
