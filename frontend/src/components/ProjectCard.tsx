import React from 'react';
import * as Icons from 'lucide-react';
import { useTranslation } from '../i18n';

export interface IDE {
  id: string;
  name: string;
  path: string;
  icon: string;
  image?: string;
}

export interface CustomButton {
  id: string;
  label: string;
  command: string;
  mode: 'direct' | 'terminal' | 'terminal-sudo' | 'browser' | 'disabled';
}

export interface StartConfig {
  command: string;
  mode: 'direct' | 'terminal' | 'terminal-sudo' | 'browser' | 'disabled';
}

export interface Project {
  id: string;
  name: string;
  groupId: string;
  path: string;
  icon: string;
  image?: string;
  bgImage?: string;
  description?: string;
  startConfig: StartConfig;
  customButtons?: CustomButton[];
  primaryIdeId?: string;
  secondaryIdeId?: string;
  iconColor?: string;
}

interface ProjectCardProps {
  project: Project;
  groupColor: string;
  onEdit: (project: Project) => void;
  onLaunch: (path: string, command: string, mode: 'direct' | 'terminal' | 'terminal-sudo' | 'browser' | 'disabled') => void;
  onOpenFolder: (path: string) => void;
  onOpenIDE: (path: string, idePath?: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  ides: IDE[];
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  groupColor,
  onEdit,
  onLaunch,
  onOpenFolder,
  onOpenIDE,
  onDragStart,
  onDragEnd,
  ides,
}) => {
  const [isDraggable, setIsDraggable] = React.useState(false);
  const { t } = useTranslation();

  // Dynamically load the Lucide icon from its name string
  const IconComponent = (Icons as any)[project.icon] || Icons.HelpCircle;

  const handleStart = () => {
    onLaunch(project.path, project.startConfig.command, project.startConfig.mode);
  };

  const handleCustomLaunch = (btn: CustomButton, e: React.MouseEvent) => {
    e.stopPropagation();
    onLaunch(project.path, btn.command, btn.mode);
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'terminal-sudo': return t('mode_terminal_sudo');
      case 'terminal': return t('mode_terminal');
      case 'direct': return t('mode_direct');
      case 'browser': return t('mode_browser');
      case 'disabled': return t('mode_disabled');
      default: return mode;
    }
  };

  const getModeClass = (mode: string) => {
    switch (mode) {
      case 'terminal-sudo': return 'sudo';
      case 'terminal': return 'terminal';
      case 'direct': return 'direct';
      case 'browser': return 'browser';
      case 'disabled': return 'disabled';
      default: return '';
    }
  };

  const formatPath = (p: string) => {
    return p.split('/').join('/\u200B');
  };

  const getFileUrl = (path: string) => {
    return `http://localhost:3030/api/file?path=${encodeURIComponent(path)}`;
  };

  // Find active configured IDEs
  const primaryIde = project.primaryIdeId ? ides.find(i => i.id === project.primaryIdeId) : undefined;
  const secondaryIde = project.secondaryIdeId ? ides.find(i => i.id === project.secondaryIdeId) : undefined;

  // Backward compatibility fallback: if primary IDE is not explicitly selected, use first IDE in list (usually Antigravity IDE)
  const defaultIde = ides.length > 0 ? ides[0] : null;
  const activePrimaryIde = primaryIde || (project.primaryIdeId === undefined ? defaultIde : null);
  const activeSecondaryIde = secondaryIde; // only render secondary if explicitly selected

  const isStandardColor = (c: string) => ['cyan', 'violet', 'emerald', 'amber', 'rose'].includes(c);

  return (
    <div 
      className={`glass-panel project-card ${isStandardColor(groupColor) ? `accent-${groupColor}` : 'accent-custom'} ${project.bgImage ? 'has-bg' : ''}`}
      draggable={isDraggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/project', project.id);
        if (onDragStart) onDragStart(e);
      }}
      onDragEnd={(e) => {
        if (onDragEnd) onDragEnd(e);
      }}
      style={{
        ...(!isStandardColor(groupColor) ? {
          '--accent-custom-color': groupColor,
          '--accent-custom-glow': groupColor + '26'
        } as React.CSSProperties : {})
      }}
    >
      {/* Background wallpaper overlay */}
      {project.bgImage && (
        <div 
          className="project-card-bg-overlay"
          style={{ backgroundImage: `url('${getFileUrl(project.bgImage)}')` }}
        />
      )}

      {/* Settings gear floating on top right */}
      <button 
        className="btn-icon-action edit-gear" 
        onClick={(e) => {
          e.stopPropagation();
          onEdit(project);
        }}
        title={t('editProject')}
      >
        <Icons.Settings size={16} />
      </button>

      {/* Drag grip handle */}
      <div 
        className="card-grip"
        onMouseEnter={() => setIsDraggable(true)}
        onMouseLeave={() => setIsDraggable(false)}
        title={t('dragToReorder')}
      >
        <Icons.GripVertical size={16} />
      </div>

      <div className="card-top">
        <div 
          className="card-icon-container" 
          style={{ 
            color: project.iconColor || (isStandardColor(groupColor) ? `var(--accent-${groupColor})` : groupColor) 
          }}
        >
          {project.image ? (
            <img 
              src={getFileUrl(project.image)} 
              alt="Icon" 
              className="card-custom-icon"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
            />
          ) : (
            <IconComponent size={22} strokeWidth={2} />
          )}
        </div>
        <div className="card-details">
          <h4 className="card-title" title={project.name}>{project.name}</h4>
          {project.description && (
            <p className="card-description" title={project.description}>{project.description}</p>
          )}
          <div className="card-path" title={project.path}>
            <Icons.FolderOpen size={11} style={{ flexShrink: 0 }} />
            <span>{formatPath(project.path)}</span>
          </div>
        </div>
      </div>

      {/* Mode badges */}
      <div className="card-badges">
        <span className={`badge badge-mode ${getModeClass(project.startConfig.mode)}`}>
          {getModeLabel(project.startConfig.mode)}
        </span>
      </div>

      {/* Main actions row */}
      <div className="card-actions-row">
        <button 
          className="btn-action-start" 
          onClick={handleStart}
          disabled={project.startConfig.mode === 'disabled'}
        >
          <Icons.Play size={14} fill="currentColor" />
          <span>{t('start')}</span>
        </button>

        {activePrimaryIde && (
          <button 
            className="btn-icon-action ide-primary" 
            onClick={() => onOpenIDE(project.path, activePrimaryIde.path)} 
            title={t('openIn', { name: activePrimaryIde.name })}
          >
            {activePrimaryIde.image ? (
              <img 
                src={getFileUrl(activePrimaryIde.image)} 
                alt={activePrimaryIde.name}
                style={{ width: '15px', height: '15px', objectFit: 'cover', borderRadius: '3px', display: 'block' }}
              />
            ) : (
              React.createElement((Icons as any)[activePrimaryIde.icon] || Icons.Code, { size: 15 })
            )}
          </button>
        )}

        {activeSecondaryIde && (
          <button 
            className="btn-icon-action ide-secondary" 
            onClick={() => onOpenIDE(project.path, activeSecondaryIde.path)} 
            title={t('openIn', { name: activeSecondaryIde.name })}
          >
            {activeSecondaryIde.image ? (
              <img 
                src={getFileUrl(activeSecondaryIde.image)} 
                alt={activeSecondaryIde.name}
                style={{ width: '15px', height: '15px', objectFit: 'cover', borderRadius: '3px', display: 'block' }}
              />
            ) : (
              React.createElement((Icons as any)[activeSecondaryIde.icon] || Icons.Code, { size: 15 })
            )}
          </button>
        )}

        <button 
          className="btn-icon-action" 
          onClick={() => onOpenFolder(project.path)} 
          title={t('openFolder')}
        >
          <Icons.ExternalLink size={15} />
        </button>
      </div>

      {/* Custom action buttons */}
      {project.customButtons && project.customButtons.length > 0 && (
        <div className="custom-buttons-container">
          {project.customButtons.map((btn) => (
            <button
              key={btn.id}
              className="btn-custom-action"
              onClick={(e) => handleCustomLaunch(btn, e)}
              title={btn.mode === 'disabled' ? t('disabled') : t('runCommand', { command: btn.command, mode: getModeLabel(btn.mode) })}
              disabled={btn.mode === 'disabled'}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
