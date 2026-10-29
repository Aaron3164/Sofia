import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFileSystem, type FileNode } from '../hooks/useFileSystem';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { Folder, FileText, Plus, Trash2, ChevronRight, Edit3, Move, ChevronLeft, Zap, GraduationCap } from 'lucide-react';
import { MoveNodeModal } from '../components/library/MoveNodeModal';
import { AnnaleExamImportModal } from '../components/library/AnnaleExamImportModal';
import { FolderRevisionModal } from '../components/library/FolderRevisionModal';
import { getDailyUsage } from '../lib/gemini';
import { supabase } from '../lib/supabase';
import './Library.css';

export default function Library() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { alert, confirm, prompt } = useDialog();
  const { profile } = useAuth();
  const { nodes, deleteNode, getChildren, getNode, addNode, renameNode, moveNode, reorderNodes } = useFileSystem();
  
  const currentFolderId = folderId || null;
  const [nodeToMove, setNodeToMove] = useState<FileNode | null>(null);
  const [isAnnaleModalOpen, setIsAnnaleModalOpen] = useState(false);
  const [revisionFolder, setRevisionFolder] = useState<{ id: string | null; name: string } | null>(null);
  const [dailyUsage, setDailyUsage] = useState<number>(0);

  const maxGenerations = profile?.plan === 'premium' ? 100 : 10;
  const isQuotaReached = dailyUsage >= maxGenerations;

  useEffect(() => {
    const refreshUsage = () => {
      getDailyUsage().then(count => setDailyUsage(count));
    };
    refreshUsage();
    window.addEventListener('ai-usage-updated', refreshUsage);
    return () => window.removeEventListener('ai-usage-updated', refreshUsage);
  }, []);
  
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

  const handleReorder = (e: React.MouseEvent, item: FileNode, direction: 'prev' | 'next') => {
    e.stopPropagation();
    const currentIndex = items.indexOf(item);
    if (direction === 'prev' && currentIndex > 0) {
      const newItems = [...items];
      [newItems[currentIndex], newItems[currentIndex - 1]] = [newItems[currentIndex - 1], newItems[currentIndex]];
      reorderNodes(currentFolderId, newItems.map(i => i.id));
    } else if (direction === 'next' && currentIndex < items.length - 1) {
      const newItems = [...items];
      [newItems[currentIndex], newItems[currentIndex + 1]] = [newItems[currentIndex + 1], newItems[currentIndex]];
      reorderNodes(currentFolderId, newItems.map(i => i.id));
    }
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
            {currentFolder ? `📁 ${currentFolder.name}` : '📚 Bibliothèque'}
          </h1>
        </div>

        <div className="action-buttons">
          <button 
            className="btn btn-outline shadow-sm hover-lift" 
            onClick={() => setRevisionFolder({ id: currentFolderId, name: currentFolder ? currentFolder.name : 'Toute la bibliothèque' })}
            title="Lancer une révision globale des cartes de ce dossier"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              borderColor: 'rgba(99, 102, 241, 0.45)', 
              color: 'var(--accent-primary)',
              background: 'rgba(99, 102, 241, 0.08)'
            }}
          >
            <Zap size={16} />
            <span className="desktop-only">{currentFolder ? 'Réviser le dossier' : 'Révision Globale'}</span>
            <span className="mobile-only">Réviser</span>
          </button>
          <button className="btn btn-outline shadow-sm" onClick={handleCreateFolder}>
            <Plus size={18} /> <span className="desktop-only">Dossier</span>
          </button>
          <button 
            className="btn btn-outline shadow-sm" 
            onClick={() => {
              if (isQuotaReached) {
                alert(`Limite quotidienne atteinte (${dailyUsage}/${maxGenerations} générations). Revenez demain ou passez au plan Premium !`);
                return;
              }
              setIsAnnaleModalOpen(true);
            }}
            disabled={isQuotaReached}
            title={isQuotaReached ? `Limite d'IA atteinte (${dailyUsage}/${maxGenerations})` : "Importer une annale officielle au format PDF pour ce dossier"}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              borderColor: 'rgba(219, 39, 119, 0.4)', 
              color: 'var(--accent-primary)',
              opacity: isQuotaReached ? 0.45 : 1,
              cursor: isQuotaReached ? 'not-allowed' : 'pointer'
            }}
          >
            <GraduationCap size={18} />
            <span className="desktop-only">Importer une annale</span>
            <span className="mobile-only">Annale</span>
          </button>
          <button className="btn btn-primary shadow-md" onClick={handleCreateCourse}>
            <Plus size={18} /> <span className="desktop-only">Nouveau Cours</span>
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

      {items.length === 0 ? (
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

            return (
              <div 
                key={item.id} 
                className="folder-card hover-lift glass-panel"
                onClick={() => handleItemClick(item)}
                style={
                  isAnnale 
                    ? { border: '1px solid rgba(219, 39, 119, 0.4)', background: 'linear-gradient(145deg, var(--bg-surface), rgba(219, 39, 119, 0.05))' }
                    : item.type === 'course' 
                    ? { border: '1px solid var(--accent-primary)' } 
                    : {}
                }
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
                  
                  <div className="folder-actions" style={{ display: 'flex', gap: '0.4rem' }}>
                    {item.type === 'folder' && (
                      <button 
                        className="icon-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevisionFolder({ id: item.id, name: item.name });
                        }} 
                        title="Réviser les flashcards de ce dossier"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        <Zap size={16} />
                      </button>
                    )}
                     <button className="icon-button" onClick={(e) => handleReorder(e, item, 'prev')} title="Déplacer vers la gauche" disabled={items.indexOf(item) === 0} style={{ opacity: items.indexOf(item) === 0 ? 0.3 : 1 }}>
                      <ChevronLeft size={16} />
                    </button>
                    <button className="icon-button" onClick={(e) => handleReorder(e, item, 'next')} title="Déplacer vers la droite" disabled={items.indexOf(item) === items.length - 1} style={{ opacity: items.indexOf(item) === items.length - 1 ? 0.3 : 1 }}>
                      <ChevronRight size={16} />
                    </button>
                     <button className="icon-button" onClick={(e) => handleRename(e, item)} title="Renommer">
                      <Edit3 size={16} />
                    </button>
                    <button className="icon-button" onClick={(e) => handleMove(e, item)} title="Déplacer">
                      <Move size={16} />
                    </button>
                    <button className="icon-button delete-btn" onClick={(e) => handleDelete(e, item.id)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
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
    </div>
  );
}
