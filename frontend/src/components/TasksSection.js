import { useState } from 'react';
import { Card, Button, ListGroup, Modal, Form, Spinner, ButtonGroup, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ProjectService from '../services/project.service';
import TaskItem from './TaskItem';
import ProgressView from './ProgressView';

export default function TasksSection({ 
  project,
  projectId,
  onTasksUpdated,
  isProjectManager,
  isViewer,
  canEditTask,
  currentUser
}) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [editTaskModal, setEditTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDeadline, setEditTaskDeadline] = useState('');
  const [editTaskProgress, setEditTaskProgress] = useState('');
  const [updatingTask, setUpdatingTask] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'progress'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  const handleCreateTask = () => {
    setShowTaskModal(true);
  };

  const handleTaskModalClose = () => {
    setShowTaskModal(false);
    setTaskName('');
    setTaskDescription('');
    setTaskDeadline('');
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskName || !taskDescription || !taskDeadline) {
      toast.error('Please fill in all fields.');
      return;
    }
    setCreatingTask(true);
    try {
      await ProjectService.createTask(projectId, taskName, taskDescription, taskDeadline);
      toast.success('Task created successfully!');
      handleTaskModalClose();
      await onTasksUpdated(); // Refresh project data to show new task
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setCreatingTask(false);
    }
  };

  const openEditTaskModal = (task) => {
    setEditTask(task);
    setEditTaskName(task.taskName);
    setEditTaskDescription(task.taskDescription);
    setEditTaskDeadline(task.taskDeadline ? task.taskDeadline.slice(0, 10) : '');
    setEditTaskProgress(task.taskProgress || 'To Do');
    setEditTaskModal(true);
  };

  const closeEditTaskModal = () => {
    setEditTaskModal(false);
    setEditTask(null);
    setEditTaskName('');
    setEditTaskDescription('');
    setEditTaskDeadline('');
    setEditTaskProgress('');
  };

  const handleEditTaskSubmit = async (e) => {
    e.preventDefault();
    if (!editTask) return;
    // Only allow update if at least one field changed
    if (
      editTaskName === editTask.taskName &&
      editTaskDescription === editTask.taskDescription &&
      editTaskDeadline === (editTask.taskDeadline ? editTask.taskDeadline.slice(0, 10) : '') &&
      editTaskProgress === (editTask.taskProgress || 'To Do')
    ) {
      toast.error('You must change at least one field to update the task.');
      return;
    }
    setUpdatingTask(true);
    try {
      await ProjectService.updateTask(projectId, editTask._id, {
        ...(editTaskName !== editTask.taskName && { taskName: editTaskName }),
        ...(editTaskDescription !== editTask.taskDescription && { taskDescription: editTaskDescription }),
        ...(editTaskDeadline !== (editTask.taskDeadline ? editTask.taskDeadline.slice(0, 10) : '') && { taskDeadline: editTaskDeadline }),
        ...(editTaskProgress !== (editTask.taskProgress || 'To Do') && { taskProgress: editTaskProgress })
      });
      toast.success('Task updated successfully!');
      closeEditTaskModal();
      await onTasksUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task.');
    } finally {
      setUpdatingTask(false);
    }
  };

  const getSortedTasks = () => {
    if (!project.tasks) return [];
    
    return [...project.tasks].sort((a, b) => {
      const aValue = new Date(a.taskDeadline);
      const bValue = new Date(b.taskDeadline);
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  // Helper function to get tasks assigned to the current user
  const getUserTasks = () => {
    if (!project.tasks || !currentUser) return [];
    return getSortedTasks().filter(task => 
      task.taskAssignee && task.taskAssignee._id === currentUser._id
    );
  };

  // Helper function to get tasks due this week
  const getTasksDueThisWeek = () => {
    if (!project.tasks) return [];
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of current week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);
    
    return getSortedTasks().filter(task => {
      if (!task.taskDeadline) return false;
      const deadlineDate = new Date(task.taskDeadline);
      return deadlineDate >= startOfWeek && deadlineDate <= endOfWeek;
    });
  };

  const renderTaskSummary = () => {
    const tasks = project.tasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.taskProgress === 'Completed').length;
    const inProgressTasks = tasks.filter(task => task.taskProgress === 'In Progress').length;
    const todoTasks = tasks.filter(task => task.taskProgress === 'To Do').length;
    
    return (
      <Card className="shadow-sm bg-white mb-4">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0">Task Summary</h5>
        </Card.Header>
        <Card.Body>
          <Row className="text-center">
            <Col md={3}>
              <Card className="task-summary-card shadow-sm h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                  <div className="summary-icon bg-primary rounded-circle text-white mb-2">
                    <i className="fas fa-tasks"></i>
                  </div>
                  <h3>{totalTasks}</h3>
                  <p className="text-muted mb-0">Total Tasks</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="task-summary-card shadow-sm h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                  <div className="summary-icon bg-success rounded-circle text-white mb-2">
                    <i className="fas fa-check"></i>
                  </div>
                  <h3>{completedTasks}</h3>
                  <p className="text-muted mb-0">Completed</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="task-summary-card shadow-sm h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                  <div className="summary-icon bg-warning rounded-circle text-white mb-2">
                    <i className="fas fa-spinner"></i>
                  </div>
                  <h3>{inProgressTasks}</h3>
                  <p className="text-muted mb-0">In Progress</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="task-summary-card shadow-sm h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                  <div className="summary-icon bg-danger rounded-circle text-white mb-2">
                    <i className="fas fa-clipboard-list"></i>
                  </div>
                  <h3>{todoTasks}</h3>
                  <p className="text-muted mb-0">To Do</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  const renderYourTasks = () => {
    const userTasks = getUserTasks();
    
    if (userTasks.length === 0) return null;
    
    return (
      <Card className="shadow-sm bg-white mb-4">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0">Your Assigned Tasks</h5>
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            {userTasks.map((task, idx) => (
              <TaskItem
                key={`your-${task._id || idx}`}
                task={task}
                project={project}
                projectId={projectId}
                isProjectManager={isProjectManager}
                onTaskUpdated={onTasksUpdated}
                onEditTask={openEditTaskModal}
                canEditTask={canEditTask}
              />
            ))}
          </ListGroup>
        </Card.Body>
      </Card>
    );
  };

  const renderTasksDueThisWeek = () => {
    const tasksDueThisWeek = getTasksDueThisWeek();
    
    if (tasksDueThisWeek.length === 0) return null;
    
    return (
      <Card className="shadow-sm bg-white mb-4">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0">Tasks Due This Week</h5>
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            {tasksDueThisWeek.map((task, idx) => (
              <TaskItem
                key={`due-${task._id || idx}`}
                task={task}
                project={project}
                projectId={projectId}
                isProjectManager={isProjectManager}
                onTaskUpdated={onTasksUpdated}
                onEditTask={openEditTaskModal}
                canEditTask={canEditTask}
              />
            ))}
          </ListGroup>
        </Card.Body>
      </Card>
    );
  };

  const renderListView = () => {
    const sortedTasks = getSortedTasks();
    return (
      <>
        {sortedTasks && sortedTasks.length > 0 ? (
          <ListGroup variant="flush">
            {sortedTasks.map((task, idx) => (
              <TaskItem
                key={task._id || idx}
                task={task}
                project={project}
                projectId={projectId}
                isProjectManager={isProjectManager}
                onTaskUpdated={onTasksUpdated}
                onEditTask={openEditTaskModal}
                canEditTask={canEditTask}
              />
            ))}
          </ListGroup>
        ) : (
          <div className="text-center py-5">
            <h6 className="text-muted">No tasks yet</h6>
            <p className="text-muted small">Create your first task to get started</p>
            {!isViewer && (
              <Button variant="outline-primary" size="sm" onClick={handleCreateTask}>
                Create Your First Task
              </Button>
            )}
            {isViewer && (
              <p className="text-muted small">Only administrators and developers can create tasks</p>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* Task Summary Section */}
      {renderTaskSummary()}
      
      {/* User Assigned Tasks Section */}
      {renderYourTasks()}
      
      {/* Tasks Due This Week Section */}
      {renderTasksDueThisWeek()}

      {/* Tasks Section */}
      <Card className="shadow-sm bg-white">
        <Card.Header className="d-flex justify-content-between align-items-center bg-white border-0">
          <div className="w-100 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <h5 className="mb-0 me-3">All Tasks</h5>
              <Button
                variant="outline-secondary"
                size="sm"
                className="me-3"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑☰' : '↓☰'}
              </Button>
            </div>
            <div className="d-flex align-items-center">
              <ButtonGroup className="me-3">
                <Button 
                  variant={viewMode === 'list' ? 'primary' : 'outline-primary'} 
                  onClick={() => setViewMode('list')}
                >
                  List View
                </Button>
                <Button 
                  variant={viewMode === 'progress' ? 'primary' : 'outline-primary'} 
                  onClick={() => setViewMode('progress')}
                >
                  Progress View
                </Button>
              </ButtonGroup>
              {!isViewer && (
                <Button variant="primary" size="sm" onClick={handleCreateTask}>
                  + Create Task
                </Button>
              )}
            </div>
          </div>
        </Card.Header>
        <Card.Body className="pt-3 bg-white">
          {viewMode === 'progress' 
            ? <ProgressView tasks={getSortedTasks()} onEditTask={openEditTaskModal} canEditTask={canEditTask} /> 
            : renderListView()
          }
        </Card.Body>
      </Card>

      {/* Task Creation Modal */}
      <Modal show={showTaskModal} onHide={handleTaskModalClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Task</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleTaskSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="taskName">
              <Form.Label>Task Name</Form.Label>
              <Form.Control
                type="text"
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
                required
                placeholder="Enter task name"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="taskDescription">
              <Form.Label>Task Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
                required
                placeholder="Enter task description"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="taskDeadline">
              <Form.Label>Task Deadline</Form.Label>
              <Form.Control
                type="date"
                value={taskDeadline}
                onChange={e => setTaskDeadline(e.target.value)}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleTaskModalClose} disabled={creatingTask}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={creatingTask}>
              {creatingTask ? <Spinner animation="border" size="sm" /> : 'Create Task'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal show={editTaskModal} onHide={closeEditTaskModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Task</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditTaskSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="editTaskName">
              <Form.Label>Task Name</Form.Label>
              <Form.Control
                type="text"
                value={editTaskName}
                onChange={e => setEditTaskName(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="editTaskDescription">
              <Form.Label>Task Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editTaskDescription}
                onChange={e => setEditTaskDescription(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="editTaskDeadline">
              <Form.Label>Task Deadline</Form.Label>
              <Form.Control
                type="date"
                value={editTaskDeadline}
                onChange={e => setEditTaskDeadline(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="editTaskProgress">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={editTaskProgress}
                onChange={e => setEditTaskProgress(e.target.value)}
                required
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeEditTaskModal} disabled={updatingTask}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={updatingTask}>
              {updatingTask ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
