import { Nav, Container } from 'react-bootstrap';

export default function ProjectNavbar({ activeSection, onSectionChange }) {
  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'members', label: 'Members', icon: '👥' },
    { id: 'tasks', label: 'Tasks', icon: '✓' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'posts', label: 'Posts', icon: '📝' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <Container className="px-0">
      <Nav 
        variant="tabs" 
        className="project-nav mb-4 d-flex"
        activeKey={activeSection}
      >
        {sections.map(section => (
          <Nav.Item key={section.id} className="flex-fill text-center">
            <Nav.Link 
              eventKey={section.id} 
              onClick={() => onSectionChange(section.id)}
              className="px-4 py-3 d-flex align-items-center justify-content-center"
            >
              <span className="me-2">{section.icon}</span>
              {section.label}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
    </Container>
  );
} 