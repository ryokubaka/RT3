"""Add training_type and dod_8140 fields

Revision ID: add_training_type_and_dod_8140
Revises: 
Create Date: 2024-03-19

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = 'add_training_type_and_dod_8140'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Check if training_type column already exists before adding it
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('red_team_training')]
    
    if 'training_type' not in columns:
        # Add training_type column to red_team_training table
        op.add_column('red_team_training', sa.Column('training_type', sa.String(), nullable=True))
    
    # Check if dod_8140 column already exists before adding it
    cert_columns = [col['name'] for col in inspector.get_columns('certifications')]
    
    if 'dod_8140' not in cert_columns:
        # Add dod_8140 column to certifications table with default value False
        op.add_column('certifications', sa.Column('dod_8140', sa.Boolean(), nullable=False, server_default='false'))

def downgrade():
    # Check if training_type column exists before dropping it
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('red_team_training')]
    
    if 'training_type' in columns:
        # Remove training_type column from red_team_training table
        op.drop_column('red_team_training', 'training_type')
    
    # Check if dod_8140 column exists before dropping it
    cert_columns = [col['name'] for col in inspector.get_columns('certifications')]
    
    if 'dod_8140' in cert_columns:
        # Remove dod_8140 column from certifications table
        op.drop_column('certifications', 'dod_8140') 
