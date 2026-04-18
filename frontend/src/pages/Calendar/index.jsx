import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import './calendar.css';

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get('/api/events', {
          headers: getAuthHeader(),
        });
        // For now, we'll just set an empty array since our backend returns an empty list
        setEvents([]);
      } catch (error) {
        // Even if there's an error, we'll set an empty array to ensure the calendar renders
        setEvents([]);
      }
    };

    fetchEvents();
  }, [getAuthHeader]);

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6 hidden">
          {/* Page title removed - shown in topbar */}
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            events={events}
            nowIndicator={true}
            editable={false}
            selectable={false}
            selectMirror={true}
            dayMaxEvents={true}
            height="auto"
            contentHeight="auto"
            aspectRatio={1.8}
            views={{
              dayGridMonth: { buttonText: 'Month' },
              timeGridWeek: { buttonText: 'Week' },
              timeGridDay: { buttonText: 'Day' },
              listWeek: { buttonText: 'List' }
            }}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Calendar;
