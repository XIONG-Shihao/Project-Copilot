import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ProjectService from '../services/project.service';

export default function ProjectSettings({ 
  project, 
  projectId, 
  currentUser, 
  onProjectUpdated,
  onProjectDeleted 
}) {
  const [editingDetails, setEditingDetails] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [settings, setSettings] = useState({
    joinByLinkEnabled: true,
    pdfGenerationEnabled: true
  });
  
  // Modal states
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  


  useEffect(() => {
    if (project) {
      setProjectName(project.projectName || '');
      setProjectDescription(project.projectDescription || '');
      setSettings({
        joinByLinkEnabled: project.settings?.joinByLinkEnabled ?? true,
        pdfGenerationEnabled: project.settings?.pdfGenerationEnabled ?? true
      });
    }
  }, [project]);

  const isProjectManager = () => {
    if (!currentUser || !project || !project.members) return false;
    const member = project.members.find(
      m => m.user._id?.toString() === currentUser._id?.toString()
    );
    return member && member.role && member.role.roleName === 'administrator';
  };



  const handleUpdateDetails = async () => {
    if (!projectName.trim() || !projectDescription.trim()) {
      toast.error('Project name and description are required');
      return;
    }

    setSaving(true);
    try {
      await ProjectService.updateProjectDetails(projectId, projectName.trim(), projectDescription.trim());
      toast.success('Project details updated successfully');
      setEditingDetails(false);
      onProjectUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project details');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (newSettings) => {
    setSaving(true);
    try {
      await ProjectService.updateProjectSettings(projectId, newSettings);
      toast.success('Project settings updated successfully');
      setSettings({ ...settings, ...newSettings });
      onProjectUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveProject = async () => {
    setLoading(true);
    try {
      await ProjectService.leaveProject(projectId);
      toast.success('Successfully left the project');
      onProjectDeleted(); // Navigate away since user left
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave project');
    } finally {
      setLoading(false);
      setShowLeaveModal(false);
    }
  };





  const handleDeleteProject = async () => {
    setLoading(true);
    try {
      await ProjectService.deleteProject(projectId);
      toast.success('Project deleted successfully');
      onProjectDeleted(); // Navigate away since project is deleted
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };



  if (!project) {
    return <div>Loading...</div>;
  }

  return (
    <Container className="px-0">
      <Row>
        <Col>
          {/* Project Details */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Project Details</h5>
              {isProjectManager() && (
                <Button
                  variant={editingDetails ? 'secondary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setEditingDetails(!editingDetails)}
                >
                  {editingDetails ? 'Cancel' : 'Edit'}
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {editingDetails ? (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Project Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Project Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Enter project description"
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    onClick={handleUpdateDetails}
                    disabled={saving}
                  >
                    {saving ? <Spinner size="sm" /> : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <>
                  <h6>{project.projectName}</h6>
                  <p className="text-muted">{project.projectDescription}</p>
                </>
              )}
            </Card.Body>
          </Card>

          {/* Project Settings */}
          {isProjectManager() && (
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Project Settings</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                  <div>
                    <span className="fw-semibold">Enable Join-by-Link</span>
                    <span className="text-muted small ms-2">- Allow new members to join using invite links</span>
                  </div>
                  <Form.Check
                    type="switch"
                    id="join-by-link"
                    checked={settings.joinByLinkEnabled}
                    onChange={(e) => handleUpdateSettings({
                      ...settings,
                      joinByLinkEnabled: e.target.checked
                    })}
                    disabled={saving}
                  />
                </div>
                
                <div className="d-flex justify-content-between align-items-center py-3">
                  <div>
                    <span className="fw-semibold">Enable PDF Generation</span>
                    <span className="text-muted small ms-2">- Allow project summary PDF export</span>
                  </div>
                  <Form.Check
                    type="switch"
                    id="pdf-generation"
                    checked={settings.pdfGenerationEnabled}
                    onChange={(e) => handleUpdateSettings({
                      ...settings,
                      pdfGenerationEnabled: e.target.checked
                    })}
                    disabled={saving}
                  />
                </div>
              </Card.Body>
            </Card>
          )}


          {/* Project Management */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Project Management</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                <div>
                  <span className="fw-semibold">Leave Project</span>
                  <span className="text-muted small ms-2">- Remove yourself from this project</span>
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setShowLeaveModal(true)}
                  disabled={loading}
                  style={{ minWidth: '80px' }}
                >
                  Leave
                </Button>
              </div>

              {isProjectManager() && (
                <div className="d-flex justify-content-between align-items-center py-3">
                  <div>
                    <span className="fw-semibold">Delete Project</span>
                    <span className="text-muted small ms-2">- Permanently delete this project. Cannot be undone.</span>
                  </div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={loading}
                    style={{ minWidth: '80px' }}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Leave Project Modal */}
      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Leave Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            Are you sure you want to leave this project? This action cannot be undone.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleLeaveProject} disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Leave Project'}
          </Button>
        </Modal.Footer>
      </Modal>





      {/* Delete Project Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>Warning:</strong> This action cannot be undone. This will permanently delete the project, all tasks, and remove all members.
          </Alert>
          <p>Are you sure you want to delete "{project.projectName}"?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteProject} disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Delete Project'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}