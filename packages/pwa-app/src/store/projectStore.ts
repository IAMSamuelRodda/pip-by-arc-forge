/**
 * Project Store - Zustand state management for projects
 * Epic 2.3: Projects feature
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { projectApi } from '../api/client';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../api/client';

interface ProjectState {
  // Project list
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  // Current project selection (persisted)
  currentProjectId: string | null;

  // Actions
  loadProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (projectId: string, input: UpdateProjectInput) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  setCurrentProject: (projectId: string | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      isLoading: false,
      error: null,
      currentProjectId: null,

      loadProjects: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await projectApi.listProjects();
          const projects = result.projects;

          // CRITICAL FIX (issue_042): Only update currentProjectId if it's invalid (deleted project)
          // Don't auto-set on initial load - let the UI (ProjectDetailPage) control it
          const currentId = get().currentProjectId;
          let newCurrentId = currentId;

          // Only clear currentProjectId if the current project was deleted
          if (currentId && !projects.find((p) => p.id === currentId)) {
            newCurrentId = null; // Clear invalid project, but don't auto-select another
          }

          set({
            projects,
            currentProjectId: newCurrentId,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load projects',
          });
        }
      },

      createProject: async (input: CreateProjectInput) => {
        try {
          const project = await projectApi.createProject(input);
          set((state) => ({
            projects: [...state.projects, project],
          }));

          // REMOVED (issue_042): Don't auto-set currentProjectId
          // Let the UI (ProjectDetailPage navigation) control it explicitly

          return project;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to create project' });
          throw error;
        }
      },

      updateProject: async (projectId: string, input: UpdateProjectInput) => {
        try {
          const project = await projectApi.updateProject(projectId, input);
          set((state) => ({
            projects: state.projects.map((p) => (p.id === projectId ? project : p)),
          }));
          return project;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update project' });
          throw error;
        }
      },

      deleteProject: async (projectId: string) => {
        try {
          await projectApi.deleteProject(projectId);
          const newProjects = get().projects.filter((p) => p.id !== projectId);

          // If deleting current project, switch to another (or null if none)
          let newCurrentId = get().currentProjectId;
          if (newCurrentId === projectId) {
            newCurrentId = newProjects[0]?.id || null;
          }

          set({
            projects: newProjects,
            currentProjectId: newCurrentId,
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete project' });
          throw error;
        }
      },

      setCurrentProject: (projectId: string | null) => {
        set({ currentProjectId: projectId });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'pip-project-store',
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
      }),
    }
  )
);

// Helper to get current project
export function useCurrentProject(): Project | undefined {
  const { projects, currentProjectId } = useProjectStore();
  return projects.find((p) => p.id === currentProjectId);
}
