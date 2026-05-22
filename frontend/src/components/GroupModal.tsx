import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { useTranslation } from '../i18n';

export interface MonitoringItemConfig {
  id: 'cpu-usage' | 'cpu-temp' | 'gpu-usage' | 'gpu-temp' | 'ram-usage' | 'disk-usage' | 'network-traffic';
  label: string;
  visible: boolean;
  icon: string;
  color: string; // Dynamic hex or standard presets
}

export interface TileLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Group {
  id: string;
  name: string;
  color: string; // Dynamic hex or standard presets
  type?: 'group' | 'links' | 'monitoring';
  links?: { id: string; name: string; url: string; icon: string; iconColor?: string }[];
  monitoringSettings?: {
    updateRateMs?: number;
    items?: MonitoringItemConfig[];
  };
  layout?: TileLayout;
}

export const DEFAULT_MONITORING_ITEMS: MonitoringItemConfig[] = [
  { id: 'cpu-usage', label: 'CPU Auslastung', visible: true, icon: 'Cpu', color: 'default' },
  { id: 'cpu-temp', label: 'CPU Temperatur', visible: true, icon: 'Thermometer', color: 'default' },
  { id: 'gpu-usage', label: 'GPU Auslastung', visible: true, icon: 'Activity', color: 'default' },
  { id: 'gpu-temp', label: 'GPU Temperatur', visible: true, icon: 'Thermometer', color: 'default' },
  { id: 'ram-usage', label: 'RAM Belegung', visible: true, icon: 'HardDrive', color: 'default' },
  { id: 'disk-usage', label: 'Speicherplatz', visible: true, icon: 'Database', color: 'default' },
  { id: 'network-traffic', label: 'Netzwerktraffic', visible: true, icon: 'ArrowDownUp', color: 'default' }
];

interface GroupModalProps {
  isOpen: boolean;
  group: Group | null; // Null if creating a new one
  onClose: () => void;
  onSave: (group: Omit<Group, 'id'> & { id?: string }) => void;
  onDelete?: (groupId: string) => void;
}

const ALL_LUCIDE_ICONS = Object.keys(Icons).filter(key => /^[A-Z]/.test(key));

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  group,
  onClose,
  onSave,
  onDelete,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();
  
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>('cyan');
  const [type, setType] = useState<'group' | 'links' | 'monitoring'>('group');
  
  // Monitoring configurations state
  const [updateRateMs, setUpdateRateMs] = useState<number>(2500);
  const [itemsConfig, setItemsConfig] = useState<MonitoringItemConfig[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(0);

  // Icon Search States
  const [monIconSearch, setMonIconSearch] = useState('');
  const [showMonSuggestions, setShowMonSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(group.name);
        setColor(group.color);
        setType(group.type || 'group');
        
        if (group.monitoringSettings) {
          setUpdateRateMs(group.monitoringSettings.updateRateMs || 2500);
          const savedItems = group.monitoringSettings.items || [];
          const mergedItems = [...savedItems];
          // Fill in any missing default items
          DEFAULT_MONITORING_ITEMS.forEach(defaultItem => {
            if (!mergedItems.some(i => i.id === defaultItem.id)) {
              mergedItems.push({ ...defaultItem });
            }
          });
          setItemsConfig(mergedItems);
        } else {
          setUpdateRateMs(2500);
          setItemsConfig(DEFAULT_MONITORING_ITEMS.map(i => ({ ...i })));
        }
        setActiveItemIndex(0);
      } else {
        setName('');
        setColor('cyan');
        setType('group');
        setUpdateRateMs(2500);
        setItemsConfig(DEFAULT_MONITORING_ITEMS.map(i => ({ ...i })));
        setActiveItemIndex(0);
      }
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, group]);

  // Handle fallback click-outside-to-close behavior
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
    if (!name.trim()) return;
    onSave({
      id: group?.id,
      name: name.trim(),
      color,
      type,
      links: group?.links || [],
      monitoringSettings: type === 'monitoring' ? {
        updateRateMs,
        items: itemsConfig,
      } : undefined,
      layout: group?.layout,
    });
    onClose();
  };

  const getMonitoringItemLabel = (itemId: string, defaultLabel: string) => {
    const key = `metrics_${itemId.replace('-', '_')}`;
    const translated = t(key);
    return translated === key ? defaultLabel : translated;
  };

  const colors: Array<'cyan' | 'violet' | 'emerald' | 'amber' | 'rose'> = [
    'cyan', 'violet', 'emerald', 'amber', 'rose'
  ];

  return (
    <dialog ref={dialogRef} className="glass-panel" style={{ padding: 0 }} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-content glass-panel" style={{ width: type === 'monitoring' ? '600px' : '480px', transition: 'width 0.3s ease' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {group ? t('editTile') : t('createTile')}
          </h3>
          <button type="button" className="btn-icon-action" onClick={onClose}>
            <Icons.X size={16} />
          </button>
        </div>

        <div className="modal-body custom-scrollbar" style={{ maxHeight: '72vh' }}>
          <div className="form-group">
            <label htmlFor="group-name">{t('tileNameLabel')}</label>
            <input
              id="group-name"
              type="text"
              placeholder={t('tileNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {group ? (
            <div className="form-group">
              <label>{t('tileTypeLabel')}</label>
              <h4 style={{ margin: 0, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {type === 'group' ? t('tileTypeGroup') : type === 'links' ? t('tileTypeLinks') : t('tileTypeMonitoring')}
              </h4>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="kachel-type">{t('tileTypeLabel')}</label>
              <select
                id="kachel-type"
                value={type}
                onChange={(e) => setType(e.target.value as 'group' | 'links' | 'monitoring')}
                className="settings-ide-select"
                style={{ width: '100%' }}
              >
                <option value="group">{t('tileTypeGroup')}</option>
                <option value="links">{t('tileTypeLinks')}</option>
                <option value="monitoring">{t('tileTypeMonitoring')}</option>
              </select>
            </div>
          )}

          {type === 'monitoring' && (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginTop: '8px',
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                animation: 'fadeIn 0.2s ease'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px', color: 'var(--text-primary)' }}>
                {t('monitoringConfigTitle')}
              </div>

              {/* Refresh Rate */}
              <div className="form-group">
                <label htmlFor="update-rate">{t('updateRateLabel')}</label>
                <select
                  id="update-rate"
                  value={updateRateMs}
                  onChange={(e) => setUpdateRateMs(Number(e.target.value))}
                  className="settings-ide-select"
                  style={{ width: '100%' }}
                >
                  <option value={1000}>{t('rateVeryFast')}</option>
                  <option value={2500}>{t('rateNormal')}</option>
                  <option value={5000}>{t('rateSlow')}</option>
                  <option value={10000}>{t('rateVerySlow')}</option>
                </select>
              </div>

              {/* Values List */}
              <div className="form-group">
                <label>{t('orderVisibilityLabel')}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {itemsConfig.map((item, index) => {
                    const IconComp = (Icons as any)[item.icon] || Icons.HelpCircle;
                    const isSelected = activeItemIndex === index;
                    const itemColor = item.color === 'default' ? color : item.color;
                    const resolvedColor = ['cyan', 'violet', 'emerald', 'amber', 'rose'].includes(itemColor) ? `var(--accent-${itemColor})` : itemColor;
                    
                    const moveItem = (idx: number, direction: 'up' | 'down') => {
                      const newItems = [...itemsConfig];
                      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
                      if (targetIdx < 0 || targetIdx >= newItems.length) return;
                      const temp = newItems[idx];
                      newItems[idx] = newItems[targetIdx];
                      newItems[targetIdx] = temp;
                      setItemsConfig(newItems);
                      if (activeItemIndex === idx) {
                        setActiveItemIndex(targetIdx);
                      } else if (activeItemIndex === targetIdx) {
                        setActiveItemIndex(idx);
                      }
                    };

                    const toggleVisibility = (idx: number) => {
                      const newItems = [...itemsConfig];
                      newItems[idx] = { ...newItems[idx], visible: !newItems[idx].visible };
                      setItemsConfig(newItems);
                    };

                    return (
                      <div 
                        key={item.id}
                        onClick={() => setActiveItemIndex(index)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? `1px solid ${resolvedColor}` : '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          gap: '10px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <IconComp size={16} style={{ color: resolvedColor, flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', opacity: item.visible ? 1 : 0.4, color: 'var(--text-primary)' }}>
                            {getMonitoringItemLabel(item.id, item.label)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-icon-action"
                            style={{ width: '24px', height: '24px', padding: 0 }}
                            disabled={index === 0}
                            onClick={() => moveItem(index, 'up')}
                            title={t('moveUp')}
                          >
                            <Icons.ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon-action"
                            style={{ width: '24px', height: '24px', padding: 0 }}
                            disabled={index === itemsConfig.length - 1}
                            onClick={() => moveItem(index, 'down')}
                            title={t('moveDown')}
                          >
                            <Icons.ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon-action"
                            style={{ width: '24px', height: '24px', padding: 0, color: item.visible ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
                            onClick={() => toggleVisibility(index)}
                            title={item.visible ? t('hide') : t('show')}
                          >
                            {item.visible ? <Icons.Eye size={12} /> : <Icons.EyeOff size={12} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Value Customization Detail Panel */}
              {activeItemIndex !== null && itemsConfig[activeItemIndex] && (
                <div 
                  className="glass-panel"
                  style={{
                    padding: '14px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                    {t('customizeValue', { label: getMonitoringItemLabel(itemsConfig[activeItemIndex].id, itemsConfig[activeItemIndex].label) })}
                  </div>

                  {/* Rename */}
                  <div className="form-group">
                    <label>{t('displayName')}</label>
                    <input
                      type="text"
                      value={itemsConfig[activeItemIndex].label}
                      onChange={(e) => {
                        const newItems = [...itemsConfig];
                        newItems[activeItemIndex] = { ...newItems[activeItemIndex], label: e.target.value };
                        setItemsConfig(newItems);
                      }}
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    />
                  </div>

                  {/* Color Selector */}
                  <div className="form-group">
                    <label>{t('barColor')}</label>
                    <div className="color-picker-grid" style={{ gap: '8px', flexWrap: 'wrap', alignItems: 'center', display: 'flex' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...itemsConfig];
                          newItems[activeItemIndex] = { ...newItems[activeItemIndex], color: 'default' };
                          setItemsConfig(newItems);
                        }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '5px 10px',
                          borderRadius: '6px',
                          background: itemsConfig[activeItemIndex].color === 'default' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                          color: 'var(--text-primary)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {t('tileColor')}
                      </button>
                      {['cyan', 'violet', 'emerald', 'amber', 'rose'].map((c) => (
                        <div
                          key={c}
                          className={`color-option ${c} ${itemsConfig[activeItemIndex].color === c ? 'selected' : ''}`}
                          onClick={() => {
                            const newItems = [...itemsConfig];
                            newItems[activeItemIndex] = { ...newItems[activeItemIndex], color: c };
                            setItemsConfig(newItems);
                          }}
                          style={{ width: '22px', height: '22px' }}
                        />
                      ))}

                      {/* Item Custom Color Picker */}
                      <div 
                        className={`color-option custom-color-option ${!['default', 'cyan', 'violet', 'emerald', 'amber', 'rose'].includes(itemsConfig[activeItemIndex].color) ? 'selected' : ''}`}
                        style={{
                          background: !['default', 'cyan', 'violet', 'emerald', 'amber', 'rose'].includes(itemsConfig[activeItemIndex].color) 
                            ? itemsConfig[activeItemIndex].color 
                            : 'linear-gradient(45deg, #ff007f, #8a2be2, #00f2fe, #10b981, #f59e0b)',
                          position: 'relative',
                          overflow: 'hidden',
                          border: !['default', 'cyan', 'violet', 'emerald', 'amber', 'rose'].includes(itemsConfig[activeItemIndex].color) ? '1.5px solid #fff' : '1.5px solid transparent',
                          boxShadow: !['default', 'cyan', 'violet', 'emerald', 'amber', 'rose'].includes(itemsConfig[activeItemIndex].color) ? `0 0 8px ${itemsConfig[activeItemIndex].color}` : 'none',
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
                          value={['default', 'cyan', 'violet', 'emerald', 'amber', 'rose'].includes(itemsConfig[activeItemIndex].color) ? '#00f2fe' : itemsConfig[activeItemIndex].color}
                          onChange={(e) => {
                            const newItems = [...itemsConfig];
                            newItems[activeItemIndex] = { ...newItems[activeItemIndex], color: e.target.value };
                            setItemsConfig(newItems);
                          }}
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

                  {/* Icon Selector with Search & Auto-Suggest */}
                  <div className="form-group">
                    <label>{t('selectIcon')}</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder={t('searchIcon')}
                            value={monIconSearch}
                            onChange={(e) => {
                              setMonIconSearch(e.target.value);
                              setShowMonSuggestions(true);
                            }}
                            onFocus={() => setShowMonSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowMonSuggestions(false), 200)}
                            style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                          />
                        </div>

                        {showMonSuggestions && monIconSearch.trim() && (
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
                                name.toLowerCase().includes(monIconSearch.toLowerCase())
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
                                const itemCol = itemsConfig[activeItemIndex].color === 'default' ? color : itemsConfig[activeItemIndex].color;
                                const rCol = ['cyan', 'violet', 'emerald', 'amber', 'rose'].includes(itemCol) ? `var(--accent-${itemCol})` : itemCol;

                                return (
                                  <div
                                    key={name}
                                    className="suggestion-item"
                                    onClick={() => {
                                      const newItems = [...itemsConfig];
                                      newItems[activeItemIndex] = { ...newItems[activeItemIndex], icon: name };
                                      setItemsConfig(newItems);
                                      setMonIconSearch('');
                                      setShowMonSuggestions(false);
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                        {['Cpu', 'Thermometer', 'Activity', 'HardDrive', 'Database', 'ArrowDownUp', 'TrendingUp', 'Compass', 'Globe', 'Layers', 'Gauge', 'Zap'].map((iconName) => {
                          const IconPreview = (Icons as any)[iconName] || Icons.HelpCircle;
                          const isIconSelected = itemsConfig[activeItemIndex].icon === iconName;
                          const itemCol = itemsConfig[activeItemIndex].color === 'default' ? color : itemsConfig[activeItemIndex].color;
                          const rCol = ['cyan', 'violet', 'emerald', 'amber', 'rose'].includes(itemCol) ? `var(--accent-${itemCol})` : itemCol;

                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => {
                                const newItems = [...itemsConfig];
                                newItems[activeItemIndex] = { ...newItems[activeItemIndex], icon: iconName };
                                setItemsConfig(newItems);
                                setShowMonSuggestions(false);
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
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>{t('accentColorLabel')}</label>
            <div className="color-picker-grid" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {colors.map((c) => (
                <div
                  key={c}
                  className={`color-option ${c} ${color === c ? 'selected' : ''}`}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
              
              {/* Custom Accent Color Picker option */}
              <div 
                className={`color-option custom-color-option ${!(colors as string[]).includes(color) ? 'selected' : ''}`}
                style={{
                  background: !(colors as string[]).includes(color) ? color : 'linear-gradient(45deg, #ff007f, #8a2be2, #00f2fe, #10b981, #f59e0b)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: !(colors as string[]).includes(color) ? '2px solid #fff' : '2px solid transparent',
                  boxShadow: !(colors as string[]).includes(color) ? `0 0 10px ${color}` : 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title={t('customColor')}
              >
                <input 
                  type="color" 
                  value={(colors as string[]).includes(color) ? '#00f2fe' : color}
                  onChange={(e) => setColor(e.target.value)}
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

        <div className="modal-footer">
          {group && onDelete && (
            <button
              type="button"
              className="btn-secondary"
              style={{ marginRight: 'auto', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
              onClick={() => {
                const typeText = type === 'group' ? t('typeTextGroup') : type === 'links' ? t('typeTextLinks') : t('typeTextMonitoring');
                if (window.confirm(t('deleteConfirmGroup', { typeText }))) {
                  onDelete(group.id);
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
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            {t('save')}
          </button>
        </div>
      </form>
    </dialog>
  );
};
