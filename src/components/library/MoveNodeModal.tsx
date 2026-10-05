import React, { useState, useMemo, useEffect } from 'react';
import { 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  X, 
  Search, 
  Move, 
  Plus, 
  Loader2, 
  AlertCircle,
  Home
} from 'lucide-react';
import type { FileNode } from '../../hooks/useFileSystem';

interface MoveNodeModalProps {
  isOpen: boolean;
  nodeToMove: FileNode | null;
  nodes: FileNode[];
  onClose: () => void;
  onMove: (nodeId: string, targetParentId: string | null) => Promise<void> | void;
  onCreateFolder?: (name: string, parentId: string | null) => Promise<FileNode | null>;
}

export const MoveNodeModal: React.FC<MoveNodeModalProps> = ({
  isOpen,
  nodeToMove,
  nodes,
  onClose,
  onMove,
  onCreateFolder
}) => {
  // Current selected destination (null = root)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Inline folder creation state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);

  // Initialize selected target to current parent when modal opens
  useEffect(() => {
    if (isOpen && nodeToMove) {
      setSelectedTargetId(nodeToMove.parentId ?? null);
      setSearchQuery('');
      setIsCreatingFolder(false);
      setNewFolderName('');

      // Auto-expand all parent folders of the current parent so the tree is conveniently open
      const initialExpanded = new Set<string>();
      let curr = nodeToMove.parentId ? nodes.find(n => n.id === nodeToMove.parentId) : null;
      while (curr) {
        initialExpanded.add(curr.id);
        curr = curr.parentId ? nodes.find(n => n.id === curr?.parentId) : null;
      }
      // Also expand root folders
      nodes.filter(n => n.type === 'folder' && n.parentId === null).forEach(f => initialExpanded.add(f.id));
      setExpandedIds(initialExpanded);
    }
  }, [isOpen, nodeToMove, nodes]);

  // Anti-loop security: compute all forbidden IDs
  const forbiddenIds = useMemo(() => {
    const set = new Set<string>();
    if (!nodeToMove) return set;

    // A node cannot be moved into itself
    set.add(nodeToMove.id);

    // If it's a folder, it cannot be moved into any of its descendants
    if (nodeToMove.type === 'folder') {
      const queue = [nodeToMove.id];
      while (queue.length > 0) {
        const currId = queue.shift()!;
        const children = nodes.filter(n => n.parentId === currId && n.type === 'folder');
        for (const child of children) {
          set.add(child.id);
          queue.push(child.id);
        }
      }
    }

    return set;
  }, [nodeToMove, nodes]);

  // Filter only folders
  const allFolders = useMemo(() => {
    return nodes.filter(n => n.type === 'folder');
  }, [nodes]);

  // Calculate items count inside a folder (courses + subfolders)
  const getChildrenCount = (folderId: string | null) => {
    return nodes.filter(n => n.parentId === folderId).length;
  };

  // Toggle expand/collapse
  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Compute breadcrumb path for a given node
  const getNodePath = (folderId: string | null): string => {
    if (folderId === null) return 'Bibliothèque';
    const path: string[] = [];
    let curr = nodes.find(n => n.id === folderId);
    while (curr) {
      path.unshift(curr.name);
      curr = nodes.find(n => n.id === curr?.parentId);
    }
    return ['Bibliothèque', ...path].join(' > ');
  };

  // Handle move confirmation
  const handleConfirm = async () => {
    if (!nodeToMove || isSubmitting) return;
    if (selectedTargetId !== null && forbiddenIds.has(selectedTargetId)) return;
    if (selectedTargetId === (nodeToMove.parentId ?? null)) return;

    setIsSubmitting(true);
    try {
      await onMove(nodeToMove.id, selectedTargetId);
      onClose();
    } catch (err) {
      console.error('Failed to move node:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle inline folder creation
  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim() || !onCreateFolder || isCreatingLoading) return;
    setIsCreatingLoading(true);
    try {
      const created = await onCreateFolder(newFolderName.trim(), selectedTargetId);
      if (created) {
        // Expand the target folder so the new folder is visible
        if (selectedTargetId) {
          setExpandedIds(prev => new Set(prev).add(selectedTargetId));
        }
        // Select the newly created folder as destination
        setSelectedTargetId(created.id);
        setNewFolderName('');
        setIsCreatingFolder(false);
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setIsCreatingLoading(false);
    }
  };

  if (!isOpen || !nodeToMove) return null;

  const isSameLocation = selectedTargetId === (nodeToMove.parentId ?? null);
  const isForbidden = selectedTargetId !== null && forbiddenIds.has(selectedTargetId);
  const canSubmit = !isSameLocation && !isForbidden && !isSubmitting;

  // Filtered folders when searching
  const searchResults = searchQuery.trim()
    ? allFolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : null;

  // Recursive tree rendering
  const renderFolderBranch = (parentId: string | null, depth = 0): React.ReactNode => {
    const subfolders = allFolders
      .filter(f => f.parentId === parentId)
      .sort((a, b) => a.order - b.order);

    if (subfolders.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {subfolders.map(folder => {
          const isSelected = selectedTargetId === folder.id;
          const isSelf = folder.id === nodeToMove.id;
          const isDescendant = forbiddenIds.has(folder.id) && !isSelf;
          const isCurrentParent = (nodeToMove.parentId ?? null) === folder.id;
          const isItemForbidden = isSelf || isDescendant;
          const isExpanded = expandedIds.has(folder.id);
          const childSubfolders = allFolders.filter(f => f.parentId === folder.id);
          const totalChildren = getChildrenCount(folder.id);

          return (
            <div key={folder.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                onClick={() => {
                  if (!isItemForbidden) {
                    setSelectedTargetId(folder.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 0.75rem',
                  paddingLeft: `${depth * 20 + 12}px`,
                  borderRadius: '0.65rem',
                  cursor: isItemForbidden ? 'not-allowed' : 'pointer',
                  opacity: isItemForbidden ? 0.45 : 1,
                  backgroundColor: isSelected 
                    ? 'var(--accent-light)' 
                    : 'transparent',
                  border: isSelected 
                    ? '1px solid var(--accent-primary)' 
                    : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                className={!isItemForbidden && !isSelected ? 'hover-bg-subtle' : ''}
              >
                {/* Expand / Collapse toggle */}
                <button
                  type="button"
                  onClick={(e) => toggleExpand(folder.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: childSubfolders.length > 0 ? 'pointer' : 'default',
                    color: 'var(--text-secondary)',
                    opacity: childSubfolders.length > 0 ? 1 : 0.2
                  }}
                  disabled={childSubfolders.length === 0}
                >
                  {childSubfolders.length > 0 ? (
                    isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                  ) : (
                    <span style={{ width: 14 }} />
                  )}
                </button>

                {/* Folder icon */}
                <div 
                  style={{ 
                    width: '26px', 
                    height: '26px', 
                    borderRadius: '0.4rem', 
                    backgroundColor: `${folder.color || 'var(--accent-primary)'}20`,
                    color: folder.color || 'var(--accent-primary)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Folder size={15} />
                </div>

                {/* Folder Name & Badges */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {folder.name}
                  </span>

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                    ({totalChildren} élément{totalChildren > 1 ? 's' : ''})
                  </span>

                  {isCurrentParent && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '1rem',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      fontWeight: 600
                    }}>
                      📍 Emplacement actuel
                    </span>
                  )}

                  {isSelf && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '1rem',
                      backgroundColor: 'var(--danger-light)',
                      color: 'var(--danger)',
                      fontWeight: 600
                    }}>
                      🚫 Dossier en cours de déplacement
                    </span>
                  )}

                  {isDescendant && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '1rem',
                      backgroundColor: 'var(--danger-light)',
                      color: 'var(--danger)',
                      fontWeight: 600
                    }}>
                      🚫 Sous-dossier enfant (anti-boucle)
                    </span>
                  )}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Render subfolders recursively if expanded */}
              {isExpanded && childSubfolders.length > 0 && (
                renderFolderBranch(folder.id, depth + 1)
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className="fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '1.25rem',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '0.6rem',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Move size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Déplacer « {nodeToMove.name} »
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Choisissez le dossier de destination
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search input & New folder trigger */}
        <div style={{ padding: '0.85rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '0.6rem' }}>
          <div style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} style={{ position: 'absolute', left: '0.8rem', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Filtrer les dossiers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.8rem 0.55rem 2.2rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.2rem'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {onCreateFolder && !isCreatingFolder && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsCreatingFolder(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.5rem 0.8rem',
                fontSize: '0.825rem',
                borderRadius: '0.6rem',
                flexShrink: 0
              }}
              title="Créer un nouveau dossier à l'emplacement sélectionné"
            >
              <Plus size={15} />
              <span className="desktop-only">Nouveau dossier</span>
            </button>
          )}
        </div>

        {/* Inline Folder Creation Form */}
        {isCreatingFolder && (
          <div style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Créer un sous-dossier dans : <strong>{selectedTargetId === null ? 'Racine de la bibliothèque' : (nodes.find(n => n.id === selectedTargetId)?.name || 'Dossier')}</strong>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                autoFocus
                placeholder="Nom du nouveau dossier..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNewFolder();
                  if (e.key === 'Escape') setIsCreatingFolder(false);
                }}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateNewFolder}
                disabled={!newFolderName.trim() || isCreatingLoading}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', borderRadius: '0.5rem' }}
              >
                {isCreatingLoading ? <Loader2 size={14} className="animate-spin" /> : 'Créer'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', borderRadius: '0.5rem' }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Tree Container / Search Results */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          minHeight: '220px'
        }}>
          {searchResults ? (
            /* Search Mode: Flat list with paths */
            searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                <Folder size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.88rem' }}>Aucun dossier ne correspond à « {searchQuery} »</p>
              </div>
            ) : (
              searchResults.map(folder => {
                const isSelected = selectedTargetId === folder.id;
                const isSelf = folder.id === nodeToMove.id;
                const isDescendant = forbiddenIds.has(folder.id) && !isSelf;
                const isCurrentParent = (nodeToMove.parentId ?? null) === folder.id;
                const isItemForbidden = isSelf || isDescendant;

                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      if (!isItemForbidden) setSelectedTargetId(folder.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '0.65rem',
                      cursor: isItemForbidden ? 'not-allowed' : 'pointer',
                      opacity: isItemForbidden ? 0.45 : 1,
                      backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      transition: 'all 0.15s ease'
                    }}
                    className={!isItemForbidden && !isSelected ? 'hover-bg-subtle' : ''}
                  >
                    <div 
                      style={{ 
                        width: '26px', 
                        height: '26px', 
                        borderRadius: '0.4rem', 
                        backgroundColor: `${folder.color || 'var(--accent-primary)'}20`,
                        color: folder.color || 'var(--accent-primary)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Folder size={15} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {folder.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {getNodePath(folder.parentId)}
                      </span>
                    </div>

                    {isCurrentParent && (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '1rem', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        📍 Emplacement actuel
                      </span>
                    )}

                    {isItemForbidden && (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                        🚫 Impossible
                      </span>
                    )}

                    {isSelected && (
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            /* Tree Mode: Hierarchical expandable tree */
            <>
              {/* Root / Bibliothèque Level Option */}
              <div
                onClick={() => setSelectedTargetId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '0.65rem',
                  cursor: 'pointer',
                  backgroundColor: selectedTargetId === null ? 'var(--accent-light)' : 'transparent',
                  border: selectedTargetId === null ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  transition: 'all 0.15s ease'
                }}
                className={selectedTargetId !== null ? 'hover-bg-subtle' : ''}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '0.45rem',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Home size={16} />
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: selectedTargetId === null ? 700 : 600, color: selectedTargetId === null ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      Racine de la bibliothèque
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Niveau principal (en dehors de tout dossier)
                    </div>
                  </div>

                  {nodeToMove.parentId === null && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '1rem',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      fontWeight: 600,
                      marginLeft: 'auto'
                    }}>
                      📍 Emplacement actuel
                    </span>
                  )}
                </div>

                {selectedTargetId === null && (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Subfolders tree from root */}
              <div style={{ marginTop: '0.5rem' }}>
                {renderFolderBranch(null, 0)}
              </div>
            </>
          )}
        </div>

        {/* Footer with Destination Preview and Confirm Button */}
        <div style={{
          padding: '1.1rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          {/* Destination Path Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Destination :</span>
            <span style={{ 
              fontWeight: 600, 
              color: 'var(--accent-primary)', 
              backgroundColor: 'var(--bg-elevated)', 
              padding: '0.2rem 0.6rem', 
              borderRadius: '0.4rem',
              border: '1px solid var(--border-color)' 
            }}>
              {getNodePath(selectedTargetId)}
            </span>
          </div>

          {/* Warning notice if same location */}
          {isSameLocation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <AlertCircle size={14} color="var(--accent-primary)" />
              <span>Cet élément se trouve déjà à cet emplacement. Sélectionnez un autre dossier.</span>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '0.6rem 1.2rem', fontSize: '0.875rem' }}
            >
              Annuler
            </button>

            <button
              type="button"
              className="btn btn-primary shadow-sm"
              onClick={handleConfirm}
              disabled={!canSubmit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.4rem',
                fontSize: '0.875rem',
                opacity: canSubmit ? 1 : 0.5,
                cursor: canSubmit ? 'pointer' : 'not-allowed'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Déplacement en cours...</span>
                </>
              ) : (
                <>
                  <Move size={16} />
                  <span>Déplacer ici</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
