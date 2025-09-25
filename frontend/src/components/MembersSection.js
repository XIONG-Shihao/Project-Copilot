import { useState } from 'react';
import { Row, Col, Card, Badge, Button, Alert, Table, Form, Spinner, Modal } from 'react-bootstrap';
import ProjectService from '../services/project.service';
import { toast } from 'react-toastify';

export default function MembersSection({ project, projectId, currentUser, onMembersUpdated }) {
  const [assigningRole, setAssigningRole] = useState(false);
  const [roleDropdown, setRoleDropdown] = useState({}); // { memberId: boolean }
  const [selectedRole, setSelectedRole] = useState({}); // { memberId: roleName }
  const [generatingInviteLink, setGeneratingInviteLink] = useState(false);
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);

  const isProjectManager = () => {
    if (!currentUser || !project || !project.members) return false;
    const member = project.members.find(
      m => m.user._id?.toString() === currentUser._id?.toString()
    );
    return member && member.role && member.role.roleName === 'administrator';
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

  const handleAssignRole = async (memberId) => {
    if (!selectedRole[memberId]) return;
    setAssigningRole(true);
    try {
      await ProjectService.assignRole(projectId, memberId, selectedRole[memberId]);
      toast.success('Role assigned successfully!');
      setRoleDropdown((prev) => ({ ...prev, [memberId]: false }));
      if (onMembersUpdated) {
        await onMembersUpdated();
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg && msg.includes('There must be at least one administrator')) {
        toast.error('There must be at least one administrator in the project.');
      } else {
        toast.error(msg || 'Failed to assign role.');
      }
    } finally {
      setAssigningRole(false);
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
      if (onMembersUpdated) {
        await onMembersUpdated();
      }
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

  // Sort members by role priority: administrators first, then developers, then viewers
  const getSortedMembers = () => {
    if (!project.members) return [];
    
    // Create a copy of members array to avoid mutating the original
    const sortedMembers = [...project.members];
    
    // Define role priority
    const rolePriority = {
      'administrator': 1,
      'developer': 2,
      'viewer': 3
    };
    
    // Sort by role priority
    return sortedMembers.sort((a, b) => {
      const roleA = a.role?.roleName || '';
      const roleB = b.role?.roleName || '';
      
      return (rolePriority[roleA] || 99) - (rolePriority[roleB] || 99);
    });
  };

  return (
    <>
      <Row>
        <Col>
          <Card className="shadow-sm mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center bg-white">
              <h5 className="mb-0">Team Members</h5>
              {isProjectManager() && project.settings?.joinByLinkEnabled && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateInviteLink}
                  disabled={generatingInviteLink}
                >
                  {generatingInviteLink ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <span>+ Invite New Member</span>
                  )}
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-4">
                <div>
                  <h6 className="text-muted mb-0">Total Members</h6>
                  <h2 className="mb-0">{project.members?.length || 0}</h2>
                </div>
                <div>
                  <h6 className="text-muted mb-0">Administrators</h6>
                  <h2 className="mb-0">{project.members?.filter(m => m.role?.roleName === 'administrator').length || 0}</h2>
                </div>
                <div>
                  <h6 className="text-muted mb-0">Developers</h6>
                  <h2 className="mb-0">{project.members?.filter(m => m.role?.roleName === 'developer').length || 0}</h2>
                </div>
                <div>
                  <h6 className="text-muted mb-0">Viewers</h6>
                  <h2 className="mb-0">{project.members?.filter(m => m.role?.roleName === 'viewer').length || 0}</h2>
                </div>
              </div>
              
              {isProjectManager() && (
                <Alert variant="info" className="d-flex align-items-center mb-4">
                  <span className="me-2" style={{ fontSize: '1.5rem' }}>ℹ️</span>
                  <div>
                    As a project administrator, you can manage team members' roles and permissions.
                  </div>
                </Alert>
              )}
              
              {project.members && project.members.length > 0 ? (
                <Table responsive hover className="align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Member</th>
                      <th>Email</th>
                      <th>Role</th>
                      {isProjectManager() && <th className="text-end">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedMembers().map((member, index) => {
                      return (
                        <tr key={index}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div 
                                className={`rounded-circle text-white d-flex align-items-center justify-content-center me-3 bg-${
                                  member.role?.roleName === 'administrator' ? 'danger' :
                                    member.role?.roleName === 'developer' ? 'success' : 'info'
                                }`}
                                style={{ width: '45px', height: '45px', fontSize: '18px' }}
                              >
                                {member.user.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div className="fw-medium">{member.user.name || 'Unknown User'}</div>
                                {currentUser && currentUser._id === member.user._id && (
                                  <Badge bg="secondary" pill className="mt-1">You</Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{member.user.email || 'No email'}</td>
                          <td>
                            <Badge
                              bg={
                                member.role?.roleName === 'administrator' ? 'danger' :
                                  member.role?.roleName === 'developer' ? 'success' : 'info'
                              }
                            >
                              {member.role?.roleName || 'No role'}
                            </Badge>
                          </td>
                          {isProjectManager() && (
                            <td className="text-end">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => {
                                  setRoleDropdown((prev) => ({ ...prev, [member.user._id]: !prev[member.user._id] }));
                                  setSelectedRole((prev) => {
                                    if (prev[member.user._id]) return prev;
                                    return { ...prev, [member.user._id]: member.role?.roleName || 'developer' };
                                  });
                                }}
                                disabled={assigningRole}
                              >
                                Manage Role
                              </Button>
                              
                              {member.user._id !== currentUser._id && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleRemoveMemberClick(member)}
                                  disabled={assigningRole || removingMember}
                                >
                                  Remove
                                </Button>
                              )}
                              
                              {roleDropdown[member.user._id] && (
                                <div className="mt-2 d-flex justify-content-end">
                                  <Form.Select
                                    size="sm"
                                    className="w-auto me-2"
                                    value={selectedRole[member.user._id] || member.role?.roleName || 'developer'}
                                    onChange={e => setSelectedRole((prev) => ({ ...prev, [member.user._id]: e.target.value }))}
                                    disabled={assigningRole}
                                  >
                                    <option value="administrator">Administrator</option>
                                    <option value="developer">Developer</option>
                                    <option value="viewer">Viewer</option>
                                  </Form.Select>
                                  
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleAssignRole(member.user._id)}
                                    disabled={assigningRole}
                                  >
                                    {assigningRole ? (
                                      <Spinner animation="border" size="sm" />
                                    ) : (
                                      'Save'
                                    )}
                                  </Button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3" style={{ fontSize: '2rem' }}>👥</div>
                  <h5>No Members Yet</h5>
                  <p className="text-muted">Invite team members to collaborate on this project</p>
                  {isProjectManager() && project.settings?.joinByLinkEnabled && (
                    <Button
                      variant="primary"
                      onClick={handleGenerateInviteLink}
                      disabled={generatingInviteLink}
                    >
                      {generatingInviteLink ? (
                        <Spinner animation="border" size="sm" className="me-2" />
                      ) : (
                        <span>Generate Invite Link</span>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
          
          {isProjectManager() && (
            <Card className="shadow-sm">
              <Card.Header className="bg-white">
                <h5 className="mb-0">Role Permissions</h5>
              </Card.Header>
              <Card.Body>
                <Table responsive className="align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Role</th>
                      <th>Description</th>
                      <th>Permissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <Badge bg="danger">Administrator</Badge>
                      </td>
                      <td>Full access to manage the project, members, and settings</td>
                      <td>
                        <ul className="mb-0 ps-3">
                          <li>Manage project settings</li>
                          <li>Add/remove members</li>
                          <li>Assign roles</li>
                          <li>Create, edit, delete tasks</li>
                          <li>Generate project reports</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <Badge bg="success">Developer</Badge>
                      </td>
                      <td>Can manage tasks and contribute to the project</td>
                      <td>
                        <ul className="mb-0 ps-3">
                          <li>View project details</li>
                          <li>Create, edit tasks</li>
                          <li>Update task progress</li>
                          <li>View reports</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <Badge bg="info">Viewer</Badge>
                      </td>
                      <td>Read-only access to project information</td>
                      <td>
                        <ul className="mb-0 ps-3">
                          <li>View project details</li>
                          <li>View tasks and progress</li>
                          <li>View reports</li>
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

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
    </>
  );
} 