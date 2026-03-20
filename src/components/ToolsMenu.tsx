import React, { useState, useRef, useCallback, useEffect } from 'react';
import { exportData, importData } from '../utils/storage';
import { AppState } from '../types';
import { Settings, Save, FolderOpen, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolsMenuProps {
  state: AppState;
  onImport: (state: AppState) => void;
  onReset: () => void;
  onRerunSetup: () => void;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({ state, onImport, onReset, onRerunSetup }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('tools_menu_pos');
      if (saved) return JSON.parse(saved) as { x: number; y: number };
    } catch { /* ignore */ }
    return { x: window.innerWidth - 60, y: window.innerHeight - 60 };
  });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const clamp = useCallback((x: number, y: number) => {
    const size = 48;
    return {
      x: Math.max(0, Math.min(x, window.innerWidth - size)),
      y: Math.max(0, Math.min(y, window.innerHeight - size)),
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    hasMoved.current = false;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    hasMoved.current = true;
    const clamped = clamp(e.clientX - offset.current.x, e.clientY - offset.current.y);
    setPos(clamped);
  }, [clamp]);

  const onPointerUp = useCallback(() => {
    if (dragging.current && hasMoved.current) {
      setPos((p) => {
        localStorage.setItem('tools_menu_pos', JSON.stringify(p));
        return p;
      });
    }
    if (!hasMoved.current) {
      setIsOpen((o) => !o);
    }
    dragging.current = false;
  }, []);

  // ფანჯრის resize-ზე საზღვრებში დარჩენა
  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        importData(
          file,
          (importedState) => {
            onImport(importedState);
            setIsOpen(false);
            alert('მონაცემები აღდგენილია!');
          },
          (error) => alert(error)
        );
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (window.confirm('ნიშ დაადასტურო - ყველა მონაცემი წაიშლება!')) {
      if (window.confirm('ბოლოშ დაადასტურო')) {
        onReset();
        setIsOpen(false);
        alert('ყველაფერი წაიშალა');
      }
    }
  };

  // მენიუს პოზიცია - ღილაკთან მიმართებით
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 50,
    ...(pos.y > window.innerHeight / 2
      ? { bottom: window.innerHeight - pos.y + 8 }
      : { top: pos.y + 56 }),
    ...(pos.x > window.innerWidth / 2
      ? { right: window.innerWidth - pos.x - 48 }
      : { left: pos.x }),
  };

  return (
    <>
      <button
        ref={btnRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-black flex items-center justify-center transition-shadow shadow-lg select-none touch-none"
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 50,
          cursor: dragging.current ? 'grabbing' : 'grab',
        }}
      >
        <Settings className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          style={menuStyle}
          className="flex flex-col gap-2 bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl"
        >
          <Button
            variant="success"
            onClick={() => {
              exportData(state);
              setIsOpen(false);
              alert('მონაცემები დამახსოვრებულია!');
            }}
            className="whitespace-nowrap text-sm"
          >
            <Save className="h-4 w-4 mr-2" />
            დამახსოვრება
          </Button>

          <Button
            variant="default"
            onClick={handleImport}
            className="whitespace-nowrap text-sm"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            აღდგენა
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              onRerunSetup();
              setIsOpen(false);
            }}
            className="whitespace-nowrap text-sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            ინსტალაცია
          </Button>

          <Button
            variant="destructive"
            onClick={handleReset}
            className="whitespace-nowrap text-sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            რესეტი
          </Button>
        </div>
      )}
    </>
  );
};
