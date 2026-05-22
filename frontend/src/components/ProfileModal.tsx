import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { useTranslation } from '../i18n';

interface Profile {
  id: string;
  name: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  activeProfile: string;
  onClose: () => void;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (profileName: string) => Promise<boolean>;
  onRenameProfile: (oldName: string, newName: string) => Promise<boolean>;
  onDeleteProfile: (profileId: string) => Promise<boolean>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  activeProfile,
  onClose,
  onSelectProfile,
  onCreateProfile,
  onRenameProfile,
  onDeleteProfile,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();

  // Profile lists from API
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  
  // Renaming states
  const [renamingProfileId, setRenamingProfileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Fetch profiles from backend
  const fetchProfiles = async () => {
    try {
      const res = await fetch('http://localhost:3030/api/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
      setNewProfileName('');
      setRenamingProfileId(null);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  // Handle click-outside dialog close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width
        );
        if (!isDialogContent) {
          onClose();
        }
      }
    };

    dialog.addEventListener('click', handleOutsideClick);
    return () => {
      dialog.removeEventListener('click', handleOutsideClick);
    };
  }, [onClose]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const success = await onCreateProfile(newProfileName.trim());
    if (success) {
      setNewProfileName('');
      fetchProfiles();
    }
  };

  const handleStartRename = (profile: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingProfileId(profile.id);
    setRenameValue(profile.name);
  };

  const handleSaveRename = async (profile: Profile, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!renameValue.trim() || renameValue.trim() === profile.name) {
      setRenamingProfileId(null);
      return;
    }

    const success = await onRenameProfile(profile.name, renameValue.trim());
    if (success) {
      setRenamingProfileId(null);
      fetchProfiles();
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingProfileId(null);
  };

  const handleDelete = async (profile: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('deleteConfirmProfile', { name: profile.name }))) {
      const success = await onDeleteProfile(profile.id);
      if (success) {
        fetchProfiles();
      }
    }
  };

  return (
    <dialog ref={dialogRef} className="glass-panel" style={{ padding: 0 }} onClose={onClose}>
      <div className="modal-content glass-panel" style={{ width: '600px' }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icons.CircleUser size={20} style={{ color: 'var(--accent-cyan)' }} />
            <span>{t('profileSwitchTitle')}</span>
          </h3>
          <button type="button" className="btn-icon-action" onClick={onClose}>
            <Icons.X size={16} />
          </button>
        </div>

        <div className="modal-body custom-scrollbar" style={{ maxHeight: '350px' }}>
          {/* Profiles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfile;
              const isRenaming = profile.id === renamingProfileId;

              return (
                <div
                  key={profile.id}
                  className={`glass-panel profile-card ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    cursor: isRenaming ? 'default' : 'pointer',
                    border: isActive ? '1.5px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                    background: isActive ? 'rgba(0, 242, 254, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '76px'
                  }}
                  onClick={() => {
                    if (!isRenaming) {
                      onSelectProfile(profile.id);
                      onClose();
                    }
                  }}
                >
                  {isRenaming ? (
                    <form 
                      onSubmit={(e) => handleSaveRename(profile, e)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}
                    >
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="settings-ide-input-name"
                        style={{ flex: 1, margin: 0, padding: '4px 8px', fontSize: '13px' }}
                        autoFocus
                        required
                      />
                      <button
                        type="submit"
                        className="btn-icon-action"
                        style={{ padding: '6px', width: '28px', height: '28px', color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                        title={t('save')}
                      >
                        <Icons.Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={handleCancelRename}
                        style={{ padding: '6px', width: '28px', height: '28px', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                        title={t('cancel')}
                      >
                        <Icons.X size={14} />
                      </button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <Icons.FolderHeart size={18} style={{ color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <span 
                            style={{ 
                              fontWeight: 600, 
                              fontSize: '14px', 
                              color: isActive ? 'var(--accent-cyan)' : 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'block'
                            }}
                          >
                            {profile.name}
                          </span>
                          {isActive && (
                            <span style={{ display: 'block', fontSize: '9px', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', marginTop: '1px', letterSpacing: '0.05em' }}>
                              {t('activeProfileLabel')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons (Rename & Delete) */}
                      <div className="profile-card-actions" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn-icon-action"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            width: '26px',
                            height: '26px'
                          }}
                          onClick={(e) => handleStartRename(profile, e)}
                          title={t('renameProfileTitle')}
                        >
                          <Icons.Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action"
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: 'var(--text-muted)',
                            width: '26px',
                            height: '26px'
                          }}
                          onClick={(e) => handleDelete(profile, e)}
                          title={t('delete')}
                        >
                          <Icons.Trash size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Create Profile Section */}
        <form onSubmit={handleCreate} className="modal-footer" style={{ flexDirection: 'column', gap: '10px', alignItems: 'stretch', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('createProfileTitle')}</h4>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder={t('profileNamePlaceholder')}
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="settings-ide-input-name"
              style={{ flex: 1, margin: 0 }}
              required
            />
            <button type="submit" className="btn-primary" style={{ padding: '10px 16px' }}>
              <Icons.Plus size={16} />
              <span>{t('createProfileBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
