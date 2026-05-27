import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.shared.dependencies import get_current_user, require_admin
from app.models.user import User
from app.domains.workflows import service
from app.domains.workflows.schemas import (
    WorkflowRuleCreate, WorkflowRuleUpdate, WorkflowRuleResponse,
    PromiseCreate, PromiseUpdate, PromiseResponse,
    TemplateCreate, TemplateUpdate, TemplateResponse,
)

router = APIRouter(prefix="/workflows", tags=["Workflows & Relances"])


@router.get("/rules", response_model=list[WorkflowRuleResponse])
async def list_rules(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rules = await service.list_rules(current_user.company_id, db)
    return [WorkflowRuleResponse.model_validate(r) for r in rules]


@router.post("/rules", response_model=WorkflowRuleResponse, status_code=201)
async def create_rule(data: WorkflowRuleCreate, current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    rule = await service.create_rule(current_user.company_id, data, db)
    return WorkflowRuleResponse.model_validate(rule)


@router.put("/rules/{rule_id}", response_model=WorkflowRuleResponse)
async def update_rule(rule_id: uuid.UUID, data: WorkflowRuleUpdate, current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    rule = await service.update_rule(rule_id, current_user.company_id, data, db)
    return WorkflowRuleResponse.model_validate(rule)


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: uuid.UUID, current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    await service.delete_rule(rule_id, current_user.company_id, db)


@router.get("/templates", response_model=list[TemplateResponse])
async def list_templates(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    templates = await service.list_templates(current_user.company_id, db)
    return [TemplateResponse.model_validate(t) for t in templates]


@router.post("/templates", response_model=TemplateResponse, status_code=201)
async def create_template(data: TemplateCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    template = await service.create_template(current_user.company_id, data, db)
    return TemplateResponse.model_validate(template)


@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: uuid.UUID, data: TemplateUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    template = await service.update_template(template_id, current_user.company_id, data, db)
    return TemplateResponse.model_validate(template)


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(template_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await service.delete_template(template_id, current_user.company_id, db)


@router.get("/promises", response_model=list[PromiseResponse])
async def list_promises(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    promises = await service.list_promises(current_user.company_id, db)
    return [PromiseResponse.model_validate(p) for p in promises]


@router.post("/promises", response_model=PromiseResponse, status_code=201)
async def create_promise(data: PromiseCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    promise = await service.create_promise(current_user.company_id, current_user.id, data, db)
    return PromiseResponse.model_validate(promise)


@router.put("/promises/{promise_id}", response_model=PromiseResponse)
async def update_promise(promise_id: uuid.UUID, data: PromiseUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    promise = await service.update_promise(promise_id, current_user.company_id, data, db)
    return PromiseResponse.model_validate(promise)
