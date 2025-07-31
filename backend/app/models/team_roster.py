class TeamRoster(Base):
    __tablename__ = "team_roster"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    operator_handle = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    team_role = Column(String, nullable=False)
    operator_level = Column(String)
    compliance_8570 = Column(String)
    legal_document_status = Column(String)
    is_active = Column(Boolean, default=True)
    hashed_password = Column(String, nullable=False)
    avatar_id = Column(Integer, ForeignKey("images.id"), nullable=True)
    avatar = relationship("Image", foreign_keys=[avatar_id]) 