from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from app.models.schemas import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateVersionResponse
)
from app.db.database import get_db
from app.db.models import Template, TemplateVersion

router = APIRouter()

@router.post("/", response_model=TemplateResponse, status_code=201)
def create_template(template: TemplateCreate, db: Session = Depends(get_db)):
    """
    Create a new template with its first version.
    """
    # Check if template with this name already exists
    existing = db.query(Template).filter(Template.name == template.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Template with name '{template.name}' already exists")

    # Create the template
    db_template = Template(name=template.name)
    db.add(db_template)
    db.flush()  # Get the template ID without committing

    # Create the first version
    version = TemplateVersion(
        template_id=db_template.id,
        version=1,
        content=template.content,
        variables=template.variables,
        schema=template.json_schema
    )
    db.add(version)
    db.commit()
    db.refresh(db_template)

    return db_template


@router.get("/", response_model=List[TemplateResponse])
def list_templates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    List all templates with their versions.
    """
    templates = db.query(Template).offset(skip).limit(limit).all()
    return templates


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: int, db: Session = Depends(get_db)):
    """
    Get a specific template by ID with all its versions.
    """
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.get("/{template_id}/versions/{version_number}", response_model=TemplateVersionResponse)
def get_template_version(template_id: int, version_number: int, db: Session = Depends(get_db)):
    """
    Get a specific version of a template.
    """
    version = db.query(TemplateVersion).filter(
        TemplateVersion.template_id == template_id,
        TemplateVersion.version == version_number
    ).first()

    if not version:
        raise HTTPException(status_code=404, detail="Template version not found")
    return version


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    template_update: TemplateUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a template. Creates a new version if content/schema changes.
    """
    db_template = db.query(Template).filter(Template.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Update template name if provided
    if template_update.name is not None:
        # Check if new name conflicts with another template
        existing = db.query(Template).filter(
            Template.name == template_update.name,
            Template.id != template_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Template with name '{template_update.name}' already exists"
            )
        db_template.name = template_update.name

    # Create new version if content, variables, or schema changed
    if any([
        template_update.content is not None,
        template_update.variables is not None,
        template_update.json_schema is not None
    ]):
        # Get the latest version
        latest_version = db.query(TemplateVersion).filter(
            TemplateVersion.template_id == template_id
        ).order_by(TemplateVersion.version.desc()).first()

        # Prepare new version data
        new_content = template_update.content if template_update.content is not None else latest_version.content
        new_variables = template_update.variables if template_update.variables is not None else latest_version.variables
        new_schema = template_update.json_schema if template_update.json_schema is not None else latest_version.schema

        # Create new version
        new_version = TemplateVersion(
            template_id=template_id,
            version=latest_version.version + 1,
            content=new_content,
            variables=new_variables,
            schema=new_schema
        )
        db.add(new_version)

    db.commit()
    db.refresh(db_template)
    return db_template


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    """
    Delete a template and all its versions.
    Runs associated with this template will have template_id set to NULL.
    """
    db_template = db.query(Template).filter(Template.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(db_template)
    db.commit()
    return None
