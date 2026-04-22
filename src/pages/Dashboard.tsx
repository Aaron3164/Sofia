import React, { useState, useEffect } from 'react';
import { User, LogOut, Mail, Palette, UserCircle, Check, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const { user, profile, signOut, updateProfile, updatePreferences } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');
  const [name, setName] = useState('');

  const prefs = profile?.preferences || {};

  const handleUpdatePreference = async (newPrefs: any) => {
    try {
      await updatePreferences(newPrefs);
      if (newPrefs.theme) {
        setTheme(newPrefs.theme);
      }
    } catch (error) {
      alert('Erreur lors de la mise à jour des préférences.');
    }
  };

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateProfile({ full_name: name });
      alert('Profil mis à jour !');
    } catch (error: any) {
      console.error('Update error:', error);
      alert('Erreur lors de la mise à jour : ' + (error.message || 'Problème de connexion au serveur-vérifiez la table profiles.'));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <header className="page-header" style={{ flexShrink: 0, marginBottom: '1rem' }}>
        <h1>Tableau de bord</h1>
        <p className="subtitle">Gérez votre compte et votre expérience Sof.IA</p>
      </header>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', color: activeTab === 'profile' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 600, borderBottom: activeTab === 'profile' ? '2px solid var(--accent-primary)' : 'none' }}
        >
          👤 Mon Profil
        </button>
        <button 
          onClick={() => setActiveTab('billing')}
          className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', color: activeTab === 'billing' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 600, borderBottom: activeTab === 'billing' ? '2px solid var(--accent-primary)' : 'none' }}
        >
          ✨ Abonnement & Forfaits
        </button>
      </div>

      <div style={{ paddingBottom: '4rem' }}>
        {activeTab === 'profile' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            
            {/* Profile Card */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <UserCircle size={24} className="text-accent" />
                Profil Personnel
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={40} color="white" />
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

              <button onClick={signOut} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)', alignSelf: 'flex-start' }}>
                <LogOut size={16} /> Déconnexion
              </button>
            </div>

            {/* Preferences Card */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Palette size={24} className="text-accent" />
                Préférences
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <p style={{ fontWeight: '500', marginBottom: '1rem' }}>Thème de l'interface</p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {(['light', 'dark', 'glass'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => handleUpdatePreference({ theme: t })}
                        className={`btn ${theme === t ? 'btn-primary' : 'btn-outline'}`}
                        style={{ flex: '1 1 100px', textTransform: 'capitalize' }}
                      >
                        {t === 'glass' ? '✨ Verre' : t === 'light' ? '☀️ Clair' : '🌙 Sombre'}
                      </button>
                    ))}
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
                      ].map(p => (
                        <button 
                          key={p.id}
                          onClick={() => handleUpdatePreference({ ai_personality: p.id })}
                          className={`btn ${prefs.ai_personality === p.id ? 'btn-primary' : 'btn-outline'}`}
                          style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', flex: 1 }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Mode d'Étude</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[
                        { id: 'understanding', label: 'Compréhension' },
                        { id: 'memorization', label: 'Mémorisation' },
                        { id: 'critical', label: 'Esprit Critique' }
                      ].map(m => (
                        <button 
                          key={m.id}
                          onClick={() => handleUpdatePreference({ ai_study_mode: m.id })}
                          className={`btn ${prefs.ai_study_mode === m.id ? 'btn-primary' : 'btn-outline'}`}
                          style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', flex: 1 }}
                        >
                          {m.label}
                        </button>
                      ))}
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
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> 3 dossiers maximum</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Flashcards & QCM de base</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', opacity: 0.5 }}><Check size={18} /> Sofia IA limitée</div>
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
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>L'expérience Aura ultime</p>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>9,99€ <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/mois</span></div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Dossiers illimités</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Sofia IA Prioritaire & Illimitée</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Mode Focus & Statistiques avancées</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}><Check size={18} className="text-success" /> Suppression des publicités</div>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    padding: '1rem',
                    backgroundColor: 'var(--accent-primary)',
                    boxShadow: '0 8px 24px var(--accent-primary)40'
                  }}
                  onClick={() => alert('Bientôt disponible !')}
                >
                  {profile?.plan === 'premium' ? '🚀 Gérer mon abonnement' : 'Passer au Premium'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
