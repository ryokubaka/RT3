class AssessmentCSVImport(BaseModel):
    """Schema for importing an assessment from CSV."""
    csv_content: str  # base64 encoded CSV content
    title: str
    description: str = ""
    is_active: bool = True

    class Config:
        json_schema_extra = {
            "example": {
                "csv_content": "base64_encoded_csv_content",
                "title": "Imported Assessment",
                "description": "Assessment imported from CSV",
                "is_active": True
            }
        } 