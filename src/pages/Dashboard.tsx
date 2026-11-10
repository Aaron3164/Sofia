import React, { useState, useEffect } from 'react';
import { User, LogOut, Mail, Palette, UserCircle, Check, Crown, RefreshCw, X, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { user, profile, signOut, updateProfile, updatePreferences, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { alert } = useDialog();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');
  const [name, setName] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const prefs = profile?.preferences || {};

  const handleUpdatePreference = async (newPrefs: any) => {
    try {
      await updatePreferences(newPrefs);
      if (newPrefs.theme) {
        setTheme(newPrefs.theme);
      }
    } catch (error) {
      await alert('Erreur lors de la mise à jour des préférences.');
    }
  };

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
  }, [profile]);

  // Handle return from Payhip checkout (with polling check for webhook arrival)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasPaymentReturn = urlParams.get('payment') === 'success' || urlParams.get('checkout') === 'success';

    if (hasPaymentReturn && user) {
      window.history.replaceState({}, document.title, window.location.pathname);

      setIsRefreshing(true);
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        const updated = await refreshProfile();
        if (updated?.plan === 'premium' || attempts >= 8) {
          clearInterval(pollInterval);
          setIsRefreshing(false);
          if (updated?.plan === 'premium') {
            await alert('🎉 Félicitations ! Votre abonnement Premium est désormais actif !');
          }
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateProfile({ full_name: name });
      await alert('Profil mis à jour !');
    } catch (error: any) {
      console.error('Update error:', error);
      await alert('Erreur lors de la mise à jour : ' + (error.message || 'Problème de connexion au serveur-vérifiez la table profiles.'));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Session introuvable');

      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      await alert('Votre compte et l\'ensemble de vos données ont été définitivement supprimés.');
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      await signOut();
      window.location.href = '/';
    } catch (err: any) {
      console.error('[Dashboard] Delete account error:', err);
      await alert(err.message || 'Impossible de supprimer votre compte.');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="page-header" style={{ flexShrink: 0, paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
        <h1>Tableau de bord</h1>
        <p className="subtitle">Gérez votre compte et votre expérience Sof.IA</p>
      </header>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('profile')}
          className="btn"
          style={{
            backgroundColor: activeTab === 'profile' ? 'var(--bg-elevated)' : 'transparent',
            borderColor: activeTab === 'profile' ? 'rgba(255, 255, 255, 0.18)' : 'var(--border-color)',
            color: activeTab === 'profile' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'profile' ? 'inset 0 1px 0 rgba(255, 255, 255, 0.08)' : 'none'
          }}
        >
          <User size={15} style={{ color: activeTab === 'profile' ? 'var(--accent-primary)' : 'inherit' }} />
          <span>Mon Profil</span>
        </button>
        <button 
          onClick={() => setActiveTab('billing')}
          className="btn"
          style={{
            backgroundColor: activeTab === 'billing' ? 'var(--bg-elevated)' : 'transparent',
            borderColor: activeTab === 'billing' ? 'rgba(255, 255, 255, 0.18)' : 'var(--border-color)',
            color: activeTab === 'billing' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'billing' ? 'inset 0 1px 0 rgba(255, 255, 255, 0.08)' : 'none'
          }}
        >
          <Crown size={15} style={{ color: activeTab === 'billing' ? 'var(--accent-primary)' : 'inherit' }} />
          <span>Abonnement & Forfaits</span>
        </button>
      </div>

      <div style={{ paddingBottom: '3rem' }}>
        {activeTab === 'profile' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            
            {/* Profile Card */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <UserCircle size={20} className="text-accent" />
                Profil Personnel
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                      <User size={28} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>E-mail</p>
                  <p style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <Mail size={14} /> {user.email}
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Nom complet</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    className="input"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={isUpdating} style={{ width: 'fit-content' }}>
                  {isUpdating ? 'Mise à jour...' : 'Sauvegarder les modifications'}
                </button>
              </form>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <button onClick={signOut} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
                  <LogOut size={16} /> Déconnexion
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Trash2 size={15} /> Supprimer mon compte
                </button>
              </div>

              {/* Modal de confirmation de suppression de compte */}
              {showDeleteConfirm && (
                <div style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '1rem',
                }}>
                  <div style={{
                    backgroundColor: '#18181b',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '1rem',
                    maxWidth: '480px',
                    width: '100%',
                    padding: '1.75rem',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#ef4444' }}>
                      <AlertTriangle size={26} />
                      <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                        Suppression définitive du compte
                      </h4>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: '#a1a1aa', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                      Cette action est <strong style={{ color: '#ef4444' }}>irréversible</strong> conformément à la réglementation RGPD. Toutes vos données personnelles, fiches de révision, flashcards, annales et statistiques d'apprentissage seront immédiatement et définitivement effacées de nos serveurs.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeletingAccount}
                        style={{
                          padding: '0.65rem 1.1rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #3f3f46',
                          backgroundColor: '#27272a',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                        }}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        style={{
                          padding: '0.65rem 1.1rem',
                          borderRadius: '0.5rem',
                          border: 'none',
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          cursor: isDeletingAccount ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <Trash2 size={15} />
                        {isDeletingAccount ? 'Suppression...' : 'Confirmer la suppression'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preferences Card */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Palette size={24} className="text-accent" />
                Préférences
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <p style={{ fontWeight: '500', marginBottom: '0.75rem', fontSize: '0.875rem' }}>Thème de l'interface</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'dark', label: 'Sombre' },
                      { id: 'glass', label: 'Aurore' }
                    ].map((t) => {
                      const isSelected = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleUpdatePreference({ theme: t.id })}
                          className="btn"
                          style={{
                            flex: '1 1 90px',
                            backgroundColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                            borderColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                            color: isSelected ? '#09090b' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 600 : 500,
                            boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Paramètres Sofia IA
                  </h4>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Personnalité de Sofia</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[
                        { id: 'benevolent', label: 'Bienveillante' },
                        { id: 'concise', label: 'Concise' },
                        { id: 'academic', label: 'Académique' }
                      ].map(p => {
                        const isSelected = prefs.ai_personality === p.id;
                        return (
                          <button 
                            key={p.id}
                            onClick={() => handleUpdatePreference({ ai_personality: p.id })}
                            className="btn"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.45rem 0.8rem',
                              flex: 1,
                              backgroundColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                              borderColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                              color: isSelected ? '#09090b' : 'var(--text-secondary)',
                              fontWeight: isSelected ? 600 : 500,
                              boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.3)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Mode d'Étude</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[
                        { id: 'understanding', label: 'Compréhension' },
                        { id: 'memorization', label: 'Mémorisation' },
                        { id: 'critical', label: 'Esprit Critique' }
                      ].map(m => {
                        const isSelected = prefs.ai_study_mode === m.id;
                        return (
                          <button 
                            key={m.id}
                            onClick={() => handleUpdatePreference({ ai_study_mode: m.id })}
                            className="btn"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.45rem 0.8rem',
                              flex: 1,
                              backgroundColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                              borderColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                              color: isSelected ? '#09090b' : 'var(--text-secondary)',
                              fontWeight: isSelected ? 600 : 500,
                              boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.3)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={prefs.ai_auto_flashcards || false}
                      onChange={(e) => handleUpdatePreference({ ai_auto_flashcards: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                    />
                    Génération auto. de flashcards
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fade-in">
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Choisissez votre forfait</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>Libérez tout le potentiel de Sof.IA avec le plan Premium</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '850px', margin: '0 auto' }}>
              
              {/* Free Plan */}
              <div className="glass-panel hover-lift" style={{ 
                padding: '2.5rem', 
                borderRadius: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.5rem',
                border: profile?.plan === 'free' ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                position: 'relative'
              }}>
                {profile?.plan === 'free' && (
                  <span style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: 'var(--accent-primary)', color: 'white', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 600 }}>
                    ACTUEL
                  </span>
                )}
                <div>
                  <h3 style={{ margin: 0 }}>Gratuit</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Pour débuter sereinement</p>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>0€ <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/mois</span></div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Dossiers illimités</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Flashcards & QCM inclus</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Recherche globale dans tous les cours</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Répétition espacée (Méthode Leitner)</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Statistiques de progression</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Synchronisation cloud</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}><X size={18} style={{ color: '#ef4444', flexShrink: 0 }} /> Documents limités à 15 pages</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}><X size={18} style={{ color: '#ef4444', flexShrink: 0 }} /> Jusqu'à 10 cours au total</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}><X size={18} style={{ color: '#ef4444', flexShrink: 0 }} /> 5 générations IA par jour</div>
                </div>

                <button 
                  className={`btn ${profile?.plan === 'free' ? 'btn-outline' : 'btn-primary'}`} 
                  style={{ width: '100%', padding: '1rem' }}
                  disabled={profile?.plan === 'free'}
                >
                  {profile?.plan === 'free' ? 'Plan Actuel' : 'Plan Gratuit'}
                </button>
              </div>

              {/* Premium Plan */}
              <div className="glass-panel hover-lift" style={{ 
                padding: '2.5rem', 
                borderRadius: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.5rem',
                border: profile?.plan === 'premium' ? '2px solid var(--accent-primary)' : '1px solid var(--accent-primary)40',
                backgroundColor: 'var(--bg-elevated)',
                position: 'relative',
                boxShadow: '0 12px 40px var(--accent-primary)20'
              }}>
                {profile?.plan === 'premium' && (
                  <span style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: 'var(--accent-primary)', color: 'white', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 600 }}>
                    ACTUEL
                  </span>
                )}
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--accent-primary)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 1rem', borderRadius: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Crown size={12} /> RECOMMANDÉ
                </div>
                <div>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Premium</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>L'expérience ultime</p>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>9,99€ <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/mois</span></div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Mêmes avantages que le plan gratuit</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Documents jusqu'à 50 pages par cours</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Cours & Dossiers illimités</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Sofia IA Prioritaire & Illimitée</div>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    padding: '1rem',
                    backgroundColor: 'var(--accent-primary)',
                    boxShadow: '0 8px 24px var(--accent-primary)40'
                  }}
                  onClick={() => {
                    if (profile?.plan === 'premium') {
                      alert('Votre abonnement Premium est actif ! Un mois d\'accès a été ajouté à votre compte.');
                    } else {
                      const checkoutUrl = `https://payhip.com/b/ZQPy4?email=${encodeURIComponent(user.email || '')}`;
                      window.location.href = checkoutUrl;
                    }
                  }}
                >
                  {profile?.plan === 'premium' ? '🚀 Mon statut Premium' : 'Passer au Premium'}
                </button>

                {profile?.plan !== 'premium' && (
                  <button
                    onClick={async () => {
                      setIsRefreshing(true);
                      const updated = await refreshProfile();
                      setIsRefreshing(false);
                      if (updated?.plan === 'premium') {
                        await alert('🎉 Félicitations ! Votre abonnement Premium est désormais actif !');
                      } else {
                        await alert('Vérification effectuée : Aucun paiement récent validé sur ce compte. Si vous venez d\'effectuer le paiement, attendez quelques secondes puis réessayez.');
                      }
                    }}
                    disabled={isRefreshing}
                    className="btn btn-outline"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <RefreshCw size={15} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                    {isRefreshing ? 'Vérification en cours...' : 'Déjà payé ? Actualiser mon statut'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
