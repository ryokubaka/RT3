"""Update missions table to separate operators into remote and local

Revision ID: update_missions_operators
Revises: add_training_type_and_dod_8140
Create Date: 2025-01-27

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = 'update_missions_operators'
down_revision = 'add_training_type_and_dod_8140'
branch_labels = None
depends_on = None

def upgrade():
    # Check if columns already exist before adding them
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('missions')]
    
    # Add new columns for remote and local operators
    if 'remote_operators' not in columns:
        op.add_column('missions', sa.Column('remote_operators', sa.String(), nullable=True))
    if 'local_operators' not in columns:
        op.add_column('missions', sa.Column('local_operators', sa.String(), nullable=True))
    
    # Copy existing operators data to remote_operators (assuming existing data is remote)
    # This preserves existing data during the migration
    if 'operators' in columns:
        op.execute("UPDATE missions SET remote_operators = operators WHERE operators IS NOT NULL")
        # Drop the old operators column
        op.drop_column('missions', 'operators')

def downgrade():
    # Check if columns exist before adding/dropping them
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('missions')]
    
    # Add back the old operators column if it doesn't exist
    if 'operators' not in columns:
        op.add_column('missions', sa.Column('operators', sa.String(), nullable=True))
    
    # Combine remote and local operators back into the single operators column
    if 'remote_operators' in columns or 'local_operators' in columns:
        op.execute("""
            UPDATE missions 
            SET operators = CASE 
                WHEN remote_operators IS NOT NULL AND local_operators IS NOT NULL 
                THEN remote_operators || ', ' || local_operators
                WHEN remote_operators IS NOT NULL 
                THEN remote_operators
                WHEN local_operators IS NOT NULL 
                THEN local_operators
                ELSE NULL
            END
        """)
    
    # Drop the new columns if they exist
    if 'remote_operators' in columns:
        op.drop_column('missions', 'remote_operators')
    if 'local_operators' in columns:
        op.drop_column('missions', 'local_operators') 
