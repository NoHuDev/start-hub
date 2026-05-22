import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { useTranslation } from '../i18n';

export interface LinkItem {
  id: string;
  name: string;
  url: string;
  icon: string;
  iconColor?: string;
}

interface LinkModalProps {
  isOpen: boolean;
  link: LinkItem | null; // Null if creating a new one
  onClose: () => void;
  onSave: (link: Omit<LinkItem, 'id'> & { id?: string }) => void;
  onDelete?: (linkId: string) => void;
}

const PRESET_ICONS = [
  'Globe', 'Github', 'Youtube', 'Cpu', 'Database', 
  'Play', 'Terminal', 'Layers', 'Settings', 'Activity', 
  'Home', 'Sparkles'
];

const ALL_LUCIDE_ICONS = Object.keys(Icons).filter(key => /^[A-Z]/.test(key));

export const LinkModal: React.FC<LinkModalProps> = ({
  isOpen,
  link,
  onClose,
  onSave,
  onDelete,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('Globe');
  
  // Suggestion/Color Picker states
  const [iconColor, setIconColor] = useState('default');
  const [iconSearch, setIconSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (link) {
        setName(link.name);
        setUrl(link.url);
        setIcon(link.icon || 'Globe');
        setIconColor(link.iconColor || 'default');
      } else {
        setName('');
        setUrl('');
        setIcon('Globe');
        setIconColor('default');
      }
      setIconSearch('');
      setShowSuggestions(false);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, link]);

  // Click-outside-to-close behavior
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    
    // Add protocol to URL if not present
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    onSave({
      id: link?.id,
      name: name.trim(),
      url: finalUrl,
      icon: icon || 'Globe',
      iconColor: iconColor !== 'default' ? iconColor : undefined,
    });
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="glass-panel" style={{ padding: 0 }} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-content glass-panel" style={{ width: '500px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {link ? t('editLink') : t('createLink')}
          </h3>
          <button type="button" className="btn-icon-action" onClick={onClose}>
            <Icons.X size={16} />
          </button>
        </div>

        <div className="modal-body custom-scrollbar" style={{ maxHeight: '72vh' }}>
          <div className="form-group">
            <label htmlFor="link-name">{t('websiteNameLabel')}</label>
            <input
              id="link-name"
              type="text"
              placeholder={t('websiteNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="link-url">{t('urlAddressLabel')}</label>
            <input
              id="link-url"
              type="text"
              placeholder={t('urlAddressPlaceholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              marginTop: '8px'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              {t('iconSearchLabel')}
            </div>

            {/* Search + Preview */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>{t('iconSearchLabel')}</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    flexShrink: 0
                  }}
                >
                  {(() => {
                    const PreviewIcon = (Icons as any)[icon] || Icons.HelpCircle;
                    const rCol = iconColor === 'default' ? 'var(--accent-cyan)' : iconColor;
                    return <PreviewIcon size={20} style={{ color: rCol }} />;
                  })()}
                </div>
                <input
                  type="text"
                  placeholder={t('searchIcon')}
                  value={iconSearch}
                  onChange={(e) => {
                    setIconSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                />
              </div>

              {showSuggestions && iconSearch.trim() && (
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
                      name.toLowerCase().includes(iconSearch.toLowerCase())
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
                      const rCol = iconColor === 'default' ? 'var(--accent-cyan)' : iconColor;
                      return (
                        <div
                          key={name}
                          className="suggestion-item"
                          onClick={() => {
                            setIcon(name);
                            setIconSearch('');
                            setShowSuggestions(false);
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
                          <MatchIcon size={14} style={{ color: rCol }} />
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
                {PRESET_ICONS.map((iconName) => {
                  const IconPreview = (Icons as any)[iconName] || Icons.HelpCircle;
                  const isIconSelected = icon === iconName;
                  const rCol = iconColor === 'default' ? 'var(--accent-cyan)' : iconColor;

                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => {
                        setIcon(iconName);
                        setShowSuggestions(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        background: isIconSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.01)',
                        border: isIconSelected ? `1px solid ${rCol}` : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        color: isIconSelected ? rCol : 'var(--text-secondary)',
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
        </div>

        <div className="modal-footer">
          {link && onDelete && (
            <button
              type="button"
              className="btn-secondary"
              style={{ marginRight: 'auto', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
              onClick={() => {
                if (window.confirm(t('deleteConfirmLink'))) {
                  onDelete(link.id);
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
          <button type="submit" className="btn-primary" disabled={!name.trim() || !url.trim()}>
            {t('save')}
          </button>
        </div>
      </form>
    </dialog>
  );
};
