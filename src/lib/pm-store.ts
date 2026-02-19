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

  // Panel state
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  selectedTaskId: string | null;
  rightPanelTab: number;

  // Actions
  setProjects: (projects: Project[]) => void;
  setProjectsLoading: (loading: boolean) => void;
  setProjectsError: (error: string | null) => void;
  setActiveProject: (project: Project | null) => void;
  setActiveProjectLoading: (loading: boolean) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setSelectedTaskId: (id: string | null) => void;
  setRightPanelTab: (tab: number) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  reset: () => void;
}

const initialState = {
  projects: [] as Project[],
  projectsLoading: false,
  projectsError: null as string | null,
  activeProject: null as Project | null,
  activeProjectLoading: false,
  leftPanelOpen: true,
  rightPanelOpen: false,
  leftPanelWidth: 220,
  rightPanelWidth: 320,
  selectedTaskId: null as string | null,
  rightPanelTab: 0,
};

export const usePMStore = create<PMStore>()((set) => ({
  ...initialState,
  setProjects: (projects) => set({ projects, projectsError: null }),
  setProjectsLoading: (projectsLoading) => set({ projectsLoading }),
  setProjectsError: (projectsError) => set({ projectsError }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setActiveProjectLoading: (activeProjectLoading) => set({ activeProjectLoading }),
  setLeftPanelOpen: (leftPanelOpen) => set({ leftPanelOpen }),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth }),
  setRightPanelWidth: (rightPanelWidth) => set({ rightPanelWidth }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id, rightPanelOpen: id !== null }),
  setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  reset: () => set(initialState),
}));
