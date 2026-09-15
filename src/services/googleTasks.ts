import { GoogleTask, GoogleTaskList } from '../types';

const BASE_URL = 'https://tasks.googleapis.com/tasks/v1';

export async function fetchTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const response = await fetch(`${BASE_URL}/users/@me/lists`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch task lists (${response.status})`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function createTaskList(accessToken: string, title: string): Promise<GoogleTaskList> {
  const response = await fetch(`${BASE_URL}/users/@me/lists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create task list (${response.status})`);
  }

  return response.json();
}

export async function fetchTasks(
  accessToken: string,
  taskListId: string
): Promise<GoogleTask[]> {
  const response = await fetch(
    `${BASE_URL}/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=true&showHidden=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch tasks (${response.status})`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function createTask(
  accessToken: string,
  taskListId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> {
  const response = await fetch(`${BASE_URL}/lists/${encodeURIComponent(taskListId)}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create task (${response.status})`);
  }

  return response.json();
}

export async function updateTask(
  accessToken: string,
  taskListId: string,
  taskId: string,
  updates: Partial<GoogleTask>
): Promise<GoogleTask> {
  const response = await fetch(
    `${BASE_URL}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to update task (${response.status})`);
  }

  return response.json();
}

export async function deleteTask(
  accessToken: string,
  taskListId: string,
  taskId: string
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to delete task (${response.status})`);
  }
}
