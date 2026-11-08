import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFileSystem, type FileNode } from '../hooks/useFileSystem';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { Folder, FileText, Plus, Trash2, ChevronRight, Edit3, Move, Zap, GraduationCap, MoreHorizontal, GripVertical } from 'lucide-react';
import { MoveNodeModal } from '../components/library/MoveNodeModal';
import { AnnaleExamImportModal } from '../components/library/AnnaleExamImportModal';
import { FolderRevisionModal } from '../components/library/FolderRevisionModal';
import { SupportWidget } from '../components/support/SupportWidget';
import { getDailyUsage } from '../lib/gemini';
import { supabase } from '../lib/supabase';
import './Library.css';

export default function Library() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { alert, confirm, prompt } = useDialog();
  const { profile } = useAuth();
  const { nodes, isInitialLoad, deleteNode, getChildren, getNode, addNode, renameNode, moveNode, reorderNodes } = useFileSystem();
  
  const currentFolderId = folderId || null;
  const [nodeToMove, setNodeToMove] = useState<FileNode | null>(null);
  const [isAnnaleModalOpen, setIsAnnaleModalOpen] = useState(false);
  const [revisionFolder, setRevisionFolder] = useState<{ id: string | null; name: string } | null>(null);
  const [dailyUsage, setDailyUsage] = useState<number>(0);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [openMenuId]);

  const maxGenerations = profile?.plan === 'premium' ? 50 : 5;
  const isQuotaReached = dailyUsage >= maxGenerations;

  useEffect(() => {
    const refreshUsage = () => {
      getDailyUsage().then(count => setDailyUsage(count));
    };
    refreshUsage();
    window.addEventListener('ai-usage-updated', refreshUsage);
    return () => window.removeEventListener('ai-usage-updated', refreshUsage);
  }, []);

  // Note: open-onboarding-tour is handled globally by InteractiveGameTour in Layout
  
  const currentFolder = getNode(currentFolderId);
  const items = getChildren(currentFolderId);

  // Breadcrumbs
  const getBreadcrumbs = () => {
    const breadcrumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Bibliothèque' }];
    let current = currentFolder;
    while (current) {
      breadcrumbs.splice(1, 0, { id: current.id, name: current.name });
      current = getNode(current.parentId);
    }
    return breadcrumbs;
  };

  const navigateToFolder = (id: string | null) => {
    navigate(id ? `/${id}` : '/');
  };

  const handleCreateFolder = async () => {
    const name = await prompt('Nom du nouveau dossier :');
    if (name) await addNode(name, 'folder', currentFolderId);
  };

  const handleCreateCourse = async () => {
    const totalCourses = nodes.filter(n => n.type === 'course').length;
    if (profile?.plan !== 'premium' && totalCourses >= 10) {
      await alert('Limite du plan Gratuit atteinte (10 cours maximum). Passez au plan Premium pour créer des cours illimités !');
      return;
    }

    const name = await prompt('Nom du nouveau cours :');
    if (name) {
      try {
        const newNode = await addNode(name, 'course', currentFolderId);
        navigate(`/subject/${newNode.id}`);
      } catch (e) {
        await alert('Erreur lors de la création du cours sur le serveur. Réessayez.');
      }
    }
  };

  const handleRename = async (e: React.MouseEvent, item: FileNode) => {
    e.stopPropagation();
    const newName = await prompt('Nouveau nom :', item.name);
    if (newName && newName !== item.name) {
      renameNode(item.id, newName);
    }
  };

  const handleMove = (e: React.MouseEvent, item: FileNode) => {
    e.stopPropagation();
    setNodeToMove(item);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    setOpenMenuId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId && draggedId !== targetId && dragOverId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDragLeave = (targetId: string) => {
    if (dragOverId === targetId) {
      setDragOverId(null);
    }
  };

  const handleDropReorder = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedId || e.dataTransfer.getData('text/plain');
    setDraggedId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;

    const fromIndex = items.findIndex(i => i.id === sourceId);
    const toIndex = items.findIndex(i => i.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const newItems = [...items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    reorderNodes(currentFolderId, newItems.map(i => i.id));
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (await confirm('Voulez-vous vraiment supprimer cet élément et tout son contenu ?')) {
      deleteNode(id);
    }
  };

  const handleItemClick = (item: FileNode) => {
    if (nodeToMove) return;
    if (item.type === 'folder') {
      navigateToFolder(item.id);
    } else if (item.name.startsWith('🎓')) {
      navigate(`/annale/${item.id}`);
    } else {
      navigate(`/subject/${item.id}`);
    }
  };

  const handleAnnaleSuccess = async (annaleTitle: string, questions: any[]) => {
    try {
      const nodeName = `🎓 ${annaleTitle}`;
      const newNode = await addNode(nodeName, 'course', currentFolderId);

      const textContent = questions.map(q => `${q.question}\n${(q.options || []).join('\n')}`).join('\n\n');

      if (profile?.id) {
        await supabase.from('course_data').upsert({
          course_id: newNode.id,
          user_id: profile.id,
          extracted_content: textContent,
          generations: {
            is_annale: true,
            questions: questions,
            annale_folder_id: currentFolderId
          },
          updated_at: new Date().toISOString()
        });
      }

      localStorage.setItem(`aura_subject_${newNode.id}`, JSON.stringify({
        extractedContent: textContent,
        generations: {
          is_annale: true,
          questions: questions,
          mcq: JSON.stringify(questions)
        }
      }));

      setIsAnnaleModalOpen(false);
      navigate(`/annale/${newNode.id}`);
    } catch (err) {
      console.error('Erreur lors de la création de l\'annale:', err);
      alert('Erreur lors de la création de l\'annale.');
    }
  };

  return (
    <div className="fade-in library-page">
      {/* Header & Breadcrumbs */}
      <header className="library-header">
        <div className="title-section">
          <div className="breadcrumbs">
            {getBreadcrumbs().map((bc, idx) => (
              <React.Fragment key={bc.id || 'root'}>
                {idx > 0 && <ChevronRight size={14} className="separator" />}
                <button 
                  onClick={() => navigateToFolder(bc.id)}
                  className={`breadcrumb-item ${idx === getBreadcrumbs().length - 1 ? 'last' : ''}`}
                >
                  {bc.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          <h1>
            {currentFolder ? currentFolder.name : 'Bibliothèque'}
          </h1>
        </div>

        <div className="action-buttons">
          <button 
            data-tour="tour-revision-btn"
            className="btn btn-outline" 
            onClick={() => setRevisionFolder({ id: currentFolderId, name: currentFolder ? currentFolder.name : 'Toute la bibliothèque' })}
            title="Lancer une révision globale des cartes de ce dossier"
          >
            <Zap size={16} style={{ color: 'var(--accent-primary)' }} />
            <span className="desktop-only">{currentFolder ? 'Réviser le dossier' : 'Révision Globale'}</span>
            <span className="mobile-only">Réviser</span>
          </button>
          <button 
            data-tour="tour-annale-btn"
            className="btn btn-outline" 
            onClick={() => {
              if (isQuotaReached) {
                alert(`Limite quotidienne de générations atteinte (${dailyUsage}/${maxGenerations} générations). ${profile?.plan === 'premium' ? 'Revenez demain !' : 'Passez au plan Premium pour 50 générations/jour !'}`);
                return;
              }
              setIsAnnaleModalOpen(true);
            }}
            disabled={isQuotaReached}
            title={isQuotaReached ? `Limite d'IA atteinte (${dailyUsage}/${maxGenerations})` : "Importer une annale officielle au format PDF pour ce dossier"}
            style={{ 
              opacity: isQuotaReached ? 0.45 : 1,
              cursor: isQuotaReached ? 'not-allowed' : 'pointer'
            }}
          >
            <GraduationCap size={16} style={{ color: 'var(--text-secondary)' }} />
            <span className="desktop-only">Importer une annale</span>
            <span className="mobile-only">Annale</span>
          </button>
          <button className="btn btn-outline" onClick={handleCreateFolder}>
            <Plus size={16} /> <span className="desktop-only">Dossier</span>
          </button>
          <button className="btn btn-primary" onClick={handleCreateCourse}>
            <Plus size={16} /> <span className="desktop-only">Nouveau cours</span>
            <span className="mobile-only">Cours</span>
          </button>
        </div>
      </header>

      {/* Annale Exam Import Modal */}
      <AnnaleExamImportModal
        isOpen={isAnnaleModalOpen}
        onClose={() => setIsAnnaleModalOpen(false)}
        onSuccess={handleAnnaleSuccess}
        folderName={currentFolder?.name}
      />

      {/* Interactive Move Modal */}
      <MoveNodeModal
        isOpen={!!nodeToMove}
        nodeToMove={nodeToMove}
        nodes={nodes}
        onClose={() => setNodeToMove(null)}
        onMove={async (id, targetParentId) => {
          await moveNode(id, targetParentId);
          setNodeToMove(null);
        }}
        onCreateFolder={async (name, parentId) => {
          return await addNode(name, 'folder', parentId);
        }}
      />

      {isInitialLoad && items.length === 0 ? (
        <div className="folder-grid" aria-busy="true">
          {[1, 2, 3, 4].map((skeletonIdx) => (
            <div
              key={skeletonIdx}
              className="folder-card glass-panel"
              style={{ pointerEvents: 'none', minHeight: '115px', justifyContent: 'space-between' }}
            >
              <div className="folder-header">
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                />
              </div>
              <div
                style={{
                  height: '16px',
                  width: '65%',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  animation: 'pulse 1.5s infinite ease-in-out',
                }}
              />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', borderRadius: '1.5rem', minHeight: '300px' }}>
          <Folder size={64} style={{ opacity: 0.3, marginBottom: '1.5rem' }} />
          <h3 style={{ margin: 0 }}>C'est bien vide par ici...</h3>
          <p style={{ marginTop: '0.5rem' }}>Commence par créer un dossier ou ajouter un cours ! 🚀</p>
        </div>
      ) : (
        <div className="folder-grid">
          {items.map(item => {
            const isAnnale = item.type === 'course' && item.name.startsWith('🎓');
            const cleanName = isAnnale ? item.name.replace(/^🎓\s*/, '') : item.name;
            const isMenuOpen = openMenuId === item.id;
            const isBeingDragged = draggedId === item.id;
            const isDragTarget = dragOverId === item.id && draggedId !== item.id;

            return (
              <div 
                key={item.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={() => handleDragLeave(item.id)}
                onDrop={(e) => handleDropReorder(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`folder-card hover-lift glass-panel ${isBeingDragged ? 'is-dragging' : ''} ${isDragTarget ? 'is-drag-over' : ''}`}
                onClick={() => handleItemClick(item)}
                style={{
                  ...(isAnnale 
                    ? { border: '1px solid rgba(219, 39, 119, 0.4)', background: 'linear-gradient(145deg, var(--bg-surface), rgba(219, 39, 119, 0.05))' }
                    : item.type === 'course' 
                    ? { border: '1px solid var(--accent-primary)' } 
                    : {}),
                  ...(isDragTarget ? { border: '2px dashed var(--accent-primary)', transform: 'scale(1.02)' } : {}),
                  ...(isBeingDragged ? { opacity: 0.45 } : {}),
                  overflow: isMenuOpen ? 'visible' : 'hidden',
                  zIndex: isMenuOpen ? 30 : 1
                }}
              >
                <div className="folder-header">
                  <div 
                    className="folder-icon-wrapper shadow-sm"
                    style={{ 
                      backgroundColor: isAnnale ? 'rgba(219, 39, 119, 0.15)' : item.type === 'folder' ? `${item.color}20` : 'var(--bg-elevated)', 
                      color: isAnnale ? 'var(--accent-primary)' : item.type === 'folder' ? item.color : 'var(--accent-primary)' 
                    }}
                  >
                    {item.type === 'folder' ? <Folder size={28} /> : isAnnale ? <GraduationCap size={28} /> : <FileText size={28} />}
                  </div>
                  
                  <div className="folder-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: isMenuOpen ? 1 : undefined, transform: isMenuOpen ? 'none' : undefined }}>
                    <div
                      className="drag-handle-hint"
                      title="Glisser-déposer pour réorganiser l'ordre"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        cursor: 'grab',
                        padding: '0.25rem',
                        opacity: 0.65
                      }}
                    >
                      <GripVertical size={16} />
                    </div>

                    <div style={{ position: 'relative' }}>
                      <button
                        className="icon-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : item.id);
                        }}
                        title="Options (Modifier, Déplacer, Supprimer)"
                        aria-label="Options"
                      >
                        <MoreHorizontal size={17} />
                      </button>

                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            right: 0,
                            minWidth: '155px',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.75rem',
                            boxShadow: 'var(--shadow-lg)',
                            padding: '0.35rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.15rem',
                            zIndex: 50,
                            animation: 'fadeIn 0.15s ease-out'
                          }}
                        >
                          <button
                            onClick={(e) => {
                              setOpenMenuId(null);
                              handleRename(e, item);
                            }}
                            className="hover-bg-subtle"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.55rem',
                              padding: '0.5rem 0.7rem',
                              borderRadius: '0.5rem',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text-primary)',
                              fontSize: '0.82rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%'
                            }}
                          >
                            <Edit3 size={14} color="var(--accent-primary)" />
                            <span>Renommer</span>
                          </button>

                          <button
                            onClick={(e) => {
                              setOpenMenuId(null);
                              handleMove(e, item);
                            }}
                            className="hover-bg-subtle"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.55rem',
                              padding: '0.5rem 0.7rem',
                              borderRadius: '0.5rem',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text-primary)',
                              fontSize: '0.82rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%'
                            }}
                          >
                            <Move size={14} color="var(--accent-primary)" />
                            <span>Déplacer</span>
                          </button>

                          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '0.15rem 0.25rem' }} />

                          <button
                            onClick={(e) => {
                              setOpenMenuId(null);
                              handleDelete(e, item.id);
                            }}
                            className="hover-bg-subtle"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.55rem',
                              padding: '0.5rem 0.7rem',
                              borderRadius: '0.5rem',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--danger)',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%'
                            }}
                          >
                            <Trash2 size={14} color="var(--danger)" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="folder-info">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>{cleanName}</h3>
                    {isAnnale && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '0.5rem',
                        backgroundColor: 'rgba(219, 39, 119, 0.15)',
                        color: 'var(--accent-primary)',
                        flexShrink: 0
                      }}>
                        Annale
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Folder Global Revision Modal */}
      {revisionFolder && (
        <FolderRevisionModal
          isOpen={!!revisionFolder}
          onClose={() => setRevisionFolder(null)}
          folderId={revisionFolder.id}
          folderName={revisionFolder.name}
          allNodes={nodes}
        />
      )}

      {/* Instant Help & Guide Deterministic Widget */}
      <SupportWidget />
    </div>
  );
}
