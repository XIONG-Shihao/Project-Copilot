import { useState } from 'react';
import { ListGroup, Badge, Button, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ProjectService from '../services/project.service';

const getStatusVariant = (status) => {
  switch (status) {
  case 'To Do': return 'danger'; // red
  case 'In Progress': return 'warning'; // yellow
  case 'Completed': return 'success'; // green
  default: return 'secondary'; // grey, should never happen
  }
};

const getStatusColor = (status) => {
  switch (status) {
  case 'To Do': return '#dc3545'; // Red
  case 'In Progress': return '#ffc107'; // Yellow
  case 'Completed': return '#28a745'; // Green
  default: return '#6c757d'; // Gray
  }
};

export default function TaskItem({ 
  task,
  project,
  projectId,
  isProjectManager,
  onTaskUpdated,
  onEditTask,
  canEditTask
}) {
  const [assigningTask, setAssigningTask] = useState(false);
  const [taskAssignDropdown, setTaskAssignDropdown] = useState(false);
  const [taskSelectedAssignee, setTaskSelectedAssignee] = useState('');

  // Get assignable members (exclude viewers)
  const getAssignableMembers = () => {
    if (!project?.members) return [];
    return project.members.filter(member => 
      member.role && member.role.roleName !== 'viewer'
    );
  };

  const handleInlineTaskAssign = async (taskId, memberId) => {
    setAssigningTask(true);
    try {
      await ProjectService.assignTask(projectId, taskId, memberId);
      toast.success('Task assigned successfully!');
      setTaskAssignDropdown(false);
      await onTaskUpdated(); // Refresh project data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign task.');
    } finally {
      setAssigningTask(false);
    }
  };

  const getAssigneeDetails = (taskAssigneeId) => {
    if (!taskAssigneeId || !project?.members) return null;
    const member = project.members.find(m => m.user._id === taskAssigneeId);
    return member ? member.user : null;
  };

  const isDeadlineOverdue = (deadline, taskProgress) => {
    if (!deadline || taskProgress === 'Completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDeleteTask = async (taskId, taskName) => {
    if (!window.confirm(`Are you sure you want to delete the task "${taskName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await ProjectService.deleteTask(projectId, taskId);
      toast.success('Task deleted successfully!');
      await onTaskUpdated(); // Refresh project data to remove deleted task
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  // Assignee component - extracted for readability
  const AssigneeComponent = () => {
    if (task.taskAssignee) {
      return (
        <div className="d-flex align-items-center">
          <div 
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
            style={{ width: '20px', height: '20px', fontSize: '10px', flexShrink: 0 }}
          >
            {getAssigneeDetails(task.taskAssignee._id)?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {isProjectManager && !taskAssignDropdown ? (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none text-start"
              style={{ 
                fontSize: '0.875rem', 
                minWidth: '80px',
                transition: 'all 0.2s ease',
                borderRadius: '4px',
                padding: '2px 6px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e9ecef';
                e.target.style.color = '#495057';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '';
              }}
              onClick={() => {
                setTaskAssignDropdown(true);
                setTaskSelectedAssignee(task.taskAssignee._id);
              }}
              disabled={assigningTask}
            >
              {getAssigneeDetails(task.taskAssignee._id)?.name || 'Unknown'}
            </Button>
          ) : isProjectManager && taskAssignDropdown ? (
            <div className="d-flex align-items-center" style={{ minWidth: '200px' }}>
              <Form.Select
                size="sm"
                value={taskSelectedAssignee || task.taskAssignee._id}
                onChange={e => setTaskSelectedAssignee(e.target.value)}
                style={{ minWidth: 120, fontSize: '0.75rem' }}
                disabled={assigningTask}
              >
                {getAssignableMembers().map(member => (
                  <option key={member.user._id} value={member.user._id}>
                    {member.user.name} ({member.role?.roleName || 'No role'})
                  </option>
                ))}
              </Form.Select>
              <Button
                variant="success"
                size="sm"
                className="ms-1"
                style={{ padding: '0.125rem 0.375rem' }}
                onClick={() => handleInlineTaskAssign(task._id, taskSelectedAssignee)}
                disabled={assigningTask}
              >
                ✓
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="ms-1"
                style={{ padding: '0.125rem 0.375rem' }}
                onClick={() => setTaskAssignDropdown(false)}
                disabled={assigningTask}
              >
                ✕
              </Button>
            </div>
          ) : (
            <span style={{ minWidth: '80px' }}>{getAssigneeDetails(task.taskAssignee._id)?.name || 'Unknown'}</span>
          )}
        </div>
      );
    } else {
      return (
        <div className="d-flex align-items-center">
          <div 
            className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2"
            style={{ width: '20px', height: '20px', fontSize: '10px', flexShrink: 0 }}
          >
            ?
          </div>
          {isProjectManager && !taskAssignDropdown ? (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none text-muted text-start"
              style={{ 
                fontSize: '0.875rem', 
                minWidth: '80px',
                transition: 'all 0.2s ease',
                borderRadius: '4px',
                padding: '2px 6px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e9ecef';
                e.target.style.color = '#495057';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#6c757d';
              }}
              onClick={() => {
                setTaskAssignDropdown(true);
                setTaskSelectedAssignee('');
              }}
              disabled={assigningTask}
            >
              Unassigned
            </Button>
          ) : isProjectManager && taskAssignDropdown ? (
            <div className="d-flex align-items-center" style={{ minWidth: '200px' }}>
              <Form.Select
                size="sm"
                value={taskSelectedAssignee || ''}
                onChange={e => setTaskSelectedAssignee(e.target.value)}
                style={{ minWidth: 120, fontSize: '0.75rem' }}
                disabled={assigningTask}
              >
                <option value="">Select member</option>
                {getAssignableMembers().map(member => (
                  <option key={member.user._id} value={member.user._id}>
                    {member.user.name} ({member.role?.roleName || 'No role'})
                  </option>
                ))}
              </Form.Select>
              <Button
                variant="success"
                size="sm"
                className="ms-1"
                style={{ padding: '0.125rem 0.375rem' }}
                onClick={() => handleInlineTaskAssign(task._id, taskSelectedAssignee)}
                disabled={assigningTask || !taskSelectedAssignee}
              >
                ✓
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="ms-1"
                style={{ padding: '0.125rem 0.375rem' }}
                onClick={() => setTaskAssignDropdown(false)}
                disabled={assigningTask}
              >
                ✕
              </Button>
            </div>
          ) : (
            <span className="text-muted" style={{ minWidth: '80px' }}>Unassigned</span>
          )}
        </div>
      );
    }
  };

  return (
    <ListGroup.Item 
      className="px-0 py-3 mb-2 shadow-sm" 
      style={{
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        borderLeft: `4px solid ${getStatusColor(task.taskProgress)}`,
        backgroundColor: '#fff',
        overflow: 'hidden'
      }}
      data-status={task.taskProgress}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
      }}
    >
      <div className="d-flex align-items-start px-3">
        {/* Left Side - Task Name and Description */}
        <div className="flex-grow-1 me-4" style={{ maxWidth: '50%' }}>
          <div className="fw-bold fs-6 mb-2 text-start">{task.taskName}</div>
          <div className="text-muted small text-start text-truncate">{task.taskDescription}</div>
        </div>
        
        {/* Right Side - Status, Deadline, Assignee, Actions */}
        <div className="d-flex flex-column align-items-end" style={{ minWidth: '50%' }}>
          <div className="d-flex align-items-center mb-2 w-100 justify-content-end">
            <Badge bg={getStatusVariant(task.taskProgress)} className="me-3">{task.taskProgress}</Badge>
            <div className="d-flex align-items-center me-3">
              <span className="me-1">📅</span>
              <span 
                className="small" 
                style={{ 
                  color: isDeadlineOverdue(task.taskDeadline, task.taskProgress) ? '#dc3545' : 'inherit',
                  fontWeight: isDeadlineOverdue(task.taskDeadline, task.taskProgress) ? 'bold' : 'normal'
                }}
              >
                {formatDate(task.taskDeadline)}
              </span>
            </div>
            <div className="me-3">
              <AssigneeComponent />
            </div>
            <div className="ms-2">
              <Button
                variant="outline-secondary"
                size="sm"
                className="me-2"
                onClick={() => onEditTask(task)}
                disabled={!canEditTask(task)}
              >
                Edit
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDeleteTask(task._id, task.taskName)}
                disabled={!canEditTask(task)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ListGroup.Item>
  );
}
