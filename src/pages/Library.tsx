import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFileSystem, type FileNode } from '../hooks/useFileSystem';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { Folder, FileText, Plus, Trash2, ChevronRight, Edit3, Move, ChevronLeft, Zap } from 'lucide-react';
import { MoveNodeModal } from '../components/library/MoveNodeModal';
import { GoogleDriveImportModal } from '../components/library/GoogleDriveImportModal';
import { FolderRevisionModal } from '../components/library/FolderRevisionModal';
import './Library.css';

export default function Library() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { alert, confirm, prompt } = useDialog();
  const { profile } = useAuth();
  const { nodes, deleteNode, getChildren, getNode, addNode, renameNode, moveNode, reorderNodes } = useFileSystem();
  
  const currentFolderId = folderId || null;
  const [nodeToMove, setNodeToMove] = useState<FileNode | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [revisionFolder, setRevisionFolder] = useState<{ id: string | null; name: string } | null>(null);
  
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
    } else {
      navigate(`/subject/${item.id}`);
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
            onClick={() => setIsDriveModalOpen(true)}
            title="Importer un PDF depuis Google Drive sans consommer d'espace de stockage R2"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <svg width="17" height="17" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066da"/>
              <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 49.9 0 51.45 0 53h27.5L43.65 25z" fill="#00ac47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15 7.9 13.65z" fill="#ea4335"/>
              <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2L43.65 25z" fill="#00832d"/>
              <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2L59.8 53z" fill="#2684fc"/>
              <path d="M73.4 26.5 60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5l-12.7-22z" fill="#ffba00"/>
            </svg>
            <span className="desktop-only">Importer Drive</span>
            <span className="mobile-only">Drive</span>
          </button>
          <button className="btn btn-primary shadow-md" onClick={handleCreateCourse}>
            <Plus size={18} /> <span className="desktop-only">Nouveau Cours</span>
            <span className="mobile-only">Cours</span>
          </button>
        </div>
      </header>

      {/* Google Drive Import Modal */}
      <GoogleDriveImportModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        currentFolderId={currentFolderId}
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
          {items.map(item => (
            <div 
              key={item.id} 
              className="folder-card hover-lift glass-panel"
              onClick={() => handleItemClick(item)}
              style={item.type === 'course' ? { border: '1px solid var(--accent-primary)' } : {}}
            >
              <div className="folder-header">
                <div 
                  className="folder-icon-wrapper shadow-sm"
                  style={{ backgroundColor: item.type === 'folder' ? `${item.color}20` : 'var(--bg-elevated)', color: item.type === 'folder' ? item.color : 'var(--accent-primary)' }}
                >
                  {item.type === 'folder' ? <Folder size={28} /> : <FileText size={28} />}
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
                <h3>{item.name}</h3>
              </div>
            </div>
          ))}
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
