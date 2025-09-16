import { Modal, Button, Badge } from 'react-bootstrap';
import moment from 'moment';

export default function TaskDetailModal({ show, onHide, task }) {
  const getStatusBadgeVariant = (status) => {
    switch (status) {
    case 'Completed':
      return 'success';
    case 'In Progress':
      return 'warning';
    case 'To Do':
    default:
      return 'danger';
    }
  };

  const formatDate = (dateString) => {
    return moment(dateString).format('MMMM Do, YYYY');
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Task Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {task && (
          <div>
            <h5 className="mb-3">{task.taskName}</h5>
            
            <div className="mb-3">
              <strong>Status:</strong>{' '}
              <Badge bg={getStatusBadgeVariant(task.taskProgress)}>
                {task.taskProgress}
              </Badge>
            </div>

            <div className="mb-3">
              <strong>Deadline:</strong>{' '}
              <span className="text-muted">
                {formatDate(task.taskDeadline)}
              </span>
            </div>

            {task.taskDescription && (
              <div className="mb-3">
                <strong>Description:</strong>
                <p className="mt-1 text-muted">{task.taskDescription}</p>
              </div>
            )}

            {task.taskCreator && (
              <div className="mb-3">
                <strong>Created by:</strong>{' '}
                <span className="text-muted">{task.taskCreator.name}</span>
              </div>
            )}

            {task.taskAssignee && (
              <div className="mb-3">
                <strong>Assigned to:</strong>{' '}
                <span className="text-muted">{task.taskAssignee.name}</span>
              </div>
            )}

            {/* Show overdue warning if task is past deadline and not completed */}
            {task.taskProgress !== 'Completed' && 
             new Date(task.taskDeadline) < new Date() && (
              <div className="alert alert-warning mb-0">
                <strong>⚠️ Overdue:</strong> This task is past its deadline.
              </div>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}