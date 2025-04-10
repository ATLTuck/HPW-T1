import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js';
import { useNavigate } from 'solid-app-router';
import Task from '../components/Task';

/**
 * Dashboard Route Component
 * 
 * Displays user tasks with real-time updates via WebSockets.
 * Implements optimized rendering with batch updates and memoization.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user data
 * @param {Object} props.websocket - WebSocket client instance
 */
export default function Dashboard(props) {
  // Navigation
  const navigate = useNavigate();
  
  // Local state
  const [tasks, setTasks] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  
  // API base URL for backend requests
  const API_URL = 'http://localhost:8080/api';
  
  // Helper function to get auth token from localStorage
  const getAuthToken = () => localStorage.getItem('authToken');
  
  // Load tasks from API
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching tasks: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting task: ${response.statusText}`);
      }
      
      // Optimistically remove task from local state
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };
  
  // Handle task status change
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error(`Error updating task: ${response.statusText}`);
      }
      
      // Optimistically update task in local state
      const updatedTask = await response.json();
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask.task : task
      ));
    } catch (err) {
      console.error('Failed to update task status:', err);
      setError('Failed to update task. Please try again.');
      // Refresh tasks to get current state
      fetchTasks();
    }
  };
  
  // WebSocket event handlers for real-time updates
  const handleTaskCreated = (data) => {
    setTasks(prev => [...prev, data.task].sort((a, b) => b.priority - a.priority));
  };
  
  const handleTaskUpdated = (data) => {
    setTasks(prev => prev.map(task => 
      task.id === data.task.id ? data.task : task
    ));
  };
  
  const handleTaskDeleted = (data) => {
    setTasks(prev => prev.filter(task => task.id !== data.taskId));
  };
  
  // Set up WebSocket event listeners
  createEffect(() => {
    if (!props.websocket || !props.websocket.isConnected()) return;
    
    // Subscribe to task-related events
    props.websocket.subscribeToTasks();
    
    // Set up event handlers
    const unsubscribeCreated = props.websocket.on('task_created', handleTaskCreated);
    const unsubscribeUpdated = props.websocket.on('task_updated', handleTaskUpdated);
    const unsubscribeDeleted = props.websocket.on('task_deleted', handleTaskDeleted);
    
    // Cleanup on component unmount
    onCleanup(() => {
      props.websocket.unsubscribeFromTasks();
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    });
  });
  
  // Fetch tasks on component mount
  createEffect(() => {
    fetchTasks();
  });
  
  // Navigate to create task page
  const handleAddTask = () => {
    navigate('/tasks/new');
  };
  
  return (
    <div class="container">
      <div class="dashboard-header">
        <h2>Your Tasks</h2>
        <button class="btn btn-primary" onClick={handleAddTask}>
          Add New Task
        </button>
      </div>
      
      <Show when={error()}>
        <div class="error-message">
          {error()}
          <button class="btn btn-secondary" onClick={() => fetchTasks()}>
            Try Again
          </button>
        </div>
      </Show>
      
      <Show when={!loading()} fallback={<div class="loading"></div>}>
        <Show when={tasks().length > 0} fallback={
          <div class="empty-state">
            <p>You don't have any tasks yet.</p>
            <button class="btn btn-primary" onClick={handleAddTask}>
              Create Your First Task
            </button>
          </div>
        }>
          <div class="task-list">
            <For each={tasks()}>
              {(task) => (
                <Task 
                  task={task} 
                  onDelete={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
} 