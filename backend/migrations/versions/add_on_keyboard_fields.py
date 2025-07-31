"""Add on keyboard fields to missions table

Revision ID: add_on_keyboard_fields
Revises: update_missions_operators
Create Date: 2025-01-27

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = 'add_on_keyboard_fields'
down_revision = 'update_missions_operators'
branch_labels = None
depends_on = None

def upgrade():
    # Check if columns already exist before adding them
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('missions')]
    
    # Add new columns for tracking on keyboard status
    if 'remote_operators_on_keyboard' not in columns:
        op.add_column('missions', sa.Column('remote_operators_on_keyboard', sa.String(), nullable=True))
    if 'local_operators_on_keyboard' not in columns:
        op.add_column('missions', sa.Column('local_operators_on_keyboard', sa.String(), nullable=True))

def downgrade():
    # Check if columns exist before dropping them
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('missions')]
    
    # Drop the on keyboard columns if they exist
    if 'remote_operators_on_keyboard' in columns:
        op.drop_column('missions', 'remote_operators_on_keyboard')
    if 'local_operators_on_keyboard' in columns:
        op.drop_column('missions', 'local_operators_on_keyboard') 
