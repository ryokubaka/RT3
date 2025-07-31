import React from 'react';
import { MenuItem, ListItemIcon } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';

const Navbar = () => {
    const navigate = useNavigate();

    return (
        <MenuItem onClick={() => navigate('/profile')}>
            <ListItemIcon>
                <PersonIcon fontSize="small" />
            </ListItemIcon>
            Profile
        </MenuItem>
    );
};

export default Navbar; 