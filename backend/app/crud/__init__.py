from .training import (
    red_team_training,
    certification,
    vendor_training,
    skill_level_history
)

from .jqr import (
    jqr_item,
    jqr_tracker
)

# Export the CRUD instances
__all__ = [
    # Training
    "red_team_training",
    "certification",
    "vendor_training",
    "skill_level_history",
    
    # JQR
    "jqr_item",
    "jqr_tracker"
] 