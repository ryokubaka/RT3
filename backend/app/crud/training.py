from ..utils.db_utils import CRUDBase
from ..models import RedTeamTraining, Certification, VendorTraining, SkillLevelHistory
from ..schemas import (
    RedTeamTrainingUpdate, RedTeamTrainingResponse,
    CertificationUpdate, CertificationResponse,
    VendorTrainingUpdate, VendorTrainingResponse,
    SkillLevelHistoryUpdate, SkillLevelHistoryResponse
)


class CRUDRedTeamTraining(CRUDBase[RedTeamTraining, RedTeamTrainingUpdate, RedTeamTrainingUpdate]):
    """CRUD operations for Red Team Training"""
    
    def get_by_operator(self, db, operator_name: str):
        """Get all red team trainings for a specific operator"""
        return db.query(self.model).filter(self.model.operator_name == operator_name).all()


class CRUDCertification(CRUDBase[Certification, CertificationUpdate, CertificationUpdate]):
    """CRUD operations for Certifications"""
    
    def get_by_operator(self, db, operator_name: str):
        """Get all certifications for a specific operator"""
        return db.query(self.model).filter(self.model.operator_name == operator_name).all()


class CRUDVendorTraining(CRUDBase[VendorTraining, VendorTrainingUpdate, VendorTrainingUpdate]):
    """CRUD operations for Vendor Training"""
    
    def get_by_operator(self, db, operator_name: str):
        """Get all vendor trainings for a specific operator"""
        return db.query(self.model).filter(self.model.operator_name == operator_name).all()


class CRUDSkillLevelHistory(CRUDBase[SkillLevelHistory, SkillLevelHistoryUpdate, SkillLevelHistoryUpdate]):
    """CRUD operations for Skill Level History"""
    
    def get_by_operator(self, db, operator_name: str):
        """Get all skill level history for a specific operator"""
        return db.query(self.model).filter(self.model.operator_name == operator_name).all()
    
    def get_latest_by_operator(self, db, operator_name: str):
        """Get the latest skill level for a specific operator"""
        return (
            db.query(self.model)
            .filter(self.model.operator_name == operator_name)
            .order_by(self.model.date_assigned.desc())
            .first()
        )


# Create instances
red_team_training = CRUDRedTeamTraining(RedTeamTraining)
certification = CRUDCertification(Certification)
vendor_training = CRUDVendorTraining(VendorTraining)
skill_level_history = CRUDSkillLevelHistory(SkillLevelHistory) 