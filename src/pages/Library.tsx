import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFileSystem, type FileNode } from '../hooks/useFileSystem';
import { Folder, FileText, Plus, Trash2, ChevronRight, Edit3, Move, ChevronLeft } from 'lucide-react';
import './Library.css';

export default function Library() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { deleteNode, getChildren, getNode, addNode, renameNode, moveNode, reorderNodes } = useFileSystem();
  
  const currentFolderId = folderId || null;
  const [isMovingId, setIsMovingId] = useState<string | null>(null);
  
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
    const name = prompt('Nom du nouveau dossier :');
    if (name) await addNode(name, 'folder', currentFolderId);
  };

  const handleCreateCourse = async () => {
    const name = prompt('Nom du nouveau cours :');
    if (name) {
      try {
        const newNode = await addNode(name, 'course', currentFolderId);
        navigate(`/subject/${newNode.id}`);
      } catch (e) {
        alert('Erreur lors de la création du cours sur le serveur. Réssayez.');
      }
    }
  };

  const handleRename = (e: React.MouseEvent, item: FileNode) => {
    e.stopPropagation();
    const newName = prompt('Nouveau nom :', item.name);
    if (newName && newName !== item.name) {
      renameNode(item.id, newName);
    }
  };

  const handleMove = (e: React.MouseEvent, item: FileNode) => {
    e.stopPropagation();
    setIsMovingId(item.id);
  };

  const confirmMove = (targetId: string | null) => {
    if (isMovingId) {
      moveNode(isMovingId, targetId);
      setIsMovingId(null);
    }
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

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Voulez-vous vraiment supprimer cet élément et tout son contenu ?')) {
      deleteNode(id);
    }
  };

  const handleItemClick = (item: FileNode) => {
    if (isMovingId) return; // Prevent navigation while moving
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
          <button className="btn btn-outline shadow-sm" onClick={handleCreateFolder}>
            <Plus size={18} /> <span className="desktop-only">Dossier</span>
          </button>
          <button className="btn btn-primary shadow-md" onClick={handleCreateCourse}>
            <Plus size={18} /> <span className="desktop-only">Nouveau Cours</span>
            <span className="mobile-only">Cours</span>
          </button>
        </div>
      </header>

      {/* Moving Overlay Mode */}
      {isMovingId && (
        <div className="glass-panel moving-overlay">
          <div className="moving-info">
            <Move size={20} />
            <span>Déplaçant <strong>{getNode(isMovingId)?.name}</strong></span>
          </div>
          <div className="moving-actions">
            <button className="btn btn-place" onClick={() => confirmMove(currentFolderId)}>
              Placer ici
            </button>
            <button className="btn btn-cancel" onClick={() => setIsMovingId(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

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
              className={`folder-card hover-lift glass-panel ${isMovingId === item.id ? 'is-moving' : ''}`}
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
                
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                   <button className="icon-button" onClick={(e) => handleReorder(e, item, 'prev')} title="Déplacer vers la gauche" disabled={items.indexOf(item) === 0} style={{ opacity: items.indexOf(item) === 0 ? 0.3 : 1 }}>
                    <ChevronLeft size={15} />
                  </button>
                  <button className="icon-button" onClick={(e) => handleReorder(e, item, 'next')} title="Déplacer vers la droite" disabled={items.indexOf(item) === items.length - 1} style={{ opacity: items.indexOf(item) === items.length - 1 ? 0.3 : 1 }}>
                    <ChevronRight size={15} />
                  </button>
                   <button className="icon-button" onClick={(e) => handleRename(e, item)} title="Renommer">
                    <Edit3 size={15} />
                  </button>
                  <button className="icon-button" onClick={(e) => handleMove(e, item)} title="Déplacer">
                    <Move size={15} />
                  </button>
                  <button className="icon-button delete-btn" onClick={(e) => handleDelete(e, item.id)} title="Supprimer">
                    <Trash2 size={15} />
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
    </div>
  );
}
