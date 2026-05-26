import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { useTranslation } from '../i18n';
import type { Project, CustomButton, IDE } from './ProjectCard';
import type { Group } from './GroupModal';

interface ProjectModalProps {
  isOpen: boolean;
  project: Project | null; // Null if creating a new project
  groups: Group[];
  defaultGroupId?: string;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id'> & { id?: string }) => void;
  onDelete?: (projectId: string) => void;
  ides: IDE[];
}

const ALL_LUCIDE_ICONS = Object.keys(Icons).filter(key => /^[A-Z]/.test(key));

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  project,
  groups,
  defaultGroupId,
  onClose,
  onSave,
  onDelete,
  ides,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();

  // States
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [path, setPath] = useState('');
  const [icon, setIcon] = useState('Terminal');
  const [image, setImage] = useState('');
  const [bgImage, setBgImage] = useState('');
  const [description, setDescription] = useState('');
  const [startCommand, setStartCommand] = useState('');
  const [startMode, setStartMode] = useState<'direct' | 'terminal' | 'terminal-sudo' | 'browser' | 'disabled'>('terminal');
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [primaryIdeId, setPrimaryIdeId] = useState('');
  const [secondaryIdeId, setSecondaryIdeId] = useState('');

  // Switcher and Suggestion/Color Picker states
  const [iconSource, setIconSource] = useState<'preset' | 'custom'>('preset');
  const [iconColor, setIconColor] = useState('default');
  const [projIconSearch, setProjIconSearch] = useState('');
  const [showProjSuggestions, setShowProjSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (project) {
        setName(project.name);
        setGroupId(project.groupId);
        setPath(project.path);
        setIcon(project.icon || 'Terminal');
        setImage(project.image || '');
        setBgImage(project.bgImage || '');
        setDescription(project.description || '');
        setStartCommand(project.startConfig.command);
        setStartMode(project.startConfig.mode);
        setCustomButtons(project.customButtons || []);
        setPrimaryIdeId(project.primaryIdeId !== undefined ? project.primaryIdeId : (ides[0]?.id || ''));
        setSecondaryIdeId(project.secondaryIdeId || '');
        
        // Switcher state logic
        setIconSource(project.image ? 'custom' : 'preset');
        setIconColor(project.iconColor || 'default');
      } else {
        setName('');
        setGroupId(defaultGroupId || (groups[0]?.id || ''));
        setPath('');
        setIcon('Terminal');
        setImage('');
        setBgImage('');
        setDescription('');
        setStartCommand('');
        setStartMode('terminal');
        setCustomButtons([]);
        setPrimaryIdeId(ides[0]?.id || '');
        setSecondaryIdeId('');
        
        setIconSource('preset');
        setIconColor('default');
      }
      setProjIconSearch('');
      setShowProjSuggestions(false);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, project, groups, defaultGroupId, ides]);

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

  const handleAddCustomButton = () => {
    const newBtn: CustomButton = {
      id: `btn-${Date.now()}`,
      label: 'New Button',
      command: '',
      mode: 'terminal',
    };
    setCustomButtons([...customButtons, newBtn]);
  };

  const handleUpdateCustomButton = (id: string, fields: Partial<CustomButton>) => {
    setCustomButtons(
      customButtons.map((btn) => (btn.id === id ? { ...btn, ...fields } : btn))
    );
  };

  const handleRemoveCustomButton = (id: string) => {
    setCustomButtons(customButtons.filter((btn) => btn.id !== id));
  };

  const getFileUrl = (filePath: string) => {
    return `http://localhost:3030/api/file?path=${encodeURIComponent(filePath)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !groupId) return;

    onSave({
      id: project?.id,
      name: name.trim(),
      groupId,
      path: path.trim(),
      icon: iconSource === 'preset' ? icon : 'Terminal',
      iconColor: iconSource === 'preset' && iconColor !== 'default' ? iconColor : undefined,
      image: iconSource === 'custom' && image.trim() ? image.trim() : undefined,
      bgImage: bgImage.trim() ? bgImage.trim() : undefined,
      description: description.trim() || undefined,
      startConfig: {
        command: startCommand.trim(),
        mode: startMode,
      },
      customButtons: customButtons.filter((btn) => btn.label.trim() && (btn.mode === 'disabled' || btn.command.trim())),
      primaryIdeId: primaryIdeId,
      secondaryIdeId: secondaryIdeId,
    });
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="glass-panel" style={{ padding: 0 }} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-content glass-panel">
        <div className="modal-header">
          <h3 className="modal-title">
            {project ? t('editProject') : t('createProject')}
          </h3>
          <button type="button" className="btn-icon-action" onClick={onClose}>
            <Icons.X size={16} />
          </button>
        </div>

        <div className="modal-body custom-scrollbar">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="proj-name">{t('projectNameLabel')} <span className="required-mark">*</span></label>
              <input
                id="proj-name"
                type="text"
                placeholder={t('projectNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="proj-group">{t('groupLabel')} <span className="required-mark">*</span></label>
              <select
                id="proj-group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="settings-ide-select"
                required
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="proj-path">{t('directoryPathLabel')}</label>
            <input
              id="proj-path"
              type="text"
              placeholder={t('directoryPathPlaceholder')}
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
          </div>

          {/* Switcher Toggle standard vs custom path */}
          <div className="form-group">
            <label>{t('displayTypeLabel')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn-secondary ${iconSource === 'preset' ? 'active-neon' : ''}`}
                style={{ flex: 1, height: '40px', justifyContent: 'center' }}
                onClick={() => setIconSource('preset')}
              >
                <Icons.Compass size={14} />
                {t('standardIcon')}
              </button>
              <button
                type="button"
                className={`btn-secondary ${iconSource === 'custom' ? 'active-neon' : ''}`}
                style={{ flex: 1, height: '40px', justifyContent: 'center' }}
                onClick={() => setIconSource('custom')}
              >
                <Icons.Image size={14} />
                {t('customImagePaths')}
              </button>
            </div>
          </div>

          {/* Standard Icon Section */}
          {iconSource === 'preset' && (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '14px',
                background: 'rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                animation: 'fadeIn 0.2s ease'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                {t('iconSearchLabel')}
              </div>

              {/* Icon Autocomplete Search */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label>{t('iconSearchLabel')}</label>
                <input
                  type="text"
                  placeholder={t('iconSearchPlaceholder')}
                  value={projIconSearch}
                  onChange={(e) => {
                    setProjIconSearch(e.target.value);
                    setShowProjSuggestions(true);
                  }}
                  onFocus={() => setShowProjSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowProjSuggestions(false), 200)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                />

                {showProjSuggestions && projIconSearch.trim() && (
                  <div 
                    className="glass-panel custom-scrollbar" 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '150px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      background: '#0c0e17ee',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      marginTop: '4px',
                      padding: '4px'
                    }}
                  >
                    {(() => {
                      const matches = ALL_LUCIDE_ICONS.filter(name => 
                        name.toLowerCase().includes(projIconSearch.toLowerCase())
                      ).slice(0, 15);
                      
                      if (matches.length === 0) {
                        return (
                          <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                            {t('noResultsTitle')}
                          </div>
                        );
                      }

                      return matches.map((name) => {
                        const MatchIcon = (Icons as any)[name] || Icons.HelpCircle;
                        const rColor = iconColor === 'default' ? 'var(--accent-cyan)' : iconColor;
                        return (
                          <div
                            key={name}
                            className="suggestion-item"
                            onClick={() => {
                              setIcon(name);
                              setProjIconSearch('');
                              setShowProjSuggestions(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <MatchIcon size={14} style={{ color: rColor }} />
                            <span>{name}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* 12 Presets Grid */}
              <div className="form-group">
                <label>{t('presets')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                  {['Terminal', 'Globe', 'Database', 'Cpu', 'Layers', 'Server', 'HardDrive', 'Monitor', 'Activity', 'Play', 'Settings', 'Sparkles'].map((iconName) => {
                    const IconPreview = (Icons as any)[iconName] || Icons.HelpCircle;
                    const isIconSelected = icon === iconName;
                    const rColor = iconColor === 'default' ? 'var(--accent-cyan)' : iconColor;

                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => {
                          setIcon(iconName);
                          setShowProjSuggestions(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px',
                          background: isIconSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.01)',
                          border: isIconSelected ? `1px solid ${rColor}` : '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '6px',
                          color: isIconSelected ? rColor : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        <IconPreview size={14} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Color Picker */}
              <div className="form-group">
                <label>{t('iconColorLabel')}</label>
                <div className="color-picker-grid" style={{ gap: '8px', flexWrap: 'wrap', alignItems: 'center', display: 'flex' }}>
                  <button
                    type="button"
                    onClick={() => setIconColor('default')}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '5px 10px',
                      borderRadius: '6px',
                      background: iconColor === 'default' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                      color: 'var(--text-primary)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {t('standardColor')}
                  </button>
                  {['cyan', 'violet', 'emerald', 'amber', 'rose'].map((c) => (
                    <div
                      key={c}
                      className={`color-option ${c} ${iconColor === c ? 'selected' : ''}`}
                      onClick={() => setIconColor(c)}
                      style={{ width: '22px', height: '22px' }}
                    />
                  ))}

                  {/* Native Custom Color Picker */}
                  <div 
                    className={`color-option custom-color-option ${!['default', 'cyan', 'violet', 'emerald', 'amber', 'rose'].includes(iconColor) ? 'selected' : ''}`}
                    style={{
                      background: !['default', 'cyan', 'violet', 'emerald', 'amber', 'rose'].includes(iconColor) 
                        ? iconColor 
                        : 'linear-gradient(45deg, #ff007f, #8a2be2, #00f2fe, #10b981, #f59e0b)',
                      position: 'relative',
                      overflow: 'hidden',
                      border: !['default', 'cyan', 'violet', 'emerald', 'amber', 'rose'].includes(iconColor) ? '1.5px solid #fff' : '1.5px solid transparent',
                      boxShadow: !['default', 'cyan', 'violet', 'emerald', 'amber', 'rose'].includes(iconColor) ? `0 0 8px ${iconColor}` : 'none',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    title={t('customColor')}
                  >
                    <input 
                      type="color" 
                      value={['default', 'cyan', 'violet', 'emerald', 'amber', 'rose'].includes(iconColor) ? '#00f2fe' : iconColor}
                      onChange={(e) => setIconColor(e.target.value)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Icon Path Section */}
          {iconSource === 'custom' && (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '14px',
                background: 'rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                animation: 'fadeIn 0.2s ease'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                {t('customPathsTitle')}
              </div>

              <div className="form-group">
                <label htmlFor="proj-image">{t('imageIconPath')}</label>
                <input
                  id="proj-image"
                  type="text"
                  placeholder="z.B. /usr/share/pixmaps/archlinux-logo.png"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                />
                {/* Custom Icon Preview */}
                {image.trim() && (
                  <div style={{ 
                    marginTop: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px'
                  }}>
                    <img 
                      src={getFileUrl(image.trim())} 
                      alt="Icon Preview" 
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        objectFit: 'cover', 
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)'
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Icon Preview</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Background Image – always visible, independent of icon mode */}
          <div className="form-group">
            <label htmlFor="proj-bg-image">{t('bgImagePath')}</label>
            <input
              id="proj-bg-image"
              type="text"
              placeholder="z.B. /home/user/Bilder/wallpaper.jpg"
              value={bgImage}
              onChange={(e) => setBgImage(e.target.value)}
            />
            {/* Background Image Preview */}
            {bgImage.trim() && (
              <div style={{ 
                marginTop: '8px', 
                position: 'relative',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                height: '80px'
              }}>
                <img 
                  src={getFileUrl(bgImage.trim())} 
                  alt="Background Preview" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    opacity: 0.4,
                    filter: 'blur(1px)'
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '10px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  background: 'rgba(0,0,0,0.6)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  Background Preview
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="proj-desc">{t('descriptionLabel')}</label>
            <textarea
              id="proj-desc"
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* IDE-Konfiguration */}
          <div className="custom-buttons-manager">
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {t('ideConfigTitle')}
            </h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="proj-primary-ide">{t('primaryIde')}</label>
                <select
                  id="proj-primary-ide"
                  value={primaryIdeId}
                  onChange={(e) => setPrimaryIdeId(e.target.value)}
                  className="settings-ide-select"
                >
                  <option value="">{t('noPrimaryIde')}</option>
                  {ides.map((ide) => (
                    <option key={ide.id} value={ide.id}>
                      {ide.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="proj-secondary-ide">{t('secondaryIde')}</label>
                <select
                  id="proj-secondary-ide"
                  value={secondaryIdeId}
                  onChange={(e) => setSecondaryIdeId(e.target.value)}
                  className="settings-ide-select"
                >
                  <option value="">{t('noSecondaryIde')}</option>
                  {ides.map((ide) => (
                    <option key={ide.id} value={ide.id}>
                      {ide.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Combined Start Configuration section */}
          <div className="custom-buttons-manager">
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {t('startConfigTitle')}
            </h4>

            {/* Main Button – highlighted section */}
            <div style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              marginBottom: '10px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Main Button
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>{startMode === 'browser' ? t('linkLabel') : t('commandLabel')} {startMode !== 'disabled' && <span className="required-mark">*</span>}</label>
                  <input
                    type="text"
                    placeholder={
                      startMode === 'disabled'
                        ? t('noCommandRequired')
                        : startMode === 'browser'
                        ? t('linkPlaceholder')
                        : t('commandPlaceholder')
                    }
                    value={startCommand}
                    onChange={(e) => setStartCommand(e.target.value)}
                    required={startMode !== 'disabled'}
                    disabled={startMode === 'disabled'}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{t('startTypeLabel')} <span className="required-mark">*</span></label>
                  <select
                    value={startMode}
                    onChange={(e) => {
                      const newMode = e.target.value as any;
                      setStartMode(newMode);
                      if (newMode === 'disabled') {
                        setStartCommand('');
                      }
                    }}
                    className="settings-ide-select"
                  >
                    <option value="terminal">{t('mode_terminal')}</option>
                    <option value="terminal-sudo">{t('mode_terminal_sudo')}</option>
                    <option value="direct">{t('mode_direct')}</option>
                    <option value="browser">{t('mode_browser')}</option>
                    <option value="disabled">{t('mode_disabled')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Buttons */}
            {customButtons.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
                {t('noExtraButtons')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                {customButtons.map((btn) => (
                  <div key={btn.id} className="custom-button-item">
                    <input
                      type="text"
                      placeholder={t('buttonLabelPlaceholder')}
                      value={btn.label}
                      onChange={(e) => handleUpdateCustomButton(btn.id, { label: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder={
                        btn.mode === 'disabled'
                          ? t('noButtonCommandRequired')
                          : btn.mode === 'browser'
                          ? t('buttonLinkPlaceholder')
                          : t('buttonCommandPlaceholder')
                      }
                      value={btn.command}
                      onChange={(e) => handleUpdateCustomButton(btn.id, { command: e.target.value })}
                      required={btn.mode !== 'disabled'}
                      disabled={btn.mode === 'disabled'}
                    />
                    <select
                      value={btn.mode}
                      onChange={(e) => {
                        const newMode = e.target.value as any;
                        const updates: Partial<CustomButton> = { mode: newMode };
                        if (newMode === 'disabled') {
                          updates.command = '';
                        }
                        handleUpdateCustomButton(btn.id, updates);
                      }}
                      className="settings-ide-select"
                    >
                      <option value="terminal">{t('mode_terminal')}</option>
                      <option value="terminal-sudo">{t('mode_terminal_sudo')}</option>
                      <option value="direct">{t('mode_direct')}</option>
                      <option value="browser">{t('mode_browser')}</option>
                      <option value="disabled">{t('mode_disabled')}</option>
                    </select>
                    <button
                      type="button"
                      className="btn-icon-action"
                      style={{ color: 'var(--accent-rose)', border: 'none', background: 'transparent' }}
                      onClick={() => handleRemoveCustomButton(btn.id)}
                      title={t('removeButton')}
                    >
                      <Icons.Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', width: '100%', justifyContent: 'center', gap: '6px' }}
              onClick={handleAddCustomButton}
            >
              <Icons.Plus size={12} /> {t('addButton')}
            </button>
          </div>
        </div>

        <div className="modal-footer">
          {project && onDelete && (
            <button
              type="button"
              className="btn-secondary"
              style={{ marginRight: 'auto', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
              onClick={() => {
                if (window.confirm(t('deleteConfirmProject', { name: project.name }))) {
                  onDelete(project.id);
                  onClose();
                }
              }}
            >
              <Icons.Trash size={14} />
              {t('delete')}
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={!name.trim() || (startMode !== 'disabled' && !startCommand.trim())}>
            {t('save')}
          </button>
        </div>
      </form>
    </dialog>
  );
};
