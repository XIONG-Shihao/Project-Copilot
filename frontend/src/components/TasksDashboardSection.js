import { Row, Col } from 'react-bootstrap';
import TasksSection from './TasksSection';

export default function TasksDashboardSection({ 
  project, 
  projectId, 
  currentUser, 
  onTasksUpdated,
  isViewer,
  canEditTask 
}) {
  const isProjectManager = () => {
    if (!currentUser || !project || !project.members) return false;
    const member = project.members.find(
      m => m.user._id?.toString() === currentUser._id?.toString()
    );
    return member && member.role && member.role.roleName === 'administrator';
  };

  return (
    <Row>
      <Col className="mb-4">
        <TasksSection 
          project={project}
          projectId={projectId}
          onTasksUpdated={onTasksUpdated}
          isProjectManager={isProjectManager()}
          isViewer={isViewer}
          canEditTask={canEditTask}
          currentUser={currentUser}
        />
      </Col>
    </Row>
  );
} 