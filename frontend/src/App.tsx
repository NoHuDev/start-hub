import { useState, useEffect, useRef } from 'react';
import { useTranslation } from './i18n';
import type { LanguageCode } from './i18n';
import * as Icons from 'lucide-react';
import { ProjectCard } from './components/ProjectCard';
import type { Project, IDE } from './components/ProjectCard';
import { GroupModal, DEFAULT_MONITORING_ITEMS } from './components/GroupModal';
import type { Group } from './components/GroupModal';
import { ProjectModal } from './components/ProjectModal';
import { SettingsModal } from './components/SettingsModal';
import { LinkModal } from './components/LinkModal';
import type { LinkItem } from './components/LinkModal';
import { ProfileModal } from './components/ProfileModal';

const API_BASE = 'http://localhost:3030/api';

function App() {
  const { language, setLanguage, t } = useTranslation();

  const getMonitoringItemLabel = (itemId: string, defaultLabel: string) => {
    const key = `metrics_${itemId.replace('-', '_')}`;
    const translated = t(key);
    return translated === key ? defaultLabel : translated;
  };
  const [groups, setGroups] = useState<Group[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [preferredTerminal, setPreferredTerminal] = useState<string>('alacritty');
  const [availableTerminals, setAvailableTerminals] = useState<{ id: string; name: string }[]>([]);
  const [ides, setIdes] = useState<IDE[]>([]);
  const [fontTitle, setFontTitle] = useState<string>("'Outfit', sans-serif");
  const [fontText, setFontText] = useState<string>("'Plus Jakarta Sans', sans-serif");
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamically apply selected fonts
  useEffect(() => {
    document.documentElement.style.setProperty('--font-display', fontTitle);
  }, [fontTitle]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-sans', fontText);
  }, [fontText]);
  
  // Modal states
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState<string | undefined>(undefined);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeProfile, setActiveProfileState] = useState<string>(() => {
    return localStorage.getItem('start-hub-profile') || 'projects';
  });

  // Link Modal states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [activeLink, setActiveLink] = useState<LinkItem | null>(null);
  const [activeLinkTileId, setActiveLinkTileId] = useState<string | null>(null);

  // Monitoring data state
  const [monitoringData, setMonitoringData] = useState<any>(null);

  // Status notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Drag & drop states (within normal mode for project cards)
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [activeDragOverGroupId, setActiveDragOverGroupId] = useState<string | null>(null);

  // Canvas layout mode and gesture state
  const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panningState, setPanningState] = useState({
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0
  });

  const [dragState, setDragState] = useState<{
    tileId: string;
    startX: number;
    startY: number;
    startPixelX: number;
    startPixelY: number;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    tileId: string;
    startX: number;
    startY: number;
    startPixelW: number;
    startPixelH: number;
  } | null>(null);

  // Board ref for horizontal / vertical scroll viewport manipulation
  const boardRef = useRef<HTMLDivElement>(null);

  // Load config on mount
  useEffect(() => {
    fetchConfig(activeProfile);
  }, []);

  // System monitoring polling effect with dynamic refresh rates
  useEffect(() => {
    const monitoringTiles = groups.filter(g => g.type === 'monitoring');
    if (monitoringTiles.length === 0) {
      setMonitoringData(null);
      return;
    }

    // Determine the minimum update rate (defaults to 2500ms)
    let minInterval = 2500;
    monitoringTiles.forEach(tile => {
      const rate = tile.monitoringSettings?.updateRateMs;
      if (rate && rate > 0) {
        minInterval = Math.min(minInterval, rate);
      }
    });

    const fetchMonitoring = async () => {
      try {
        const res = await fetch(`${API_BASE}/monitoring`);
        if (res.ok) {
          const data = await res.json();
          setMonitoringData(data);
        }
      } catch (err) {
        console.error('Error fetching monitoring data:', err);
      }
    };

    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, minInterval);
    return () => clearInterval(interval);
  }, [groups]);

  // Click-and-drag panning gesture listener on outer viewport
  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const board = boardRef.current;
      if (!board) return;
      
      const dx = e.clientX - panningState.startX;
      const dy = e.clientY - panningState.startY;
      
      board.scrollLeft = panningState.scrollLeft - dx;
      board.scrollTop = panningState.scrollTop - dy;
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panningState]);

  // Snap-to-grid drag-to-position listener in Layout-Edit-Mode
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      
      const proposedX = Math.max(0, dragState.startPixelX + dx);
      const proposedY = Math.max(0, dragState.startPixelY + dy);
      
      const SNAP_THRESHOLD = 12;
      const MARGIN = 24;
      
      let snapX = null;
      let snapY = null;
      
      // Snap to canvas margins
      if (Math.abs(proposedX - MARGIN) < SNAP_THRESHOLD) snapX = MARGIN;
      else if (Math.abs(proposedX) < SNAP_THRESHOLD) snapX = 0;
      
      if (Math.abs(proposedY - MARGIN) < SNAP_THRESHOLD) snapY = MARGIN;
      else if (Math.abs(proposedY) < SNAP_THRESHOLD) snapY = 0;
      
      const group = groups.find(g => g.id === dragState.tileId);
      if (group && group.layout) {
        const tileW = group.layout.w;
        const tileH = group.layout.h;
        
        const otherGroups = groups.filter(g => g.id !== dragState.tileId && g.layout);
        
        for (const other of otherGroups) {
          const otherX = other.layout!.x;
          const otherY = other.layout!.y;
          const otherW = other.layout!.w;
          const otherH = other.layout!.h;
          
          // Horizontal alignment and spacing
          if (snapX === null) {
            // Case 1: Ideal distance (other.right + 24px gap)
            if (Math.abs(proposedX - (otherX + otherW + MARGIN)) < SNAP_THRESHOLD) {
              snapX = otherX + otherW + MARGIN;
            }
            // Case 2: Ideal distance (other.left - 24px gap - tileWidth)
            else if (Math.abs((proposedX + tileW) - (otherX - MARGIN)) < SNAP_THRESHOLD) {
              snapX = otherX - MARGIN - tileW;
            }
            // Case 3: Align left edges
            else if (Math.abs(proposedX - otherX) < SNAP_THRESHOLD) {
              snapX = otherX;
            }
            // Case 4: Align right edges
            else if (Math.abs((proposedX + tileW) - (otherX + otherW)) < SNAP_THRESHOLD) {
              snapX = otherX + otherW - tileW;
            }
          }
          
          // Vertical alignment and spacing
          if (snapY === null) {
            // Case 1: Ideal distance (other.bottom + 24px gap)
            if (Math.abs(proposedY - (otherY + otherH + MARGIN)) < SNAP_THRESHOLD) {
              snapY = otherY + otherH + MARGIN;
            }
            // Case 2: Ideal distance (other.top - 24px gap - tileHeight)
            else if (Math.abs((proposedY + tileH) - (otherY - MARGIN)) < SNAP_THRESHOLD) {
              snapY = otherY - MARGIN - tileH;
            }
            // Case 3: Align top edges
            else if (Math.abs(proposedY - otherY) < SNAP_THRESHOLD) {
              snapY = otherY;
            }
            // Case 4: Align bottom edges
            else if (Math.abs((proposedY + tileH) - (otherY + otherH)) < SNAP_THRESHOLD) {
              snapY = otherY + otherH - tileH;
            }
          }
        }
      }
      
      const finalX = snapX !== null ? snapX : proposedX;
      const finalY = snapY !== null ? snapY : proposedY;
      
      setGroups(prevGroups => prevGroups.map(g => g.id === dragState.tileId ? {
        ...g,
        layout: { ...g.layout!, x: finalX, y: finalY }
      } : g));
    };

    const handleMouseUp = () => {
      setGroups(currentGroups => {
        saveConfigToServer(currentGroups, projects, preferredTerminal, ides);
        return currentGroups;
      });
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, groups, projects, preferredTerminal, ides]);

  // Snap-to-grid resize-to-scale listener in Layout-Edit-Mode
  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;
      
      const proposedW = Math.max(200, resizeState.startPixelW + dx); // Minimum width 200px
      const proposedH = Math.max(120, resizeState.startPixelH + dy); // Minimum height 120px
      
      let finalW = proposedW;
      let finalH = proposedH;
      
      const SNAP_THRESHOLD = 12;
      
      // Snap width to grid multiples (e.g. 200, 424, 648...)
      const gridWCount = Math.round((proposedW + 24) / 224);
      const targetW = Math.max(1, gridWCount) * 224 - 24;
      if (Math.abs(proposedW - targetW) < SNAP_THRESHOLD) {
        finalW = targetW;
      }
      
      // Perfect-height snapping (align to fit contents exactly)
      const element = document.getElementById(resizeState.tileId);
      if (element) {
        const header = element.querySelector('.column-header') as HTMLElement;
        const container = element.querySelector('.column-cards-container') as HTMLElement;
        if (header && container) {
          const perfectHeight = header.offsetHeight + container.scrollHeight;
          if (Math.abs(proposedH - perfectHeight) < SNAP_THRESHOLD) {
            finalH = perfectHeight;
          }
        }
      }
      
      setGroups(prevGroups => prevGroups.map(g => g.id === resizeState.tileId ? {
        ...g,
        layout: { ...g.layout!, w: finalW, h: finalH }
      } : g));
    };

    const handleMouseUp = () => {
      setGroups(currentGroups => {
        saveConfigToServer(currentGroups, projects, preferredTerminal, ides);
        return currentGroups;
      });
      setResizeState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState, projects, preferredTerminal, ides]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchConfig = async (profileName: string = activeProfile) => {
    try {
      const res = await fetch(`${API_BASE}/config?profile=${encodeURIComponent(profileName)}`);
      if (!res.ok) throw new Error('API server returned error');
      const data = await res.json();
      
      // Auto-initialize layout values if they don't exist (compatibility layer)
      const loadedGroups: Group[] = data.groups || [];
      let nextX = 0;
      const initializedGroups = loadedGroups.map((group) => {
        if (!group.layout) {
          const initialized = {
            ...group,
            layout: {
              x: nextX * 224,
              y: 24, // Top margin
              w: 2 * 224 - 24, // 424px
              h: 5 * 104 - 24  // 496px
            }
          };
          nextX += 2;
          return initialized;
        }

        // If the layout coordinates are stored in grid system (e.g. w and h are grid spans), convert them to pixels
        let { x, y, w, h } = group.layout;
        if (w < 20 && h < 50) {
          x = x * 224;
          y = y * 104;
          w = w * 224 - 24;
          h = h * 104 - 24;
        }

        return {
          ...group,
          layout: { x, y, w, h }
        };
      });

      setGroups(initializedGroups);
      setProjects(data.projects || []);
      setPreferredTerminal(data.settings?.preferredTerminal || 'alacritty');
      setAvailableTerminals(data.availableTerminals || []);
      setIdes(data.settings?.ides || []);
      if (data.settings?.language) {
        setLanguage(data.settings.language);
      }
      if (data.settings?.fontTitle) {
        setFontTitle(data.settings.fontTitle);
      }
      if (data.settings?.fontText) {
        setFontText(data.settings.fontText);
      }
    } catch (err) {
      console.error('Failed to load configuration:', err);
      showNotification(t('notif_load_failed'), 'error');
    }
  };

  const saveConfigToServer = async (
    newGroups: Group[],
    newProjects: Project[],
    newTerminal: string,
    newIdes: IDE[],
    newLang?: LanguageCode,
    newFontTitle?: string,
    newFontText?: string,
    profileName: string = activeProfile
  ) => {
    const payload = {
      settings: {
        preferredTerminal: newTerminal,
        ides: newIdes,
        language: newLang || language,
        fontTitle: newFontTitle !== undefined ? newFontTitle : fontTitle,
        fontText: newFontText !== undefined ? newFontText : fontText,
        layoutMode: 'grid'
      },
      groups: newGroups,
      projects: newProjects
    };

    try {
      const res = await fetch(`${API_BASE}/config?profile=${encodeURIComponent(profileName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setGroups(newGroups);
        setProjects(newProjects);
        setPreferredTerminal(newTerminal);
        setIdes(newIdes);
        if (newLang) {
          setLanguage(newLang);
        }
        if (newFontTitle !== undefined) {
          setFontTitle(newFontTitle);
        }
        if (newFontText !== undefined) {
          setFontText(newFontText);
        }
        showNotification(t('notif_settings_saved'));
      } else {
        throw new Error(data.message || 'Saving failed');
      }
    } catch (err: any) {
      console.error('Save config error:', err);
      showNotification(t('notif_save_failed', { message: err.message }), 'error');
    }
  };

  // Launch Commands
  const handleLaunch = async (projectPath: string, command: string, mode: 'direct' | 'terminal' | 'terminal-sudo' | 'browser' | 'disabled') => {
    try {
      showNotification(t('notif_executing'));
      const res = await fetch(`${API_BASE}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, command, mode, profile: activeProfile })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(t('notif_execute_success'), 'success');
      } else {
        throw new Error(data.message || 'Launch execution failed');
      }
    } catch (err: any) {
      console.error('Launch execution error:', err);
      showNotification(t('notif_execute_failed', { message: err.message }), 'error');
    }
  };

  // Profile Handlers
  const handleSelectProfile = (profileId: string) => {
    setActiveProfileState(profileId);
    localStorage.setItem('start-hub-profile', profileId);
    fetchConfig(profileId);
    showNotification(t('notif_profile_switched', { name: profileId }));
  };

  const handleCreateProfile = async (profileName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(t('notif_profile_created', { name: data.profile.name }));
        handleSelectProfile(data.profile.id);
        return true;
      } else {
        throw new Error(data.message || 'Creation failed');
      }
    } catch (err: any) {
      console.error('Create profile error:', err);
      showNotification(err.message, 'error');
      return false;
    }
  };

  const handleRenameProfile = async (oldName: string, newName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/profiles/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(t('notif_profile_renamed', { name: newName }));
        if (activeProfile === oldName) {
          setActiveProfileState(newName);
          localStorage.setItem('start-hub-profile', newName);
        }
        return true;
      } else {
        throw new Error(data.message || 'Rename failed');
      }
    } catch (err: any) {
      console.error('Rename profile error:', err);
      showNotification(err.message, 'error');
      return false;
    }
  };

  const handleDeleteProfile = async (profileId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(profileId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showNotification(t('notif_profile_deleted', { name: profileId }));
        if (activeProfile === profileId) {
          handleSelectProfile('projects');
        }
        return true;
      } else {
        throw new Error(data.message || 'Deletion failed');
      }
    } catch (err: any) {
      console.error('Delete profile error:', err);
      showNotification(err.message, 'error');
      return false;
    }
  };

  // Open Folder
  const handleOpenFolder = async (projectPath: string) => {
    try {
      showNotification(t('notif_opening_dir'));
      const res = await fetch(`${API_BASE}/open-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(t('notif_open_dir_success'));
      } else {
        throw new Error(data.message || 'Opening directory failed');
      }
    } catch (err: any) {
      console.error('Open folder error:', err);
      showNotification(t('notif_open_dir_failed', { message: err.message }), 'error');
    }
  };

  // Open in custom IDE or default Antigravity IDE
  const handleOpenIDE = async (projectPath: string, idePath?: string) => {
    try {
      showNotification(t('notif_opening_ide'));
      const res = await fetch(`${API_BASE}/open-ide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, idePath })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(t('notif_open_ide_success'), 'success');
      } else {
        throw new Error(data.message || 'Opening IDE failed');
      }
    } catch (err: any) {
      console.error('Open IDE error:', err);
      showNotification(t('notif_open_ide_failed', { message: err.message }), 'error');
    }
  };

  // Group Handlers (CRUD)
  const handleSaveGroup = (groupData: Omit<Group, 'id'> & { id?: string }) => {
    let updatedGroups: Group[];
    if (groupData.id) {
      // Edit mode
      updatedGroups = groups.map((g) => g.id === groupData.id ? (groupData as Group) : g);
    } else {
      // Add mode
      // Scan the existing coordinates and place new tiles next to the rightmost tile
      let nextX = 0;
      groups.forEach(g => {
        if (g.layout) {
          nextX = Math.max(nextX, g.layout.x + g.layout.w);
        }
      });
      const newGroup: Group = {
        id: `group-${Date.now()}`,
        name: groupData.name,
        color: groupData.color,
        type: groupData.type || 'group',
        links: groupData.links || [],
        monitoringSettings: groupData.monitoringSettings,
        layout: {
          x: nextX > 0 ? nextX + 24 : 0,
          y: 24,
          w: 424,
          h: 496
        }
      };
      updatedGroups = [...groups, newGroup];
    }
    saveConfigToServer(updatedGroups, projects, preferredTerminal, ides);
  };

  const handleDeleteGroup = (groupId: string) => {
    const updatedGroups = groups.filter((g) => g.id !== groupId);
    // Cascade delete: delete or move projects in this group
    const updatedProjects = projects.filter((p) => p.groupId !== groupId);
    saveConfigToServer(updatedGroups, updatedProjects, preferredTerminal, ides);
  };

  // Link Handlers (CRUD)
  const handleSaveLink = (linkData: Omit<LinkItem, 'id'> & { id?: string }) => {
    if (!activeLinkTileId) return;

    const updatedGroups = groups.map((g) => {
      if (g.id !== activeLinkTileId) return g;

      let updatedLinks = g.links || [];
      if (linkData.id) {
        // Edit mode
        updatedLinks = updatedLinks.map((l) => l.id === linkData.id ? (linkData as LinkItem) : l);
      } else {
        // Add mode
        const newLink: LinkItem = {
          ...linkData,
          id: `link-${Date.now()}`
        } as LinkItem;
        updatedLinks = [...updatedLinks, newLink];
      }
      return { ...g, links: updatedLinks };
    });

    saveConfigToServer(updatedGroups, projects, preferredTerminal, ides);
  };

  const handleDeleteLink = (linkId: string) => {
    if (!activeLinkTileId) return;

    const updatedGroups = groups.map((g) => {
      if (g.id !== activeLinkTileId) return g;
      const updatedLinks = (g.links || []).filter((l) => l.id !== linkId);
      return { ...g, links: updatedLinks };
    });

    saveConfigToServer(updatedGroups, projects, preferredTerminal, ides);
  };

  // Project Handlers (CRUD)
  const handleSaveProject = (projData: Omit<Project, 'id'> & { id?: string }) => {
    let updatedProjects: Project[];
    if (projData.id) {
      // Edit mode
      updatedProjects = projects.map((p) => p.id === projData.id ? (projData as Project) : p);
    } else {
      // Add mode
      const newProj: Project = {
        ...projData,
        id: `proj-${Date.now()}`
      } as Project;
      updatedProjects = [...projects, newProj];
    }
    saveConfigToServer(groups, updatedProjects, preferredTerminal, ides);
  };

  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    saveConfigToServer(groups, updatedProjects, preferredTerminal, ides);
  };

  const handleMoveProject = (draggedId: string, targetGroupId: string, targetIndex?: number) => {
    const draggedProj = projects.find((p) => p.id === draggedId);
    if (!draggedProj) return;

    // Filter out the dragged project from the old list
    const remaining = projects.filter((p) => p.id !== draggedId);

    // Create the updated project with the new groupId
    const updatedProj = { ...draggedProj, groupId: targetGroupId };

    let newProjects: Project[];
    if (targetIndex !== undefined && targetIndex !== -1) {
      // Find all projects currently in the target group
      const targetGroupProjects = remaining.filter((p) => p.groupId === targetGroupId);
      
      if (targetGroupProjects.length === 0) {
        newProjects = [...remaining, updatedProj];
      } else {
        // Find the index of targetGroupProjects[targetIndex] in the global remaining array
        const targetProj = targetGroupProjects[targetIndex];
        const insertPos = remaining.indexOf(targetProj);
        
        newProjects = [...remaining];
        if (insertPos !== -1) {
          newProjects.splice(insertPos, 0, updatedProj);
        } else {
          newProjects.push(updatedProj);
        }
      }
    } else {
      // Append to the end of the group
      newProjects = [...remaining, updatedProj];
    }

    saveConfigToServer(groups, newProjects, preferredTerminal, ides);
  };

  const handleSaveSettings = (term: string, updatedIdes: IDE[], newLang: LanguageCode, newFontTitle: string, newFontText: string) => {
    saveConfigToServer(groups, projects, term, updatedIdes, newLang, newFontTitle, newFontText);
  };

  // Viewport Click-and-Drag Panning handler
  const handleViewportMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return; // Only left clicks
    if ((e.target as HTMLElement).closest('.board-column')) return; // Don't pan if clicking on a tile

    const board = boardRef.current;
    if (!board) return;

    setIsPanning(true);
    setPanningState({
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: board.scrollLeft,
      scrollTop: board.scrollTop
    });
  };

  // Tile Drag Start handler
  const handleTileDragStart = (e: React.MouseEvent, tileId: string) => {
    if (e.button !== 0) return; // Only left clicks
    if (!isLayoutEditMode) return;
    
    e.stopPropagation();
    e.preventDefault();

    const group = groups.find(g => g.id === tileId);
    if (!group || !group.layout) return;

    setDragState({
      tileId,
      startX: e.clientX,
      startY: e.clientY,
      startPixelX: group.layout.x,
      startPixelY: group.layout.y
    });
  };

  // Tile Resize Start handler
  const handleTileResizeStart = (e: React.MouseEvent, tileId: string) => {
    if (e.button !== 0) return; // Only left clicks
    if (!isLayoutEditMode) return;

    e.stopPropagation();
    e.preventDefault();

    const group = groups.find(g => g.id === tileId);
    if (!group || !group.layout) return;

    setResizeState({
      tileId,
      startX: e.clientX,
      startY: e.clientY,
      startPixelW: group.layout.w,
      startPixelH: group.layout.h
    });
  };

  // Filtering
  const filteredProjects = projects.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      p.path.toLowerCase().includes(query)
    );
  });

  const isGroupMatching = (group: Group) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    // Check if group name itself matches
    if (group.name.toLowerCase().includes(query)) return true;

    // If it's a project group, check if it contains any matching projects
    if (!group.type || group.type === 'group') {
      const groupProjects = filteredProjects.filter((p) => p.groupId === group.id);
      return groupProjects.length > 0;
    }

    // If it's a link group, check if it contains any matching links
    if (group.type === 'links') {
      const groupLinks = (group.links || []).filter(link => 
        link.name.toLowerCase().includes(query) || 
        link.url.toLowerCase().includes(query)
      );
      return groupLinks.length > 0;
    }

    // If it's a monitoring group, check if any active items match
    if (group.type === 'monitoring') {
      const monitoringKeys = ['cpu', 'temperatur', 'ram', 'speicher', 'network', 'netzwerk', 'system'];
      return monitoringKeys.some(key => query.includes(key) || key.includes(query));
    }

    return false;
  };

  const matchingGroups = groups.filter(isGroupMatching);

  return (
    <div className="app-container">
      {/* Dynamic floating status notifications */}
      {notification && (
        <div 
          className="glass-panel" 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 24px',
            borderLeft: `4px solid ${notification.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {notification.type === 'success' ? (
            <Icons.CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
          ) : (
            <Icons.AlertTriangle size={18} style={{ color: 'var(--accent-rose)' }} />
          )}
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{notification.message}</span>
        </div>
      )}

      {/* Main Top Header */}
      <header className="main-header">
        <div className="logo-section">
          <svg className="logo-rocket-svg" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            {/* Rocket body with a cutout circle window (evenodd fill rule) */}
            <path 
              d="M16 2C14.2 6.5 12 10.5 12 15.5H20C20 10.5 17.8 6.5 16 2Z M16 7.2C15 7.2 14.2 8 14.2 9C14.2 10 15 10.8 16 10.8C17 10.8 17.8 10 17.8 9C17.8 8 17 7.2 16 7.2Z" 
              fillRule="evenodd" 
            />
            {/* Sleek triangular fins */}
            <path d="M12 11L9 16C8.8 16.3 9 16.5 9.4 16.5H12V11Z" />
            <path d="M20 11L23 16C23.2 16.3 23 16.5 22.6 16.5H20V11Z" />
            {/* Engine nozzle */}
            <path d="M14.5 15.5L13.5 17.5H18.5L17.5 15.5H14.5Z" />
            
            {/* Exhaust Flame */}
            <path d="M14 18.5C14 21.5 15.2 24.5 16 26.5C16.8 24.5 18 21.5 18 18.5H14Z" opacity="0.85" />
            
            {/* Stable Tiled Launchpad at the bottom (Dashboard metaphor) */}
            {/* Left Pad Tiles */}
            <rect x="2" y="27" width="4" height="3" rx="0.5" opacity="0.4" />
            <rect x="7" y="27" width="4" height="3" rx="0.5" opacity="0.6" />
            <rect x="3" y="23" width="4" height="3" rx="0.5" opacity="0.3" />
            <rect x="8" y="22" width="3" height="3" rx="0.5" opacity="0.5" />
            
            {/* Right Pad Tiles */}
            <rect x="26" y="27" width="4" height="3" rx="0.5" opacity="0.4" />
            <rect x="21" y="27" width="4" height="3" rx="0.5" opacity="0.6" />
            <rect x="25" y="23" width="4" height="3" rx="0.5" opacity="0.3" />
            <rect x="21" y="22" width="3" height="3" rx="0.5" opacity="0.5" />
            
            {/* Floating / Displaced Tiles due to Lift-Off Thrust */}
            <rect x="11.5" y="20" width="3" height="2.5" rx="0.5" transform="rotate(-15 13 21)" opacity="0.8" />
            <rect x="17.5" y="20.5" width="2.5" height="2.5" rx="0.5" transform="rotate(10 18.75 21.75)" opacity="0.85" />
            <rect x="13.5" y="24.5" width="5" height="3" rx="0.5" transform="rotate(8 16 26)" opacity="0.9" />
            
            {/* Floating Sparks/Small Tiles */}
            <rect x="10.5" y="16.5" width="1.5" height="1.5" rx="0.3" transform="rotate(30 11.25 17.25)" opacity="0.7" />
            <rect x="20" y="17" width="1.5" height="1.5" rx="0.3" transform="rotate(-25 20.75 17.75)" opacity="0.7" />
            <rect x="15.25" y="22.5" width="1.5" height="1.5" rx="0.3" transform="rotate(45 16 23.25)" opacity="0.9" />
          </svg>
          <div className="logo-icon">Start Hub</div>
        </div>

        <div className="header-actions">
          {/* Quick search input */}
          <div className="search-bar">
            <Icons.Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder={t('searchPlaceholder')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <Icons.X size={14} />
              </button>
            )}
          </div>

          {/* Toggle Layout Edit Mode Status Infopille */}
          {isLayoutEditMode && (
            <div className="layout-edit-pill">
              <Icons.Info size={14} className="pulse-icon" />
              <span>{t('layoutEditActive')}</span>
            </div>
          )}

          {/* Toggle Layout Edit Mode */}
          <button 
            className={`btn-secondary ${isLayoutEditMode ? 'active-neon' : ''}`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              border: isLayoutEditMode ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: isLayoutEditMode ? '0 0 10px rgba(0, 242, 254, 0.2)' : 'none'
            }}
            onClick={() => {
              setIsLayoutEditMode(!isLayoutEditMode);
              if (isLayoutEditMode) {
                showNotification(t('notif_layout_saved'), 'success');
              }
            }}
          >
            {isLayoutEditMode ? <Icons.Check size={16} /> : <Icons.Grid size={16} />}
            <span>{isLayoutEditMode ? t('layoutSave') : t('layoutAdjust')}</span>
          </button>

          <button 
            className="btn-primary" 
            onClick={() => {
              setActiveGroup(null);
              setIsGroupModalOpen(true);
            }}
          >
            <Icons.Plus size={16} />
            <span>{t('newTile')}</span>
          </button>

          <button
            className="btn-icon-action settings-gear-global"
            onClick={() => setIsSettingsModalOpen(true)}
            title={t('globalSettings')}
          >
            <Icons.Settings size={18} />
          </button>

          <button
            className="btn-icon-action profile-switch-global"
            onClick={() => setIsProfileModalOpen(true)}
            title={t('profileSwitchTitle')}
          >
            <Icons.CircleUser size={18} />
          </button>
        </div>
      </header>

      {/* Scrollable Viewport Container for Panning */}
      <main 
        ref={boardRef}
        className={`board-canvas-viewport custom-scrollbar ${isLayoutEditMode ? 'layout-edit-active' : ''} ${searchQuery.trim() !== '' ? 'search-active' : ''}`}
        onMouseDown={handleViewportMouseDown}
      >
        {/* Infinite Grid Area */}
        <div className="board-canvas-grid">
          {matchingGroups.length === 0 && searchQuery.trim() !== '' && (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '400px',
                color: 'var(--text-muted)',
                textAlign: 'center',
                animation: 'fadeIn 0.3s ease-out',
                position: 'absolute',
                top: '100px',
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            >
              <Icons.Search size={48} style={{ color: 'var(--accent-rose)', opacity: 0.8, marginBottom: '16px' }} />
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{t('noResultsTitle')}</h3>
              <p style={{ fontSize: '14px', maxWidth: '320px', lineHeight: 1.5 }}>
                {t('noResultsText', { query: searchQuery })}
              </p>
            </div>
          )}
          {matchingGroups.map((group) => {
            const groupProjects = filteredProjects.filter((p) => p.groupId === group.id);
            const isStandardColor = (c: string) => ['cyan', 'violet', 'emerald', 'amber', 'rose'].includes(c);
            const columnAccentClass = isStandardColor(group.color) ? `accent-${group.color}` : 'accent-custom';
            const customColorStyles = isStandardColor(group.color) ? {} : {
              '--accent-custom-color': group.color,
              '--accent-custom-glow': group.color + '26'
            };
            
            return (
              <div 
                key={group.id} 
                id={group.id}
                className={`board-column ${isLayoutEditMode ? 'edit-mode' : ''} ${dragState?.tileId === group.id ? 'dragging' : ''} ${resizeState?.tileId === group.id ? 'resizing' : ''} ${columnAccentClass}`}
                style={{
                  position: 'absolute',
                  left: group.layout ? `${group.layout.x}px` : '0px',
                  top: group.layout ? `${group.layout.y}px` : '0px',
                  width: group.layout ? `${group.layout.w}px` : '424px',
                  height: group.layout ? `${group.layout.h}px` : '496px',
                  zIndex: dragState?.tileId === group.id ? 100 : (resizeState?.tileId === group.id ? 100 : 1),
                  transition: dragState?.tileId === group.id || resizeState?.tileId === group.id ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  ...customColorStyles,
                  ...(group.bgColor && group.bgColor !== 'none' ? {
                    background: ['cyan', 'violet', 'emerald', 'amber', 'rose'].includes(group.bgColor)
                      ? `rgba(${group.bgColor === 'cyan' ? '0,242,254' : group.bgColor === 'violet' ? '138,43,226' : group.bgColor === 'emerald' ? '16,185,129' : group.bgColor === 'amber' ? '245,158,11' : '244,63,94'}, 0.08)`
                      : (() => {
                          const hex = group.bgColor.replace('#', '');
                          const r = parseInt(hex.substring(0, 2), 16);
                          const g = parseInt(hex.substring(2, 4), 16);
                          const b = parseInt(hex.substring(4, 6), 16);
                          return `rgba(${r},${g},${b}, 0.08)`;
                        })()
                  } : {})
                } as React.CSSProperties}
              >
                <div 
                  className="column-header"
                  onMouseDown={isLayoutEditMode ? (e) => handleTileDragStart(e, group.id) : undefined}
                  style={{ cursor: isLayoutEditMode ? 'grab' : 'default' }}
                >
                  <div className="column-title-area">
                    {isLayoutEditMode ? (
                      <div className="column-grip edit-grip" title="Kachel verschieben">
                        <Icons.Move size={15} style={{ color: isStandardColor(group.color) ? `var(--accent-${group.color})` : group.color }} />
                      </div>
                    ) : (
                      <div className={`column-color-indicator ${isStandardColor(group.color) ? group.color : ''}`} style={{ backgroundColor: isStandardColor(group.color) ? `var(--accent-${group.color})` : group.color }} />
                    )}
                    <span className="column-title">{group.name}</span>
                    <span className="column-count">
                      {(!group.type || group.type === 'group') ? groupProjects.length : group.type === 'links' ? (group.links || []).length : 'Live'}
                    </span>
                  </div>
                  
                  <div className="column-actions">
                    {group.type !== 'monitoring' && !isLayoutEditMode && (
                      <button 
                        className="column-btn" 
                        onClick={() => {
                          if (!group.type || group.type === 'group') {
                            setDefaultGroupId(group.id);
                            setActiveProject(null);
                            setIsProjectModalOpen(true);
                          } else if (group.type === 'links') {
                            setActiveLinkTileId(group.id);
                            setActiveLink(null);
                            setIsLinkModalOpen(true);
                          }
                        }}
                        title={(!group.type || group.type === 'group') ? "Projekt in dieser Gruppe erstellen" : "Link hinzufügen"}
                      >
                        <Icons.Plus size={14} />
                      </button>
                    )}
                    {!isLayoutEditMode && (
                      <button 
                        className="column-btn" 
                        onClick={() => {
                          setActiveGroup(group);
                          setIsGroupModalOpen(true);
                        }}
                        title="Kachel bearbeiten"
                      >
                        <Icons.Settings size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid cards inside column */}
                <div 
                  className={`column-cards-container custom-scrollbar ${isLayoutEditMode ? 'pointer-events-none' : ''} ${activeDragOverGroupId === group.id ? 'drag-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedProjectId && (!group.type || group.type === 'group')) {
                      setActiveDragOverGroupId(group.id);
                    }
                  }}
                  onDragLeave={() => {
                    setActiveDragOverGroupId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setActiveDragOverGroupId(null);
                    const draggedProj = e.dataTransfer.getData('text/project');
                    if (draggedProj && (!group.type || group.type === 'group')) {
                      handleMoveProject(draggedProj, group.id);
                    }
                  }}
                >
                  {(!group.type || group.type === 'group') && (
                    groupProjects.length === 0 ? (
                      <div 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          height: '120px', 
                          color: 'var(--text-muted)',
                          border: '1px dashed rgba(255,255,255,0.05)',
                          borderRadius: '12px',
                          padding: '16px',
                          textAlign: 'center'
                        }}
                      >
                        <Icons.Layers size={20} style={{ marginBottom: '6px', opacity: 0.5 }} />
                        <span style={{ fontSize: '12px' }}>{t('noProjectsInGroup')}</span>
                      </div>
                    ) : (
                      groupProjects.map((project, index) => (
                        <div
                          key={project.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const draggedProj = e.dataTransfer.getData('text/project');
                            if (draggedProj && draggedProj !== project.id) {
                              handleMoveProject(draggedProj, group.id, index);
                            }
                          }}
                        >
                          <ProjectCard
                            project={project}
                            groupColor={group.color}
                            onEdit={(p) => {
                              setActiveProject(p);
                              setIsProjectModalOpen(true);
                            }}
                            onLaunch={handleLaunch}
                            onOpenFolder={handleOpenFolder}
                            onOpenIDE={handleOpenIDE}
                            onDragStart={() => setDraggedProjectId(project.id)}
                            onDragEnd={() => setDraggedProjectId(null)}
                            ides={ides}
                          />
                        </div>
                      ))
                    )
                  )}

                  {group.type === 'links' && (
                    <div className="links-grid custom-scrollbar">
                      {(() => {
                        const query = searchQuery.toLowerCase().trim();
                        const filteredLinks = (group.links || []).filter(link => {
                          if (!query) return true;
                          return (
                            link.name.toLowerCase().includes(query) ||
                            link.url.toLowerCase().includes(query)
                          );
                        });

                        if ((group.links || []).length === 0) {
                          return (
                            <div 
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '120px',
                                color: 'var(--text-muted)',
                                border: '1px dashed rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                padding: '16px',
                                textAlign: 'center'
                              }}
                            >
                              <Icons.ExternalLink size={20} style={{ marginBottom: '6px', opacity: 0.5 }} />
                              <span style={{ fontSize: '12px', marginBottom: '8px' }}>Keine Links hinzugefügt</span>
                              <button 
                                className="btn-custom-action" 
                                onClick={() => {
                                  setActiveLinkTileId(group.id);
                                  setActiveLink(null);
                                  setIsLinkModalOpen(true);
                                }}
                              >
                                + Link hinzufügen
                              </button>
                            </div>
                          );
                        }

                        if (filteredLinks.length === 0) {
                          return (
                            <div 
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '120px',
                                color: 'var(--text-muted)',
                                padding: '16px',
                                textAlign: 'center'
                              }}
                            >
                              <Icons.Search size={20} style={{ marginBottom: '6px', opacity: 0.5 }} />
                              <span style={{ fontSize: '12px' }}>Keine passenden Links</span>
                            </div>
                          );
                        }

                        return filteredLinks.map((link) => {
                          const IconComp = (Icons as any)[link.icon] || Icons.Globe;
                          return (
                            <div 
                              key={link.id} 
                              className={`link-card-wrapper ${isStandardColor(group.color) ? `accent-${group.color}` : 'accent-custom'}`}
                              style={isStandardColor(group.color) ? {} : {
                                '--accent-custom-color': group.color,
                                '--accent-custom-glow': group.color + '26'
                              } as React.CSSProperties}
                            >
                              <a 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="link-card-anchor"
                              >
                                <div 
                                  className="link-card-icon" 
                                  style={{ color: link.iconColor || (isStandardColor(group.color) ? undefined : group.color) }}
                                >
                                  <IconComp size={16} />
                                </div>
                                <div className="link-card-info">
                                  <span className="link-card-title">{link.name}</span>
                                  <span className="link-card-url">{link.url.replace(/^https?:\/\/(www\.)?/i, '')}</span>
                                </div>
                              </a>
                              <div className="link-card-actions">
                                <button 
                                  onClick={() => {
                                    setActiveLinkTileId(group.id);
                                    setActiveLink(link);
                                    setIsLinkModalOpen(true);
                                  }}
                                  className="btn-link-action"
                                  title="Link bearbeiten"
                                >
                                  <Icons.Edit2 size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      {(group.links || []).length > 0 && (
                        <button 
                          className="btn-secondary" 
                          style={{ width: '100%', padding: '8px', fontSize: '12px', justifyContent: 'center', marginTop: '4px', gap: '6px' }}
                          onClick={() => {
                            setActiveLinkTileId(group.id);
                            setActiveLink(null);
                            setIsLinkModalOpen(true);
                          }}
                        >
                          <Icons.Plus size={12} />
                          Link hinzufügen
                        </button>
                      )}
                    </div>
                  )}

                  {group.type === 'monitoring' && (
                    !monitoringData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', color: 'var(--text-muted)' }}>
                        <Icons.RefreshCw size={24} className="spin-icon" style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <span style={{ fontSize: '13px' }}>{t('metrics_loading')}</span>
                      </div>
                    ) : (
                      <div className="monitoring-panel">
                        {(group.monitoringSettings?.items || DEFAULT_MONITORING_ITEMS)
                          .filter(item => item.visible !== false)
                          .map(item => {
                            const IconComp = (Icons as any)[item.icon] || Icons.HelpCircle;
                            const itemColor = item.color === 'default' ? group.color : item.color;
                            
                            if (item.id === 'cpu-usage') {
                              return (
                                <div key={item.id} className="monitoring-item">
                                  <div className="monitoring-item-header">
                                    <div className="monitoring-item-label">
                                      <IconComp size={14} className="monitoring-icon-cpu" style={{ color: isStandardColor(itemColor) ? `var(--accent-${itemColor})` : itemColor }} />
                                      <span>{getMonitoringItemLabel(item.id, item.label)}</span>
                                    </div>
                                    <span className="monitoring-item-value">{monitoringData.cpu.usage}%</span>
                                  </div>
                                  <div className="monitoring-progress-track">
                                    <div 
                                      className={`monitoring-progress-bar ${isStandardColor(itemColor) ? `bg-${itemColor}` : ''}`} 
                                      style={{ 
                                        width: `${monitoringData.cpu.usage}%`,
                                        backgroundColor: isStandardColor(itemColor) ? undefined : itemColor,
                                        boxShadow: isStandardColor(itemColor) ? undefined : `0 0 8px ${itemColor}80`
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            }
                            if (item.id === 'cpu-temp') {
                              return (
                                <div key={item.id} className="monitoring-item">
                                  <div className="monitoring-item-header">
                                    <div className="monitoring-item-label">
                                      <IconComp size={14} className="monitoring-icon-temp" style={{ color: isStandardColor(itemColor) ? `var(--accent-${itemColor})` : itemColor }} />
                                      <span>{getMonitoringItemLabel(item.id, item.label)}</span>
                                    </div>
                                    <span className="monitoring-item-value">{monitoringData.cpu.temp !== null ? `${monitoringData.cpu.temp}°C` : 'N/A'}</span>
                                  </div>
                                  <div className="monitoring-progress-track">
                                    <div 
                                      className={`monitoring-progress-bar ${isStandardColor(itemColor) ? `bg-${itemColor}` : ''}`} 
                                      style={{ 
                                        width: `${monitoringData.cpu.temp !== null ? Math.min(100, (monitoringData.cpu.temp / 95) * 100) : 0}%`,
                                        backgroundColor: isStandardColor(itemColor) ? undefined : itemColor,
                                        boxShadow: isStandardColor(itemColor) ? undefined : `0 0 8px ${itemColor}80`
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            }
                            if (item.id === 'gpu-usage') {
                              return (
                                <div key={item.id} className="monitoring-item">
                                  <div className="monitoring-item-header">
                                    <div className="monitoring-item-label">
                                      <IconComp size={14} className="monitoring-icon-gpu" style={{ color: isStandardColor(itemColor) ? `var(--accent-${itemColor})` : itemColor }} />
                                      <span>{getMonitoringItemLabel(item.id, item.label)}</span>
                                    </div>
                                    <span className="monitoring-item-value">{monitoringData.gpu.usage !== null ? `${monitoringData.gpu.usage}%` : '0%'}</span>
                                  </div>
                                  <div className="monitoring-progress-track">
                                    <div 
                                      className={`monitoring-progress-bar ${isStandardColor(itemColor) ? `bg-${itemColor}` : ''}`} 
                                      style={{ 
                                        width: `${monitoringData.gpu.usage !== null ? monitoringData.gpu.usage : 0}%`,
                                        backgroundColor: isStandardColor(itemColor) ? undefined : itemColor,
                                        boxShadow: isStandardColor(itemColor) ? undefined : `0 0 8px ${itemColor}80`
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            }
                            if (item.id === 'gpu-temp') {
                              return (
                                <div key={item.id} className="monitoring-item">
                                  <div className="monitoring-item-header">
                                    <div className="monitoring-item-label">
                                      <IconComp size={14} className="monitoring-icon-temp-gpu" style={{ color: isStandardColor(itemColor) ? `var(--accent-${itemColor})` : itemColor }} />
                                      <span>{getMonitoringItemLabel(item.id, item.label)}</span>
                                    </div>
                                    <span className="monitoring-item-value">{monitoringData.gpu.temp !== null ? `${monitoringData.gpu.temp}°C` : 'N/A'}</span>
                                  </div>
                                  <div className="monitoring-progress-track">
                                    <div 
                                      className={`monitoring-progress-bar ${isStandardColor(itemColor) ? `bg-${itemColor}` : ''}`} 
                                      style={{ 
                                        width: `${monitoringData.gpu.temp !== null ? Math.min(100, (monitoringData.gpu.temp / 95) * 100) : 0}%`,
                                        backgroundColor: isStandardColor(itemColor) ? undefined : itemColor,
                                        boxShadow: isStandardColor(itemColor) ? undefined : `0 0 8px ${itemColor}80`
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            }
                            if (item.id === 'ram-usage') {
                              return (
                                <div key={item.id} className="monitoring-item">
                                  <div className="monitoring-item-header">
                                    <div className="monitoring-item-label">
                                      <IconComp size={14} className="monitoring-icon-ram" style={{ color: isStandardColor(itemColor) ? `var(--accent-${itemColor})` : itemColor }} />
                                      <span>{getMonitoringItemLabel(item.id, item.label)}</span>
                                    </div>
                                    <span className="monitoring-item-value">
                                      {monitoringData.ram.used} / {monitoringData.ram.total} {monitoringData.ram.unit}
                                    </span>
                                  </div>
                                  <div className="monitoring-progress-track">
                                    <div 
                                      className={`monitoring-progress-bar ${isStandardColor(itemColor) ? `bg-${itemColor}` : ''}`} 
                                      style={{ 
                                        width: `${(monitoringData.ram.used / monitoringData.ram.total) * 100}%`,
                                        backgroundColor: isStandardColor(itemColor) ? undefined : itemColor,
                                        boxShadow: isStandardColor(itemColor) ? undefined : `0 0 8px ${itemColor}80`
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            }
                            if (item.id === 'disk-usage') {
                              return (
                                <div key={item.id} className="monitoring-item">
                                  <div className="monitoring-item-header">
                                    <div className="monitoring-item-label">
                                      <IconComp size={14} className="monitoring-icon-disk" style={{ color: isStandardColor(itemColor) ? `var(--accent-${itemColor})` : itemColor }} />
                                      <span>{getMonitoringItemLabel(item.id, item.label)}</span>
                                    </div>
                                    <span className="monitoring-item-value">
                                      {monitoringData.disk.used} / {monitoringData.disk.total} {monitoringData.disk.unit}
                                    </span>
                                  </div>
                                  <div className="monitoring-progress-track">
                                    <div 
                                      className={`monitoring-progress-bar ${isStandardColor(itemColor) ? `bg-${itemColor}` : ''}`} 
                                      style={{ 
                                        width: `${(monitoringData.disk.used / monitoringData.disk.total) * 100}%`,
                                        backgroundColor: isStandardColor(itemColor) ? undefined : itemColor,
                                        boxShadow: isStandardColor(itemColor) ? undefined : `0 0 8px ${itemColor}80`
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            }
                            if (item.id === 'network-traffic') {
                              return (
                                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', paddingLeft: '4px' }}>
                                    <IconComp size={14} style={{ color: isStandardColor(itemColor) ? `var(--accent-${itemColor})` : itemColor }} />
                                    <span>{getMonitoringItemLabel(item.id, item.label)}</span>
                                  </div>
                                  <div className="monitoring-network-panel" style={{ marginTop: 0 }}>
                                    <div className="monitoring-net-speed">
                                      <Icons.ArrowDownCircle size={15} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                                      <div className="monitoring-net-details">
                                        <span className="monitoring-net-label">{t('metrics_net_download')}</span>
                                        <span className="monitoring-net-val">{monitoringData.network.download}</span>
                                      </div>
                                    </div>
                                    <div className="monitoring-net-speed">
                                      <Icons.ArrowUpCircle size={15} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                                      <div className="monitoring-net-details">
                                        <span className="monitoring-net-label">{t('metrics_net_upload')}</span>
                                        <span className="monitoring-net-val">{monitoringData.network.upload}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                      </div>
                    )
                  )}
                </div>

                {isLayoutEditMode && (
                  <div 
                    className="tile-resize-handle"
                    onMouseDown={(e) => handleTileResizeStart(e, group.id)}
                    title="Kachelgröße anpassen"
                  >
                    <Icons.CornerDownRight size={14} style={{ color: isStandardColor(group.color) ? `var(--accent-${group.color})` : group.color }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Group Create/Edit Modal */}
      <GroupModal
        isOpen={isGroupModalOpen}
        group={activeGroup}
        onClose={() => {
          setIsGroupModalOpen(false);
          setActiveGroup(null);
        }}
        onSave={handleSaveGroup}
        onDelete={handleDeleteGroup}
      />

      {/* Project Create/Edit Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        project={activeProject}
        groups={groups}
        defaultGroupId={defaultGroupId}
        onClose={() => {
          setIsProjectModalOpen(false);
          setActiveProject(null);
          setDefaultGroupId(undefined);
        }}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
        ides={ides}
      />

      {/* Link Create/Edit Modal */}
      <LinkModal
        isOpen={isLinkModalOpen}
        link={activeLink}
        onClose={() => {
          setIsLinkModalOpen(false);
          setActiveLink(null);
          setActiveLinkTileId(null);
        }}
        onSave={handleSaveLink}
        onDelete={handleDeleteLink}
      />

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        preferredTerminal={preferredTerminal}
        ides={ides}
        availableTerminals={availableTerminals}
        currentFontTitle={fontTitle}
        currentFontText={fontText}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
      />

      {/* Profile Switcher Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        activeProfile={activeProfile}
        onClose={() => setIsProfileModalOpen(false)}
        onSelectProfile={handleSelectProfile}
        onCreateProfile={handleCreateProfile}
        onRenameProfile={handleRenameProfile}
        onDeleteProfile={handleDeleteProfile}
      />
    </div>
  );
}

export default App;
