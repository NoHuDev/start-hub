import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import type { IDE } from './ProjectCard';
import { useTranslation } from '../i18n';

interface TerminalOption {
  id: string;
  name: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  preferredTerminal: string;
  ides: IDE[];
  availableTerminals: TerminalOption[];
  currentFontTitle: string;
  currentFontText: string;
  onClose: () => void;
  onSave: (terminal: string, ides: IDE[], language: any, fontTitle: string, fontText: string) => void;
}

const AVAILABLE_IDE_ICONS = [
  'Code', 'TerminalSquare', 'Monitor', 'Cpu', 'Laptop', 'Terminal', 'Sliders', 'Play', 'Settings', 'Activity'
];

interface FontOption {
  id: string;
  name: string;
  value: string;
}

const TITLE_FONTS: FontOption[] = [
  { id: 'outfit', name: 'Outfit (Standard)', value: "'Outfit', sans-serif" },
  { id: 'press-start', name: 'Press Start 2P (Pixel)', value: "'Press Start 2P', system-ui" },
  { id: 'space-grotesk', name: 'Space Grotesk (Modern Tech)', value: "'Space Grotesk', sans-serif" },
  { id: 'lexend', name: 'Lexend (Clean)', value: "'Lexend', sans-serif" },
  { id: 'jetbrains-mono', name: 'JetBrains Mono (Developer)', value: "'JetBrains Mono', monospace" }
];

const TEXT_FONTS: FontOption[] = [
  { id: 'jakarta', name: 'Plus Jakarta Sans (Standard)', value: "'Plus Jakarta Sans', sans-serif" },
  { id: 'press-start', name: 'Press Start 2P (Pixel)', value: "'Press Start 2P', system-ui" },
  { id: 'space-grotesk', name: 'Space Grotesk (Modern Tech)', value: "'Space Grotesk', sans-serif" },
  { id: 'lexend', name: 'Lexend (Clean)', value: "'Lexend', sans-serif" },
  { id: 'jetbrains-mono', name: 'JetBrains Mono (Developer)', value: "'JetBrains Mono', monospace" }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  preferredTerminal: initialTerminal,
  ides: initialIdes,
  availableTerminals,
  currentFontTitle,
  currentFontText,
  onClose,
  onSave,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { language, t } = useTranslation();

  const [preferredTerminal, setPreferredTerminal] = useState<string>('alacritty');
  const [ides, setIdes] = useState<IDE[]>([]);
  const [modalLanguage, setModalLanguage] = useState<any>('en');
  const [modalFontTitle, setModalFontTitle] = useState<string>("'Outfit', sans-serif");
  const [modalFontText, setModalFontText] = useState<string>("'Plus Jakarta Sans', sans-serif");
  const [activeTab, setActiveTab] = useState<'general' | 'ides' | 'appearance'>('general');

  const isWin = window.navigator.userAgent.toLowerCase().includes('win');

  const getFileUrl = (path: string) => {
    return `http://localhost:3030/api/file?path=${encodeURIComponent(path)}`;
  };

  useEffect(() => {
    if (isOpen) {
      setPreferredTerminal(initialTerminal);
      setIdes(initialIdes.map(ide => ({ ...ide }))); // Deep copy
      setModalLanguage(language);
      setModalFontTitle(currentFontTitle);
      setModalFontText(currentFontText);
      setActiveTab('general');
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, initialTerminal, initialIdes, language, currentFontTitle, currentFontText]);

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

  const handleAddIDE = () => {
    const newIde: IDE = {
      id: `ide-${Date.now()}`,
      name: 'New IDE',
      path: '',
      icon: 'Code',
      image: ''
    };
    setIdes([...ides, newIde]);
  };

  const handleUpdateIDE = (id: string, fields: Partial<IDE>) => {
    setIdes(ides.map((ide) => (ide.id === id ? { ...ide, ...fields } : ide)));
  };

  const handleRemoveIDE = (id: string) => {
    setIdes(ides.filter((ide) => ide.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(preferredTerminal, ides.filter(ide => ide.name.trim()), modalLanguage, modalFontTitle, modalFontText);
    onClose();
  };

  const terminalKey = preferredTerminal.replace('xfce4-', 'xfce_').replace(/-/g, '_');

  return (
    <dialog ref={dialogRef} className="glass-panel" style={{ padding: 0 }} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-content glass-panel" style={{ width: '720px' }}>
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icons.Settings size={20} style={{ color: 'var(--accent-cyan)' }} />
            <span>{t('settingsTitle')}</span>
          </h3>
          <button type="button" className="btn-icon-action" onClick={onClose}>
            <Icons.X size={16} />
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="settings-tabs">
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Icons.Sliders size={14} />
            <span>{t('tabGeneral')}</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'ides' ? 'active' : ''}`}
            onClick={() => setActiveTab('ides')}
          >
            <Icons.Code size={14} />
            <span>{t('tabIdes')}</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Icons.Palette size={14} />
            <span>{t('tabAppearance')}</span>
          </button>
        </div>

        {/* Content body */}
        <div className="modal-body custom-scrollbar" style={{ paddingRight: '4px', minHeight: '380px' }}>
          
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Language Selection */}
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('languageLabel')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                  <select
                    value={modalLanguage}
                    onChange={(e) => setModalLanguage(e.target.value as any)}
                    className="settings-ide-select"
                    style={{ width: '220px' }}
                  >
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {t('languageHelp')}
                  </span>
                </div>
              </div>

              {/* Terminal Selection */}
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('defaultTerminal')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                  <select
                    value={preferredTerminal}
                    onChange={(e) => setPreferredTerminal(e.target.value)}
                    className="settings-ide-select"
                    style={{ width: '220px' }}
                  >
                    {availableTerminals && availableTerminals.length > 0 ? (
                      availableTerminals.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))
                    ) : isWin ? (
                      <>
                        <option value="cmd">Command Prompt (CMD)</option>
                        <option value="powershell">PowerShell</option>
                      </>
                    ) : (
                      <>
                        <option value="alacritty">Alacritty</option>
                        <option value="konsole">Konsole</option>
                        <option value="gnome-terminal">GNOME Terminal</option>
                        <option value="xfce4-terminal">XFCE Terminal</option>
                        <option value="kitty">Kitty</option>
                        <option value="xterm">XTerm</option>
                      </>
                    )}
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {t(`terminalHelp_${terminalKey}`)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* IDE MANAGER TAB */}
          {activeTab === 'ides' && (
            <div className="settings-ide-section" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('manageIdes')}
                </label>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                  onClick={handleAddIDE}
                >
                  <Icons.Plus size={12} /> {t('addIde')}
                </button>
              </div>

              {ides.length === 0 ? (
                <div style={{ border: '1px dashed rgba(255,255,255,0.08)', padding: '24px 0', borderRadius: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.1)' }}>
                  <Icons.Sliders size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px', opacity: 0.5 }} />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('noIdes')}</p>
                </div>
              ) : (
                <div className="settings-ide-list custom-scrollbar" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {ides.map((ide) => (
                    <div key={ide.id} className="settings-ide-item">
                      {/* Row 1: Name, Executable Path / Command, and Delete Button */}
                      <div className="settings-ide-row">
                        <input
                          type="text"
                          placeholder={t('ideNamePlaceholder')}
                          value={ide.name}
                          onChange={(e) => handleUpdateIDE(ide.id, { name: e.target.value })}
                          className="settings-ide-input-name"
                          required
                        />
                        <input
                          type="text"
                          placeholder={t('idePathPlaceholder')}
                          value={ide.path}
                          onChange={(e) => handleUpdateIDE(ide.id, { path: e.target.value })}
                          className="settings-ide-input-path"
                          required
                        />
                        <button
                          type="button"
                          className="btn-icon-action delete-ide-btn"
                          onClick={() => handleRemoveIDE(ide.id)}
                          title={t('removeIde')}
                        >
                          <Icons.Trash size={14} />
                        </button>
                      </div>

                      {/* Row 2: Icon Selection Dropdown and Custom Icon Path Input */}
                      <div className="settings-ide-row">
                        <div className="settings-ide-icon-select-container">
                          <div className="card-icon-container settings-ide-icon-preview">
                            {ide.image ? (
                              <img
                                src={getFileUrl(ide.image)}
                                alt={ide.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                              />
                            ) : (
                              React.createElement((Icons as any)[ide.icon] || Icons.Code, { size: 16 })
                            )}
                          </div>
                          <select
                            value={ide.icon}
                            onChange={(e) => handleUpdateIDE(ide.id, { icon: e.target.value })}
                            className="settings-ide-select"
                          >
                            {AVAILABLE_IDE_ICONS.map(iconName => (
                              <option key={iconName} value={iconName}>{iconName}</option>
                            ))}
                          </select>
                        </div>

                        <input
                          type="text"
                          placeholder={t('customIconPlaceholder')}
                          value={ide.image || ''}
                          onChange={(e) => handleUpdateIDE(ide.id, { image: e.target.value })}
                          className="settings-ide-input-image"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Title Font */}
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    {t('fontTitleLabel')}
                  </label>
                  <select
                    value={modalFontTitle}
                    onChange={(e) => setModalFontTitle(e.target.value)}
                    className="settings-ide-select"
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px', color: '#fff' }}
                  >
                    {TITLE_FONTS.map(f => (
                      <option key={f.id} value={f.value}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Text Font */}
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    {t('fontTextLabel')}
                  </label>
                  <select
                    value={modalFontText}
                    onChange={(e) => setModalFontText(e.target.value)}
                    className="settings-ide-select"
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px', color: '#fff' }}
                  >
                    {TEXT_FONTS.map(f => (
                      <option key={f.id} value={f.value}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Box */}
              <div className="font-preview-container">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('previewLabel')}
                </label>
                <div className="font-preview-box">
                  <h4 className="preview-title" style={{
                    fontFamily: modalFontTitle,
                    fontSize: modalFontTitle.includes('Press Start 2P') ? '14px' : '22px',
                    fontWeight: 600,
                    letterSpacing: modalFontTitle.includes('Press Start 2P') ? '0' : '-0.02em'
                  }}>
                    {t('previewHeading')}
                  </h4>
                  <p className="preview-text" style={{
                    fontFamily: modalFontText,
                    fontSize: modalFontText.includes('Press Start 2P') ? '11px' : '14px',
                    lineHeight: modalFontText.includes('Press Start 2P') ? '1.8' : '1.6'
                  }}>
                    {t('previewParagraph')}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn-primary">
            {t('save')}
          </button>
        </div>
      </form>
    </dialog>
  );
};
