# RT3 Frontend

The frontend of the Red Team Training Tracker (RT3) is built with React and Material-UI, providing a modern and responsive interface for managing JQR tasks, team roster, training records, and assessments.

## Project Structure

```
frontend/
├── public/                 # Static files
├── src/
│   ├── components/        # Reusable React components
│   │   ├── common/       # Shared components
│   │   ├── Assessments.js
│   │   ├── CreateAssessment.js
│   │   ├── Dashboard.js
│   │   ├── DocumentUpload.js
│   │   ├── EditAssessment.js
│   │   ├── ImageUpload.js
│   │   ├── JQRAdminTracker.js
│   │   ├── JQRQuestionnaire.js
│   │   ├── Layout.js
│   │   ├── Login.js
│   │   ├── Missions.js
│   │   ├── Navbar.js
│   │   ├── NewTable.js
│   │   ├── Profile.js
│   │   ├── ProtectedRoute.js
│   │   ├── PublicRoute.js
│   │   ├── Reports.js
│   │   ├── Table.js
│   │   ├── TakeAssessment.js
│   │   ├── TeamRoster.js
│   │   ├── TrainingManagement.js
│   │   └── ViewAssessmentResponse.js
│   ├── App.js            # Main application component
│   ├── index.js          # Application entry point
│   └── index.css         # Global styles
├── Dockerfile           # Container configuration
└── package.json         # Dependencies and scripts
```

## Key Components

### Assessments
- Create and manage training assessments
- Track assessment responses and progress
- View detailed assessment results

### Dashboard
- Overview of training progress
- Quick access to key features
- Status indicators and notifications

### JQRAdminTracker
- Manages JQR task tracking and progress
- Handles task assignment based on operator levels
- Provides bulk editing and filtering capabilities
- Implements sync functionality with team roster

### JQRQuestionnaire
- Manages JQR task definitions
- Handles task creation and editing
- Supports different skill levels (Apprentice, Journeyman, Master)

### Missions
- Track and manage training missions
- Monitor mission progress and completion
- Assign missions to operators

### Profile
- View and edit operator profiles
- Track personal progress and achievements
- Manage personal documents and certifications

### TeamRoster
- Manages team member information
- Handles operator level assignments
- Tracks compliance and active status

### TrainingManagement
- Comprehensive training tracking
- Document management and uploads
- Certification tracking and expiration monitoring

### Document Management
- Secure file uploads
- Document organization and categorization
- Access control and permissions

## Development

### Prerequisites
- Docker
- Docker Compose

### Running the Application

The frontend is part of the Docker Compose setup. See the main README.md for complete setup instructions.

```bash
# Start all services
docker compose up -d

# View frontend logs
docker compose logs -f frontend
```

The frontend will be available at http://localhost:3000

### Development Mode

For development with hot-reload:
```bash
# Start in development mode
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# View logs
docker compose logs -f frontend
```

### Stopping the Application

```bash
# Stop all services
docker compose down

# Stop and remove volumes (will delete database data)
docker compose down -v
```

## Configuration

The frontend configuration is managed through environment variables in docker-compose.yml:

```yaml
environment:
  - CHOKIDAR_USEPOLLING=true
  - REACT_APP_API_URL=https://localhost/api
```

## Key Features

### Authentication
- JWT-based authentication
- Role-based access control
- Secure token storage

### JQR Management
- Task assignment based on operator levels
- Bulk editing capabilities
- Progress tracking
- Sync with team roster

### Team Roster
- Operator profile management
- Level assignment
- Compliance tracking
- Active status management

### UI/UX
- Responsive design
- Material-UI components
- Consistent styling
- Intuitive navigation

## Component Guidelines

### State Management
- Use React hooks for local state
- Implement proper state updates
- Handle loading and error states

### API Integration
- Use Axios for API calls
- Implement proper error handling
- Handle authentication tokens

### Styling
- Follow Material-UI guidelines
- Use consistent spacing and typography
- Implement responsive design patterns

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## Common Issues

### Frontend Not Loading
- Check frontend container logs: `docker compose logs frontend`
- Verify backend service is running: `docker compose ps`
- Check network connectivity between containers
- Verify API URL in docker-compose.yml

### API Connection Issues
- Verify backend service is running
- Check network connectivity between containers
- Verify API endpoints are accessible
- Check CORS settings in docker-compose.yml

### File Upload Issues
- Verify upload directory permissions
- Check file size limits
- Ensure proper file type validation

### Authentication Problems
- Clear browser storage
- Verify token format
- Check authentication endpoints

## Performance Optimization

- Implement proper React hooks usage
- Use React.memo for expensive components
- Optimize re-renders
- Implement proper code splitting

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest) 