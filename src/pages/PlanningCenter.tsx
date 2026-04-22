import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, Circle, Edit2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { useNavigate } from 'react-router-dom';
import { PomodoroTimer } from '../components/planning/PomodoroTimer';

type PlanMode = 'spaced' | 'pomodoro';

export default function PlanningCenter() {
  const [mode, setMode] = useState<PlanMode>('spaced');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { items, markCompleted, updateItemDate } = useSpacedRepetition();
  const navigate = useNavigate();

  const modes = [
    { id: 'spaced', label: '🗓️ Répétition espacée' },
    { id: 'pomodoro', label: '🍅 Pomodoro' },
  ];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleReschedule = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const newDate = prompt(`À quelle date voulez-vous reporter "${item.courseName}" ? (Format: AAAA-MM-JJ)`, item.date);
    if (newDate && newDate !== item.date) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        updateItemDate(item.id, newDate);
      } else {
        alert("Format de date invalide. Utilisez AAAA-MM-JJ.");
      }
    }
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <header className="page-header" style={{ flexShrink: 0 }}>
        <h1>Centre de Planification</h1>
        <p className="subtitle">Plannings d'études et méthodes automatisés par l'IA</p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem', flexShrink: 0 }}>
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as PlanMode)}
            className={`btn ${mode === m.id ? 'btn-primary' : 'btn-outline glass-panel'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', flexShrink: 0, marginBottom: '2rem' }}>
        {mode === 'spaced' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}>
                <CalendarIcon size={20} className="text-accent" />
                Calendrier des Révisions
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="icon-button" onClick={prevMonth}><ChevronLeft size={20} /></button>
                <h4 style={{ minWidth: '150px', textAlign: 'center', textTransform: 'capitalize' }}>
                  {format(currentDate, 'MMMM yyyy', { locale: fr })}
                </h4>
                <button className="icon-button" onClick={nextMonth}><ChevronRight size={20} /></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {weekDays.map(day => (
                <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                  {day}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.5rem' }}>
              {days.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayItems = items.filter(item => item.date === dayStr);

                return (
                  <div 
                    key={idx}
                    style={{
                      border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      padding: '0.5rem',
                      minHeight: '100px',
                      backgroundColor: isCurrentMonth ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                      opacity: isCurrentMonth ? 1 : 0.4,
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ textAlign: 'right', fontWeight: isToday ? 'bold' : 'normal', marginBottom: '0.5rem' }}>
                      {format(day, 'd')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflowY: 'auto' }}>
                      {dayItems.map(item => (
                        <div 
                          key={item.id}
                          className="hover-lift"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.4rem',
                            backgroundColor: item.completed ? 'var(--bg-elevated)' : 'var(--accent-primary)',
                            color: item.completed ? 'var(--text-secondary)' : 'white',
                            borderRadius: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            opacity: item.completed ? 0.6 : 1,
                            border: item.completed ? '1px solid var(--border-color)' : 'none'
                          }}
                          title={`Cours: ${item.courseName} (J+${item.step})`}
                        >
                          <button 
                            style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); markCompleted(item.id, !item.completed); }}
                          >
                            {item.completed ? <CheckCircle size={12} /> : <Circle size={12} />}
                          </button>
                          <span 
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, cursor: 'pointer' }}
                            onClick={() => navigate(`/subject/${item.courseId}`)}
                          >
                            {item.courseName}
                          </span>
                          <button 
                            className="reschedule-btn"
                            style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', opacity: 0.6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onClick={(e) => handleReschedule(e, item)}
                            title="Changer de date"
                          >
                            <Edit2 size={10} />
                          </button>
                          <span style={{ fontWeight: 'bold', opacity: 0.8, fontSize: '0.65rem' }}>J{item.step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : mode === 'pomodoro' ? (
          <PomodoroTimer />
        ) : (
          <>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={20} className="text-accent" />
              Mode: {modes.find(m => m.id === mode)?.label}
            </h3>
            <div style={{ flex: 1, border: '1px dashed var(--border-color)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Ce mode est en cours de développement.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
