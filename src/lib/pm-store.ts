import { create } from 'zustand';
import type { Project } from '@/types';

interface PMStore {
  // Project list state
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;

  // Active project context
  activeProject: Project | null;
  activeProjectLoading: boolean;

  // Actions
  setProjects: (projects: Project[]) => void;
  setProjectsLoading: (loading: boolean) => void;
  setProjectsError: (error: string | null) => void;
  setActiveProject: (project: Project | null) => void;
  setActiveProjectLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  projects: [] as Project[],
  projectsLoading: false,
  projectsError: null as string | null,
  activeProject: null as Project | null,
  activeProjectLoading: false,
};

export const usePMStore = create<PMStore>()((set) => ({
  ...initialState,
  setProjects: (projects) => set({ projects, projectsError: null }),
  setProjectsLoading: (projectsLoading) => set({ projectsLoading }),
  setProjectsError: (projectsError) => set({ projectsError }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setActiveProjectLoading: (activeProjectLoading) => set({ activeProjectLoading }),
  reset: () => set(initialState),
}));
