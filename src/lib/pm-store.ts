import { create } from 'zustand';
import type { Project, TaskGroup, Task, TaskDependency } from '@/types';

interface PMStore {
  // Project list state
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;

  // Active project context
  activeProject: Project | null;
  activeProjectLoading: boolean;

  // Gantt chart state
  taskGroups: TaskGroup[];
  tasks: Task[];
  dependencies: TaskDependency[];
  ganttLoading: boolean;
  ganttError: string | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  setProjectsLoading: (loading: boolean) => void;
  setProjectsError: (error: string | null) => void;
  setActiveProject: (project: Project | null) => void;
  setActiveProjectLoading: (loading: boolean) => void;
  setTaskGroups: (taskGroups: TaskGroup[]) => void;
  setTasks: (tasks: Task[]) => void;
  setDependencies: (dependencies: TaskDependency[]) => void;
  setGanttLoading: (loading: boolean) => void;
  setGanttError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  projects: [] as Project[],
  projectsLoading: false,
  projectsError: null as string | null,
  activeProject: null as Project | null,
  activeProjectLoading: false,
  taskGroups: [] as TaskGroup[],
  tasks: [] as Task[],
  dependencies: [] as TaskDependency[],
  ganttLoading: false,
  ganttError: null as string | null,
};

export const usePMStore = create<PMStore>()((set) => ({
  ...initialState,
  setProjects: (projects) => set({ projects, projectsError: null }),
  setProjectsLoading: (projectsLoading) => set({ projectsLoading }),
  setProjectsError: (projectsError) => set({ projectsError }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setActiveProjectLoading: (activeProjectLoading) => set({ activeProjectLoading }),
  setTaskGroups: (taskGroups) => set({ taskGroups }),
  setTasks: (tasks) => set({ tasks }),
  setDependencies: (dependencies) => set({ dependencies }),
  setGanttLoading: (ganttLoading) => set({ ganttLoading }),
  setGanttError: (ganttError) => set({ ganttError }),
  reset: () => set(initialState),
}));
