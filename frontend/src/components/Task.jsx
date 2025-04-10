import { createSignal, createMemo, Show } from 'solid-js';
import { useNavigate } from 'solid-app-router';

/**
 * Task Component
 * 
 * Displays a single task with actions for editing, deleting, and updating status.
 * Optimized for performance with memoization and signal-based state.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.task - Task data object
 * @param {Function} props.onDelete - Delete task callback
 * @param {Function} props.onStatusChange - Status change callback
 */
export default function Task(props) {
  const navigate = useNavigate();
  
  // Memoized status class for styling based on task status
  const statusClass = createMemo(() => `status-${props.task.status.toLowerCase().replace('_', '-')}`);
  
  // Format due date for display
  const formattedDueDate = createMemo(() => {
    if (!props.task.dueDate) return 'No due date';
    
    const date = new Date(props.task.dueDate);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  });
  
  // Handle status change
  const handleStatusChange = (event) => {
    if (props.onStatusChange) {
      props.onStatusChange(props.task.id, event.target.value);
    }
  };
  
  // Handle delete button click
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      props.onDelete(props.task.id);
    }
  };
  
  // Navigate to edit page
  const handleEdit = () => {
    navigate(`/tasks/${props.task.id}/edit`);
  };
  
  // Check if task is overdue
  const isOverdue = createMemo(() => {
    if (!props.task.dueDate) return false;
    if (props.task.status === 'DONE') return false;
    
    const dueDate = new Date(props.task.dueDate);
    const today = new Date();
    
    // Remove time component for comparison
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  });
  
  return (
    <div class="card task-card">
      <div class="task-header">
        <h3 class="task-title">{props.task.title}</h3>
        <div class="task-priority">
          Priority: {props.task.priority}
        </div>
      </div>
      
      <div class="task-body">
        <Show when={props.task.description}>
          <p class="task-description">{props.task.description}</p>
        </Show>
        
        <div class="task-details">
          <div class="task-due-date">
            <span class={isOverdue() ? 'overdue' : ''}>
              Due: {formattedDueDate()}
            </span>
          </div>
          
          <div class="task-status">
            <select 
              value={props.task.status} 
              onChange={handleStatusChange}
              class={statusClass()}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="task-actions">
        <button 
          class="btn btn-secondary" 
          onClick={handleEdit}
        >
          Edit
        </button>
        
        <button 
          class="btn btn-danger" 
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
} 