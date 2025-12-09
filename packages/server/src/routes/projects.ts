/**
 * Project Management Routes
 *
 * Handles project CRUD operations for isolated context containers
 * Epic 2.3: Projects feature
 */

import { Router } from 'express';
import type { DatabaseProvider, Project } from '@pip/core';

export function createProjectRoutes(db: DatabaseProvider): Router {
  const router = Router();

  /**
   * GET /api/projects
   * List all projects for a user (with chat counts)
   */
  router.get('/', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const projects = await db.listProjects(userId);

      // Get chat counts for each project
      const sessions = await db.listSessions({ userId });
      const chatCounts = new Map<string, number>();
      for (const session of sessions) {
        if (session.projectId) {
          chatCounts.set(session.projectId, (chatCounts.get(session.projectId) || 0) + 1);
        }
      }

      res.json({
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          instructions: p.instructions,
          xeroTenantId: p.xeroTenantId,
          chatCount: chatCounts.get(p.id) || 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/projects
   * Create a new project
   */
  router.post('/', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const { name, description, xeroTenantId } = req.body;

      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Project name is required' });
        return;
      }

      const project = await db.createProject({
        userId,
        name: name.trim().substring(0, 100),
        description: description?.trim()?.substring(0, 500),
        xeroTenantId: xeroTenantId?.trim(),
      });

      res.status(201).json({
        id: project.id,
        name: project.name,
        description: project.description,
        xeroTenantId: project.xeroTenantId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/projects/:id
   * Get a specific project (with chat count)
   */
  router.get('/:id', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const { id: projectId } = req.params;

      const project = await db.getProject(userId, projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Get chat count for this project
      const sessions = await db.listSessions({ userId, projectId });
      const chatCount = sessions.length;

      res.json({
        id: project.id,
        name: project.name,
        description: project.description,
        instructions: project.instructions,
        xeroTenantId: project.xeroTenantId,
        chatCount,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * PATCH /api/projects/:id
   * Update a project
   */
  router.patch('/:id', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const { id: projectId } = req.params;
      const { name, description, instructions, xeroTenantId } = req.body;

      // Validate name if provided
      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        res.status(400).json({ error: 'Project name cannot be empty' });
        return;
      }

      const updates: Partial<Project> = {};
      if (name !== undefined) updates.name = name.trim().substring(0, 100);
      if (description !== undefined) updates.description = description?.trim()?.substring(0, 500);
      if (instructions !== undefined) updates.instructions = instructions?.trim()?.substring(0, 5000);
      if (xeroTenantId !== undefined) updates.xeroTenantId = xeroTenantId?.trim();

      const updated = await db.updateProject(userId, projectId, updates);

      res.json({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        instructions: updated.instructions,
        xeroTenantId: updated.xeroTenantId,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    } catch (error: any) {
      if (error.name === 'RecordNotFoundError') {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      next(error);
    }
  });

  /**
   * DELETE /api/projects/:id
   * Delete a project
   */
  router.delete('/:id', async (req, res, next) => {
    try {
      const userId = req.userId!;
      const { id: projectId } = req.params;

      await db.deleteProject(userId, projectId);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
