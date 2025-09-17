import { useState, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { Card, ButtonGroup, Button } from 'react-bootstrap';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import TaskDetailModal from './TaskDetailModal';

const localizer = momentLocalizer(moment);

export default function ProjectCalendar({ project, _currentUser, _canEditTask }) {
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Convert tasks to calendar events
  const events = useMemo(() => {
    if (!project || !project.tasks) return [];
    
    return project.tasks.map(task => {
      let color;
      switch (task.taskProgress) {
      case 'Completed':
        color = '#28a745'; // Green
        break;
      case 'In Progress':
        color = '#ffc107'; // Yellow
        break;
      case 'To Do':
      default:
        color = '#dc3545'; // Red
        break;
      }

      // Use just the date without specific time for all-day events
      const deadlineDate = new Date(task.taskDeadline);
      
      return {
        id: task._id,
        title: task.taskName,
        start: deadlineDate,
        end: deadlineDate,
        allDay: true, // This makes it an all-day event
        resource: task,
        style: {
          backgroundColor: color,
          borderColor: color,
          color: task.taskProgress === 'In Progress' ? '#000' : '#fff' // Dark text for yellow background
        }
      };
    });
  }, [project]);

  const handleSelectEvent = (event) => {
    setSelectedTask(event.resource);
    setShowTaskModal(true);
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  // Custom event component
  const EventComponent = ({ event }) => (
    <div className="text-truncate">
      <strong>{event.title}</strong>
    </div>
  );

  // Custom toolbar
  const CustomToolbar = ({ label, onNavigate, onView, view: currentView }) => (
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div className="d-flex align-items-center">
        <ButtonGroup className="me-3">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onNavigate('PREV')}
          >
            ‹ Prev
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onNavigate('TODAY')}
          >
            Today
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onNavigate('NEXT')}
          >
            Next ›
          </Button>
        </ButtonGroup>
        <h5 className="mb-0">{label}</h5>
      </div>
      <ButtonGroup>
        <Button
          variant={currentView === 'month' ? 'primary' : 'outline-primary'}
          size="sm"
          onClick={() => onView('month')}
        >
          Month
        </Button>
        <Button
          variant={currentView === 'week' ? 'primary' : 'outline-primary'}
          size="sm"
          onClick={() => onView('week')}
        >
          Week
        </Button>
        <Button
          variant={currentView === 'day' ? 'primary' : 'outline-primary'}
          size="sm"
          onClick={() => onView('day')}
        >
          Day
        </Button>
      </ButtonGroup>
    </div>
  );

  if (!project) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <div className="text-center py-4">
            <p className="text-muted">Loading calendar...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      {/* Custom CSS to hide timeline for week/day views */}
      <style>
        {`
          .rbc-time-view .rbc-time-gutter,
          .rbc-time-view .rbc-time-content > .rbc-time-header,
          .rbc-time-view .rbc-time-content .rbc-timeslot-group,
          .rbc-time-view .rbc-time-content .rbc-day-slot .rbc-time-slot {
            display: none !important;
          }
          .rbc-time-view .rbc-time-content {
            margin-left: 0 !important;
          }
          .rbc-time-view .rbc-allday-cell {
            height: auto !important;
            min-height: 100px !important;
          }
          .rbc-time-view .rbc-day-slot {
            min-height: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          .rbc-time-view .rbc-time-content .rbc-day-slot .rbc-events-container {
            display: none !important;
          }
          .rbc-time-view .rbc-allday-cell .rbc-row {
            min-height: 80px !important;
          }
        `}
      </style>
      <Card className="shadow-sm">
        <Card.Header>
          <h5 className="mb-0">📅 Project Calendar</h5>
          <small className="text-muted">
            Task deadlines and timeline view
          </small>
        </Card.Header>
        <Card.Body>
          {/* Legend */}
          <div className="d-flex gap-3 mb-3 flex-wrap">
            <div className="d-flex align-items-center">
              <div className="rounded me-2" style={{ width: '16px', height: '16px', backgroundColor: '#dc3545' }}></div>
              <small>To Do</small>
            </div>
            <div className="d-flex align-items-center">
              <div className="rounded me-2" style={{ width: '16px', height: '16px', backgroundColor: '#ffc107' }}></div>
              <small>In Progress</small>
            </div>
            <div className="d-flex align-items-center">
              <div className="rounded me-2" style={{ width: '16px', height: '16px', backgroundColor: '#28a745' }}></div>
              <small>Completed</small>
            </div>
          </div>

          {/* Calendar */}
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              date={date}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={(event) => ({
                style: event.style
              })}
              components={{
                event: EventComponent,
                toolbar: CustomToolbar,
                timeSlotWrapper: () => null, // Remove time slots
                timeGutterHeader: () => null, // Remove time gutter header
                timeGutterWrapper: () => null // Remove time gutter
              }}
              popup
              popupOffset={{ x: 30, y: 20 }}
              showMultiDayTimes={false}
              scrollToTime={undefined}
              step={60}
              timeslots={1}
              formats={{
                eventTimeRangeFormat: () => '', // Hide time range since we're dealing with deadlines
                agendaTimeFormat: () => '',
                agendaDateFormat: 'ddd MMM DD',
                dayHeaderFormat: 'dddd MMM DD',
                dayRangeHeaderFormat: ({ start, end }) => 
                  `${moment(start).format('MMM DD')} - ${moment(end).format('MMM DD, YYYY')}`,
                timeGutterFormat: () => '' // Hide time gutter labels
              }}
              min={new Date(1970, 1, 1, 0, 0, 0)} // Start from midnight
              max={new Date(1970, 1, 1, 23, 59, 59)} // End at midnight
            />
          </div>
        </Card.Body>
      </Card>

      {/* Task Detail Modal */}
      <TaskDetailModal
        show={showTaskModal}
        onHide={handleCloseModal}
        task={selectedTask}
      />
    </>
  );
}