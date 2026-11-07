import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase, deletePDFFromR2 } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { seedDemoCourseIfEmpty } from '../lib/OnboardingHelper';

export type FileNode = {
  id: string;
  name: string;
  type: 'folder' | 'course';
  parentId: string | null;
  createdAt: string; // Changed to string for ISO compatibility with PG
  color: string;
  order: number;
};

const STORAGE_KEY = 'aura_file_system';
const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'];

function getInitialCachedNodes(): FileNode[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to read initial nodes from localStorage:', e);
  }
  return [];
}

type FileSystemContextType = {
  nodes: FileNode[];
  isInitialLoad: boolean;
  addNode: (name: string, type: 'folder' | 'course', parentId: string | null) => Promise<FileNode>;
  deleteNode: (id: string) => Promise<void>;
  getChildren: (parentId: string | null) => FileNode[];
  getNode: (id: string | null) => FileNode | null;
  renameNode: (id: string, newName: string) => Promise<void>;
  moveNode: (id: string, newParentId: string | null) => Promise<void>;
  reorderNodes: (parentId: string | null, orderedIds: string[]) => Promise<void>;
  updateNodeColor: (id: string, newColor: string) => Promise<void>;
  refreshNodes: () => Promise<void>;
};

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

function useFileSystemInternal(): FileSystemContextType {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<FileNode[]>(getInitialCachedNodes);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(() => getInitialCachedNodes().length === 0);

  // Initial data loading & migration
  const loadData = useCallback(async () => {
    if (!user) {
      // Fallback to local if not logged in
      const localNodes = getInitialCachedNodes();
      if (localNodes.length > 0) {
        setNodes(localNodes);
      } else {
        const seeded = await seedDemoCourseIfEmpty();
        if (seeded) {
          setNodes([seeded.folderNode, seeded.courseNode]);
        }
      }
      setIsInitialLoad(false);
      return;
    }

    // 1. Fetch from Supabase
    const { data: cloudNodes, error } = await supabase
      .from('nodes')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching nodes:', error);
      setIsInitialLoad(false);
      return;
    }

    if (cloudNodes && cloudNodes.length > 0) {
      // We have cloud data, use it
      const mappedNodes: FileNode[] = cloudNodes.map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        parentId: n.parent_id,
        createdAt: n.created_at,
        color: n.color,
        order: n.order
      }));
      setNodes(mappedNodes);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedNodes));
      } catch {}
    } else {
      // 2. Migration Bridge: Check for local data to upload
      const localNodes = getInitialCachedNodes();
      if (localNodes.length > 0) {
        console.log('Migrating local nodes to Supabase...');
        const toInsert = localNodes.map((n: any) => ({
          id: n.id,
          user_id: user.id,
          name: n.name,
          type: n.type,
          parent_id: n.parentId,
          color: n.color,
          "order": n.order,
          created_at: new Date(n.createdAt).toISOString()
        }));

        const { error: insertError } = await supabase.from('nodes').insert(toInsert);
        if (!insertError) {
          setNodes(localNodes);
        }
      } else {
        // Brand new user: Seed demo course!
        const seeded = await seedDemoCourseIfEmpty(user.id);
        if (seeded) {
          setNodes([seeded.folderNode, seeded.courseNode]);
        } else {
          setNodes([]);
        }
      }
    }
    setIsInitialLoad(false);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save local fallback (Buffer)
  useEffect(() => {
    if (!isInitialLoad) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
      } catch {}
    }
  }, [nodes, isInitialLoad]);

  const addNode = async (name: string, type: 'folder' | 'course', parentId: string | null) => {
    const parentChildren = nodes.filter(n => n.parentId === parentId);
    const maxOrder = parentChildren.length > 0 ? Math.max(...parentChildren.map(n => n.order)) : -1;
    
    // For courses: default to neutral grey (#64748b) for "pas encore vu"
    // For folders: use theme accent or standard color
    const defaultColor = type === 'course' ? '#64748b' : COLORS[Math.floor(Math.random() * COLORS.length)];

    const nodeData = {
      id: crypto.randomUUID(),
      name,
      type,
      parentId,
      createdAt: new Date().toISOString(),
      color: defaultColor,
      order: maxOrder + 1,
    };

    // Optimistic update
    setNodes(prev => [...prev, nodeData]);

    if (user) {
      const { error } = await supabase.from('nodes').insert([{
        id: nodeData.id,
        user_id: user.id,
        name: nodeData.name,
        type: nodeData.type,
        parent_id: nodeData.parentId,
        color: nodeData.color,
        "order": nodeData.order,
        created_at: nodeData.createdAt
      }]);
      if (error) {
        console.error('Critical: Cloud Node creation failed:', error);
        throw error; // Let the UI handle the failure
      }
    }

    return nodeData;
  };

  const deleteNode = async (id: string) => {
    const getChildrenIds = (parentId: string): string[] => {
      const children = nodes.filter(n => n.parentId === parentId);
      return [...children.map(c => c.id), ...children.flatMap(c => getChildrenIds(c.id))];
    };
    const idsToDelete = [id, ...getChildrenIds(id)];

    // Optimistic update
    setNodes(prev => prev.filter(n => !idsToDelete.includes(n.id)));

    // Clean up local storage and R2 PDFs for deleted courses
    idsToDelete.forEach(deletedId => {
      const storageKey = `aura_subject_${deletedId}`;
      const savedDataStr = localStorage.getItem(storageKey);
      if (savedDataStr) {
        try {
          const parsed = JSON.parse(savedDataStr);
          if (parsed?.pdfUrl && (parsed.pdfUrl.includes('r2.cloudflarestorage.com') || parsed.pdfUrl.includes('.r2.dev'))) {
            deletePDFFromR2(parsed.pdfUrl);
          }
        } catch (e) {
          // ignore
        }
      }
      localStorage.removeItem(storageKey);
    });

    // Sync
    if (user) {
      const { error } = await supabase.from('nodes').delete().in('id', idsToDelete);
      if (error) console.error('Cloud delete failed:', error);
    }
  };

  const getChildren = (parentId: string | null) => {
    return nodes
      .filter(n => n.parentId === parentId)
      .sort((a,b) => a.order - b.order);
  };
  
  const getNode = (id: string | null) => {
    if (!id) return null;
    return nodes.find(n => n.id === id) || null;
  };

  const renameNode = async (id: string, newName: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, name: newName } : n));
    if (user) {
      await supabase.from('nodes').update({ name: newName }).eq('id', id);
    }
  };

  const moveNode = async (id: string, newParentId: string | null) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, parentId: newParentId } : n));
    if (user) {
      await supabase.from('nodes').update({ parent_id: newParentId }).eq('id', id);
    }
  };

  const reorderNodes = async (parentId: string | null, orderedIds: string[]) => {
    setNodes(prev => prev.map(node => {
      if (node.parentId === parentId) {
        const newOrder = orderedIds.indexOf(node.id);
        if (newOrder !== -1) return { ...node, order: newOrder };
      }
      return node;
    }));

    if (user) {
      // Create a list of updates. Note: Supabase upsert requires PK (id)
      const updates = orderedIds.map((id, index) => {
        const fullNode = nodes.find(n => n.id === id);
        return {
          id,
          user_id: user.id,
          name: fullNode?.name || '', // Keep existing values
          type: fullNode?.type || 'course',
          parent_id: parentId,
          "order": index
        };
      });

      const { error } = await supabase.from('nodes').upsert(updates);
      if (error) console.error('Cloud reorder failed:', error);
    }
  };

  const updateNodeColor = async (id: string, newColor: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, color: newColor } : n));
    if (user) {
      await supabase.from('nodes').update({ color: newColor }).eq('id', id);
    }
  };

  return { nodes, isInitialLoad, addNode, deleteNode, getChildren, getNode, renameNode, moveNode, reorderNodes, updateNodeColor, refreshNodes: loadData };
}

export function FileSystemProvider({ children }: { children: React.ReactNode }) {
  const value = useFileSystemInternal();
  return React.createElement(FileSystemContext.Provider, { value }, children);
}

export function useFileSystem(): FileSystemContextType {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
}
