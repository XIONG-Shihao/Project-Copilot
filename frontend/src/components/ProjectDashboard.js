import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, ListGroup, Modal, Form, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import AuthService from '../services/auth.service';
import ProjectService from '../services/project.service';
import AppNavbar from './AppNavbar';
import TasksSection from './TasksSection';
import ProjectNavbar from './ProjectNavbar';
import MembersSection from './MembersSection';
import TasksDashboardSection from './TasksDashboardSection';
import ProjectCalendar from './Calendar';
import ProjectSettings from './ProjectSettings';
import AIChatbot from './AIChatbot';
import PostsSection from './PostsSection';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [assigningRole, setAssigningRole] = useState(false);
  const [roleDropdown, setRoleDropdown] = useState({}); // { memberId: boolean }
  const [selectedRole, setSelectedRole] = useState({}); // { memberId: roleName }
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [generatingInviteLink, setGeneratingInviteLink] = useState(false);
  const [showRoleConfirmModal, setShowRoleConfirmModal] = useState(false);
  const [roleChangeDetails, setRoleChangeDetails] = useState({ memberId: null, memberName: '', oldRole: '', newRole: '' });
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const response = await ProjectService.getProjectById(projectId);
      setProject(response.data);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        // Clear stale user data from localStorage to prevent redirect loop
        localStorage.removeItem('user');
        navigate('/login', { state: { sessionExpired: true } });
      } else if (err.response?.status === 403) {
        toast.error('You do not have access to this project.', {
          autoClose: 3000,
          onClose: () => navigate('/dashboard')
        });
      } else if (err.response?.status === 404) {
        toast.error('Project not found.', {
          autoClose: 3000,
          onClose: () => navigate('/dashboard')
        });
      } else {
        setError(`Failed to load project: ${err.response?.data?.message || err.message}`);
        setLoading(false);
      }
    }
  }, [projectId, navigate]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await AuthService.getUserProfile();
        setCurrentUser(res.data.user);
      } catch (err) {
        if (err.response?.status === 401) {
          // Clear stale user data from localStorage to prevent redirect loop
          localStorage.removeItem('user');
          navigate('/login', { state: { sessionExpired: true } });
        }
      }
    };

    fetchUserProfile();
    fetchProject();
  }, [projectId, navigate, fetchProject]);

  const goBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
  };

  const isProjectManager = () => {
    if (!currentUser || !project || !project.members) return false;
    const member = project.members.find(
      m => m.user._id?.toString() === currentUser._id?.toString()
    );
    return member && member.role && member.role.roleName === 'administrator';
  };

  const isViewer = () => {
    if (!currentUser || !project || !project.members) return false;
    const member = project.members.find(
      m => m.user._id?.toString() === currentUser._id?.toString()
    );
    return member && member.role && member.role.roleName === 'viewer';
  };

  const canEditTask = (task) => {
    if (!currentUser || !project || !project.members) return false;
    
    // Project managers can edit any task
    if (isProjectManager()) return true;
    
    // Viewers cannot edit any task
    if (isViewer()) return false;
    
    // Developers can only edit tasks they created
    const member = project.members.find(
      m => m.user._id?.toString() === currentUser._id?.toString()
    );
    if (member && member.role && member.role.roleName === 'developer') {
      return task.taskCreator && task.taskCreator._id?.toString() === currentUser._id?.toString();
    }
    
    return false;
  };

  const handleSaveRoleClick = (memberId, memberName, oldRole, newRole) => {
    // Check if the role is actually changing
    if (oldRole === newRole) {
      // No change needed, just close the dropdown
      setRoleDropdown((prev) => ({ ...prev, [memberId]: false }));
      return;
    }
    
    setRoleChangeDetails({
      memberId,
      memberName,
      oldRole: oldRole || 'No role',
      newRole
    });
    setShowRoleConfirmModal(true);
  };

  const handleConfirmRoleChange = async () => {
    const { memberId, newRole } = roleChangeDetails;
    setShowRoleConfirmModal(false);
    setAssigningRole(true);
    try {
      await ProjectService.assignRole(projectId, memberId, newRole);
      toast.success('Role changed successfully!');
      setRoleDropdown((prev) => ({ ...prev, [memberId]: false }));
      await fetchProject();
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg && msg.includes('There must be at least one administrator')) {
        toast.error('There must be at least one administrator in the project.');
      } else {
        toast.error(msg || 'Failed to change role.');
      }
    } finally {
      setAssigningRole(false);
    }
  };

  const handleCancelRoleChange = () => {
    setShowRoleConfirmModal(false);
    setRoleChangeDetails({ memberId: null, memberName: '', oldRole: '', newRole: '' });
  };

  const handleGenerateInviteLink = async () => {
    setGeneratingInviteLink(true);
    try {
      const response = await ProjectService.generateInviteLink(projectId);
      const token = response.data.inviteLink.token;
      const fullInviteLink = `${window.location.origin}/join/${token}`;
      setInviteLink(fullInviteLink);
      setShowInviteLinkModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invite link.');
    } finally {
      setGeneratingInviteLink(false);
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      toast.success('Invite link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy invite link.');
    });
  };

  const closeInviteLinkModal = () => {
    setShowInviteLinkModal(false);
    setInviteLink('');
  };

  const handleDownloadProjectSummary = async () => {
    setDownloadingPdf(true);
    try {
      const response = await ProjectService.exportProjectSummary(projectId);
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate a clean filename
      const cleanProjectName = project.projectName.replace(/[^a-zA-Z0-9]/g, '-');
      link.download = `project-summary-${cleanProjectName}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Project summary downloaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download project summary.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleRemoveMemberClick = (member) => {
    setMemberToRemove(member);
    setShowRemoveMemberModal(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    setRemovingMember(true);
    try {
      await ProjectService.removeMember(projectId, memberToRemove.user._id);
      toast.success('Member removed successfully!');
      setShowRemoveMemberModal(false);
      setMemberToRemove(null);
      await fetchProject();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message;
      toast.error(msg || 'Failed to remove member.');
    } finally {
      setRemovingMember(false);
    }
  };

  const closeRemoveMemberModal = () => {
    setShowRemoveMemberModal(false);
    setMemberToRemove(null);
  };

  // Calculate project completion data from tasks
  const tasks = project?.tasks || [];
  const totalTasks = tasks.length;
  const completedCount = tasks.filter(t => t.taskProgress === 'Completed').length;
  const inProgressCount = tasks.filter(t => t.taskProgress === 'In Progress').length;
  const todoCount = tasks.filter(t => t.taskProgress === 'To Do').length;
  const percentCompleted = totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0;

  const completionData = {
    labels: ['Completed', 'In Progress', 'To Do'],
    datasets: [
      {
        data: [completedCount, inProgressCount, todoCount],
        backgroundColor: [
          '#28a745', // Green for completed
          '#ffc107', // Yellow for in progress
          '#dc3545', // Red for to do
        ],
        borderColor: [
          '#28a745',
          '#ffc107',
          '#dc3545',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
            return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
          }
        }
      }
    },
  };

  // Render the correct section based on activeSection state
  const renderActiveSection = () => {
    switch (activeSection) {
    case 'overview':
      return (
        <>
          {/* Project Content */}
          <Row className="mb-4">
            {/* Members Section */}
            <Col md={6} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Project Members</h5>
                  {isProjectManager() && project.settings?.joinByLinkEnabled && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={handleGenerateInviteLink}
                      disabled={generatingInviteLink}
                    >
                      {generatingInviteLink ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        '+ Invite Link'
                      )}
                    </Button>
                  )}
                </Card.Header>
                <Card.Body>
                  {project.members && project.members.length > 0 ? (
                    <div>
                      {/* Administrators Section */}
                      {project.members.filter(member => member.role?.roleName === 'administrator').length > 0 && (
                        <div className="mb-4">
                          <h6 className="text-primary mb-3 text-start">Administrators</h6>
                          <ListGroup variant="flush" className="mb-3">
                            {project.members
                              .filter(member => member.role?.roleName === 'administrator')
                              .map((member, index) => (
                                <ListGroup.Item key={`admin-${index}`} className="px-0">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center">
                                      <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                                        style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                                        {member.user.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                                      </div>
                                      <div className="text-start">
                                        <div className="fw-medium">{member.user.name || 'Unknown User'}</div>
                                        <div className="text-muted small">{member.role?.roleName || 'No role assigned'}</div>
                                      </div>
                                    </div>
                                    {isProjectManager() && (
                                      <div>
                                        <Button
                                          variant="outline-secondary"
                                          size="sm"
                                          className="ms-2"
                                          onClick={() => {
                                            setRoleDropdown((prev) => ({ ...prev, [member.user._id]: !prev[member.user._id] }));
                                            setSelectedRole((prev) => {
                                              if (prev[member.user._id]) return prev;
                                              return { ...prev, [member.user._id]: member.role?.roleName || 'developer' };
                                            });
                                          }}
                                          disabled={assigningRole}
                                        >
                                          Edit Role
                                        </Button>
                                        {roleDropdown[member.user._id] && (
                                          <Form.Select
                                            size="sm"
                                            className="d-inline-block w-auto ms-2"
                                            value={selectedRole[member.user._id] || member.role?.roleName || 'developer'}
                                            onChange={e => setSelectedRole((prev) => ({ ...prev, [member.user._id]: e.target.value }))}
                                            style={{ minWidth: 120 }}
                                            disabled={assigningRole}
                                          >
                                            <option value="administrator">administrator</option>
                                            <option value="developer">developer</option>
                                            <option value="viewer">viewer</option>
                                          </Form.Select>
                                        )}
                                        {roleDropdown[member.user._id] && (
                                          <Button
                                            variant="success"
                                            size="sm"
                                            className="ms-2"
                                            onClick={() => handleSaveRoleClick(
                                              member.user._id, 
                                              member.user.name, 
                                              member.role?.roleName, 
                                              selectedRole[member.user._id]
                                            )}
                                            disabled={assigningRole}
                                          >
                                            Save
                                          </Button>
                                        )}
                                        {member.user._id !== currentUser._id && (
                                          <Button
                                            variant="outline-danger"
                                            size="sm"
                                            className="ms-2"
                                            onClick={() => handleRemoveMemberClick(member)}
                                            disabled={assigningRole || removingMember}
                                          >
                                            Remove
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </ListGroup.Item>
                              ))}
                          </ListGroup>
                        </div>
                      )}

                      {/* Developers Section */}
                      {project.members.filter(member => member.role?.roleName === 'developer').length > 0 && (
                        <div className="mb-4">
                          <h6 className="text-success mb-3 text-start">Developers</h6>
                          <ListGroup variant="flush" className="mb-3">
                            {project.members
                              .filter(member => member.role?.roleName === 'developer')
                              .map((member, index) => (
                                <ListGroup.Item key={`dev-${index}`} className="px-0">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center">
                                      <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-3"
                                        style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                                        {member.user.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                                      </div>
                                      <div className="text-start">
                                        <div className="fw-medium">{member.user.name || 'Unknown User'}</div>
                                        <div className="text-muted small">{member.role?.roleName || 'No role assigned'}</div>
                                      </div>
                                    </div>
                                    {isProjectManager() && (
                                      <div>
                                        <Button
                                          variant="outline-secondary"
                                          size="sm"
                                          className="ms-2"
                                          onClick={() => {
                                            setRoleDropdown((prev) => ({ ...prev, [member.user._id]: !prev[member.user._id] }));
                                            setSelectedRole((prev) => {
                                              if (prev[member.user._id]) return prev;
                                              return { ...prev, [member.user._id]: member.role?.roleName || 'developer' };
                                            });
                                          }}
                                          disabled={assigningRole}
                                        >
                                          Edit Role
                                        </Button>
                                        {roleDropdown[member.user._id] && (
                                          <Form.Select
                                            size="sm"
                                            className="d-inline-block w-auto ms-2"
                                            value={selectedRole[member.user._id] || member.role?.roleName || 'developer'}
                                            onChange={e => setSelectedRole((prev) => ({ ...prev, [member.user._id]: e.target.value }))}
                                            style={{ minWidth: 120 }}
                                            disabled={assigningRole}
                                          >
                                            <option value="administrator">administrator</option>
                                            <option value="developer">developer</option>
                                            <option value="viewer">viewer</option>
                                          </Form.Select>
                                        )}
                                        {roleDropdown[member.user._id] && (
                                          <Button
                                            variant="success"
                                            size="sm"
                                            className="ms-2"
                                            onClick={() => handleSaveRoleClick(
                                              member.user._id, 
                                              member.user.name, 
                                              member.role?.roleName, 
                                              selectedRole[member.user._id]
                                            )}
                                            disabled={assigningRole}
                                          >
                                            Save
                                          </Button>
                                        )}
                                        {member.user._id !== currentUser._id && (
                                          <Button
                                            variant="outline-danger"
                                            size="sm"
                                            className="ms-2"
                                            onClick={() => handleRemoveMemberClick(member)}
                                            disabled={assigningRole || removingMember}
                                          >
                                            Remove
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </ListGroup.Item>
                              ))}
                          </ListGroup>
                        </div>
                      )}

                      {/* Viewers Section */}
                      {project.members.filter(member => member.role?.roleName === 'viewer').length > 0 && (
                        <div className="mb-4">
                          <h6 className="text-secondary mb-3 text-start">Viewers</h6>
                          <ListGroup variant="flush" className="mb-3">
                            {project.members
                              .filter(member => member.role?.roleName === 'viewer')
                              .map((member, index) => (
                                <ListGroup.Item key={`viewer-${index}`} className="px-0">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center">
                                      <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-3"
                                        style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                                        {member.user.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                                      </div>
                                      <div className="text-start">
                                        <div className="fw-medium">{member.user.name || 'Unknown User'}</div>
                                        <div className="text-muted small">{member.role?.roleName || 'No role assigned'}</div>
                                      </div>
                                    </div>
                                    {isProjectManager() && (
                                      <div>
                                        <Button
                                          variant="outline-secondary"
                                          size="sm"
                                          className="ms-2"
                                          onClick={() => {
                                            setRoleDropdown((prev) => ({ ...prev, [member.user._id]: !prev[member.user._id] }));
                                            setSelectedRole((prev) => {
                                              if (prev[member.user._id]) return prev;
                                              return { ...prev, [member.user._id]: member.role?.roleName || 'developer' };
                                            });
                                          }}
                                          disabled={assigningRole}
                                        >
                                          Edit Role
                                        </Button>
                                        {roleDropdown[member.user._id] && (
                                          <Form.Select
                                            size="sm"
                                            className="d-inline-block w-auto ms-2"
                                            value={selectedRole[member.user._id] || member.role?.roleName || 'developer'}
                                            onChange={e => setSelectedRole((prev) => ({ ...prev, [member.user._id]: e.target.value }))}
                                            style={{ minWidth: 120 }}
                                            disabled={assigningRole}
                                          >
                                            <option value="administrator">administrator</option>
                                            <option value="developer">developer</option>
                                            <option value="viewer">viewer</option>
                                          </Form.Select>
                                        )}
                                        {roleDropdown[member.user._id] && (
                                          <Button
                                            variant="success"
                                            size="sm"
                                            className="ms-2"
                                            onClick={() => handleSaveRoleClick(
                                              member.user._id, 
                                              member.user.name, 
                                              member.role?.roleName, 
                                              selectedRole[member.user._id]
                                            )}
                                            disabled={assigningRole}
                                          >
                                            Save
                                          </Button>
                                        )}
                                        {member.user._id !== currentUser._id && (
                                          <Button
                                            variant="outline-danger"
                                            size="sm"
                                            className="ms-2"
                                            onClick={() => handleRemoveMemberClick(member)}
                                            disabled={assigningRole || removingMember}
                                          >
                                            Remove
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </ListGroup.Item>
                              ))}
                          </ListGroup>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted text-center py-4">No members found</p>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Project Completion Chart */}
            <Col md={6} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Header>
                  <h5 className="mb-0">Project Completion</h5>
                </Card.Header>
                <Card.Body className="d-flex flex-column justify-content-center">
                  <div style={{ height: '250px', position: 'relative' }}>
                    <Doughnut data={completionData} options={chartOptions} />
                  </div>
                  <div className="text-center mt-3">
                    <h4 className="text-primary mb-0">{percentCompleted}%</h4>
                    <small className="text-muted">Overall Progress</small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Tasks Section */}
          <Row>
            <Col className="mb-4">
              <TasksSection 
                project={project}
                projectId={projectId}
                onTasksUpdated={fetchProject}
                isProjectManager={isProjectManager()}
                isViewer={isViewer()}
                canEditTask={canEditTask}
                currentUser={currentUser}
              />
            </Col>
          </Row>
        </>
      );
    case 'members':
      return (
        <MembersSection 
          project={project}
          projectId={projectId}
          currentUser={currentUser}
          onMembersUpdated={fetchProject}
        />
      );
    case 'tasks':
      return (
        <TasksDashboardSection
          project={project}
          projectId={projectId}
          currentUser={currentUser}
          onTasksUpdated={fetchProject}
          isViewer={isViewer()}
          canEditTask={canEditTask}
        />
      );
    case 'calendar':
      return (
        <Row>
          <Col>
            <ProjectCalendar 
              project={project}
              currentUser={currentUser}
              canEditTask={canEditTask}
            />
          </Col>
        </Row>
      );
    case 'posts':
      return (
        <PostsSection
          project={project}
          projectId={projectId}
          currentUser={currentUser}
        />
      );
    case 'settings':
      return (
        <ProjectSettings
          project={project}
          projectId={projectId}
          currentUser={currentUser}
          onProjectUpdated={fetchProject}
          onProjectDeleted={() => navigate('/dashboard')}
        />
      );
    default:
      return null;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation Bar */}
      <AppNavbar showDashboardLink={true} />

      {/* Main Content */}
      <Container className="mt-4">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {project && (
          <>
            {/* Back Button and Download Button */}
            <Row className="mb-3">
              <Col className="d-flex justify-content-between align-items-center">
                <Button variant="outline-secondary" onClick={goBackToDashboard}>
                  ← Back to Dashboard
                </Button>
                {project.settings?.pdfGenerationEnabled && (
                  <Button 
                    variant="outline-primary" 
                    onClick={handleDownloadProjectSummary}
                    disabled={downloadingPdf}
                  >
                    {downloadingPdf ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        📄 Download Project Summary
                      </>
                    )}
                  </Button>
                )}
              </Col>
            </Row>

            {/* Project Header */}
            <Row className="mb-3">
              <Col>
                <Card className="shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h2 className="mb-2">{project.projectName}</h2>
                        <p className="text-muted mb-0">{project.projectDescription}</p>
                      </div>
                      <Badge bg="primary" pill>
                        {project.members?.length || 0} members
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            {/* Project Navigation Bar */}
            <ProjectNavbar 
              activeSection={activeSection} 
              onSectionChange={handleSectionChange} 
            />
            
            {/* Render the active section content */}
            {renderActiveSection()}

            {/* Invite Link Modal */}
            <Modal show={showInviteLinkModal} onHide={closeInviteLinkModal} centered>
              <Modal.Header closeButton>
                <Modal.Title>Project Invite Link</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p className="mb-3">Share this link with others to invite them to join the project:</p>
                <div className="d-flex">
                  <Form.Control
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="me-2"
                    style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
                  />
                  <Button
                    variant="outline-primary"
                    onClick={handleCopyInviteLink}
                  >
                    Copy
                  </Button>
                </div>
                <small className="text-muted mt-2 d-block">
                  Anyone with this link can join the project. Keep it secure!
                </small>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={closeInviteLinkModal}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>

            {/* Remove Member Confirmation Modal */}
            <Modal show={showRemoveMemberModal} onHide={closeRemoveMemberModal} centered>
              <Modal.Header closeButton>
                <Modal.Title>Remove Member</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p className="mb-3">
                  Are you sure you want to remove <strong>{memberToRemove?.user.name}</strong> from this project?
                </p>
                <p className="text-danger small mb-0">
                  This action cannot be undone. The member will lose access to the project immediately.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={closeRemoveMemberModal} disabled={removingMember}>
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleRemoveMember}
                  disabled={removingMember}
                >
                  {removingMember ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Removing...
                    </>
                  ) : (
                    'Remove Member'
                  )}
                </Button>
              </Modal.Footer>
            </Modal>

            {/* Role Change Confirmation Modal */}
            <Modal show={showRoleConfirmModal} onHide={handleCancelRoleChange} centered>
              <Modal.Header closeButton>
                <Modal.Title>Confirm Role Change</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p className="mb-3">
                  Are you sure you want to change the role for <strong>{roleChangeDetails.memberName}</strong>?
                </p>
                <div className="alert alert-info">
                  <strong>Role Change:</strong> {roleChangeDetails.oldRole} → {roleChangeDetails.newRole}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleCancelRoleChange}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleConfirmRoleChange} disabled={assigningRole}>
                  {assigningRole ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Changing...
                    </>
                  ) : (
                    'Confirm Change'
                  )}
                </Button>
              </Modal.Footer>
            </Modal>
          </>
        )}
      </Container>
      <AIChatbot />
    </div>
  );
}
