from fastapi import APIRouter

from .team_roster import router as team_roster_router
from .missions import router as missions_router
from .training import router as training_router
from .documents import router as documents_router
from .jqr import router as jqr_router
from .images import router as images_router
from .assessments import router as assessments_router
from .reports import router as reports_router

# Create main router
router = APIRouter()

# Include all routers
router.include_router(team_roster_router, prefix="/team-roster", tags=["team-roster"])
router.include_router(missions_router, prefix="/missions", tags=["missions"])
router.include_router(training_router, tags=["training"])
router.include_router(documents_router, prefix="/training")
router.include_router(jqr_router, prefix="/jqr", tags=["jqr"])
router.include_router(images_router, prefix="/images", tags=["images"])
router.include_router(assessments_router, tags=["assessments"])
router.include_router(reports_router, tags=["reports"])
