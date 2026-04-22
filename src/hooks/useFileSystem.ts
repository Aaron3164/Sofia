import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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

export function useFileSystem() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Initial data loading & migration
  useEffect(() => {
    async function loadData() {
      if (!user) {
        // Fallback to local if not logged in
        const saved = localStorage.getItem(STORAGE_KEY);
        setNodes(saved ? JSON.parse(saved) : []);
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
        return;
      }

      if (cloudNodes && cloudNodes.length > 0) {
        // We have cloud data, use it
        setNodes(cloudNodes.map(n => ({
          id: n.id,
          name: n.name,
          type: n.type,
          parentId: n.parent_id,
          createdAt: n.created_at,
          color: n.color,
          order: n.order
        })));
      } else {
        // 2. Migration Bridge: Check for local data to upload
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const localNodes = JSON.parse(saved);
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
              // Optional: Clear localStorage after migration? 
              // Better stay safe for now.
            }
          }
        }
      }
      setIsInitialLoad(false);
    }

    loadData();
  }, [user]);

  // Save local fallback (Buffer)
  useEffect(() => {
    if (!isInitialLoad) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    }
  }, [nodes, isInitialLoad]);

  const addNode = async (name: string, type: 'folder' | 'course', parentId: string | null) => {
    const parentChildren = nodes.filter(n => n.parentId === parentId);
    const maxOrder = parentChildren.length > 0 ? Math.max(...parentChildren.map(n => n.order)) : -1;
    
    const nodeData = {
      id: crypto.randomUUID(),
      name,
      type,
      parentId,
      createdAt: new Date().toISOString(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
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

    // Sync
    if (user) {
      const { error } = await supabase.from('nodes').delete().in('id', idsToDelete);
      if (error) console.error('Cloud delete failed:', error);
    } else {
      // Local cleanups only if not logged in
      idsToDelete.forEach(deletedId => {
        localStorage.removeItem(`aura_subject_${deletedId}`);
      });
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

  return { nodes, addNode, deleteNode, getChildren, getNode, renameNode, moveNode, reorderNodes };
}
