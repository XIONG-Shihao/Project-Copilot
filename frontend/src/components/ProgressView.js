import { Row, Col, Card, Button } from 'react-bootstrap';

export default function ProgressView({ 
  tasks, 
  onEditTask,
  canEditTask
}) {
  // Group tasks by status
  const todoTasks = tasks?.filter(task => task.taskProgress === 'To Do') || [];
  const inProgressTasks = tasks?.filter(task => task.taskProgress === 'In Progress') || [];
  const completedTasks = tasks?.filter(task => task.taskProgress === 'Completed') || [];
  
  const isDeadlineOverdue = (deadline, taskProgress) => {
    if (!deadline || taskProgress === 'Completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  const getStatusColor = (status) => {
    switch (status) {
    case 'To Do': return '#dc3545'; // Red
    case 'In Progress': return '#ffc107'; // Yellow
    case 'Completed': return '#28a745'; // Green
    default: return '#6c757d'; // Gray
    }
  };

  const renderTaskCard = (task) => {
    return (
      <Card 
        key={task._id} 
        className="mb-2 shadow-sm task-card"
        data-status={task.taskProgress}
      >
        <Card.Body className="p-3">
          <div className="d-flex justify-content-between mb-2">
            <h6 className="mb-0">{task.taskName}</h6>
            <div className="task-actions">
              {canEditTask(task) && (
                <Button
                  variant="link"
                  className="p-0 text-muted"
                  size="sm"
                  onClick={() => onEditTask(task)}
                >
                  <i className="fas fa-edit"></i>
                </Button>
              )}
            </div>
          </div>
          <p className="small text-muted mb-2">{task.taskDescription}</p>
          <div className="d-flex justify-content-between align-items-center">
            <small>
              <span 
                style={{ 
                  color: isDeadlineOverdue(task.taskDeadline, task.taskProgress) ? '#dc3545' : '#6c757d',
                  fontWeight: isDeadlineOverdue(task.taskDeadline, task.taskProgress) ? 'bold' : 'normal'
                }}
              >
                📅 {formatDate(task.taskDeadline)}
              </span>
            </small>
            {task.taskAssignee && (
              <div 
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                style={{ width: '24px', height: '24px', fontSize: '12px' }}
                title={task.taskAssignee.name}
              >
                {task.taskAssignee.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderColumn = (title, tasks, status) => {
    const textColor = status === 'In Progress' ? 'text-dark' : 'text-white';
    
    return (
      <Col md={4} className="progress-column">
        <div className="kanban-column h-100">
          <div className="kanban-column-header" style={{ backgroundColor: getStatusColor(status) }}>
            <h6 className={`mb-0 ${textColor} py-2`}>{title} ({tasks.length})</h6>
          </div>
          <div className="kanban-column-body p-2">
            {tasks.length > 0 ? (
              tasks.map(task => renderTaskCard(task))
            ) : (
              <div className="text-center py-5 my-5">
                <p className="text-muted mb-0">No tasks</p>
              </div>
            )}
          </div>
        </div>
      </Col>
    );
  };

  return (
    <Row className="g-3 progress-row">
      {renderColumn('To Do', todoTasks, 'To Do')}
      {renderColumn('In Progress', inProgressTasks, 'In Progress')}
      {renderColumn('Completed', completedTasks, 'Completed')}
    </Row>
  );
} 