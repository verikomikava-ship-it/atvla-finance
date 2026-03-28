import React, { useState, useMemo } from 'react';
import { AppState, Project } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Plus, X, Check, Pencil, ChevronDown, ChevronUp, Package, Repeat, Trash2 } from 'lucide-react';

const COMPACT_INPUT = 'h-8 text-xs';
const COMPACT_BTN = 'h-7 text-[11px]';

interface ProjectsManagerProps {
  state: AppState;
  onAddProject: (name: string, description?: string) => void;
  onRemoveProject: (id: number) => void;
  onEditProject: (id: number, updates: Partial<Project>) => void;
  onAddInventoryItem: (projectId: number, name: string, cost: number) => void;
  onRemoveInventoryItem: (projectId: number, itemId: number) => void;
  onToggleInventoryPurchased: (projectId: number, itemId: number) => void;
  onAddMonthlyCost: (projectId: number, name: string, amount: number) => void;
  onRemoveMonthlyCost: (projectId: number, costId: number) => void;
  onLinkProjectToGoal: (projectId: number | null) => void;
  goalProjectId?: number;
}

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({
  state,
  onAddProject,
  onRemoveProject,
  onEditProject,
  onAddInventoryItem,
  onRemoveInventoryItem,
  onToggleInventoryPurchased,
  onAddMonthlyCost,
  onRemoveMonthlyCost,
  onLinkProjectToGoal,
  goalProjectId,
}) => {
  // ახალი პროექტის ფორმა
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // ინვენტარის დამატება
  const [addingInventoryFor, setAddingInventoryFor] = useState<number | null>(null);
  const [invName, setInvName] = useState('');
  const [invCost, setInvCost] = useState('');

  // ყოველთვიური ხარჯის დამატება
  const [addingMonthlyFor, setAddingMonthlyFor] = useState<number | null>(null);
  const [monthlyName, setMonthlyName] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');

  // გახსნილი პროექტი
  const [expandedProject, setExpandedProject] = useState<number | null>(null);

  // რედაქტირება
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const projects = useMemo(() => state.projects || [], [state.projects]);
  const activeProjects = useMemo(() => projects.filter(p => p.active), [projects]);
  const archivedProjects = useMemo(() => projects.filter(p => !p.active), [projects]);

  const [showArchived, setShowArchived] = useState(false);

  const handleAddProject = () => {
    if (!newName.trim()) return;
    onAddProject(newName.trim(), newDesc.trim() || undefined);
    setNewName('');
    setNewDesc('');
    setShowAddForm(false);
  };

  const handleAddInventory = (projectId: number) => {
    if (!invName.trim() || !invCost) return;
    onAddInventoryItem(projectId, invName.trim(), parseFloat(invCost));
    setInvName('');
    setInvCost('');
    setAddingInventoryFor(null);
  };

  const handleAddMonthly = (projectId: number) => {
    if (!monthlyName.trim() || !monthlyAmount) return;
    onAddMonthlyCost(projectId, monthlyName.trim(), parseFloat(monthlyAmount));
    setMonthlyName('');
    setMonthlyAmount('');
    setAddingMonthlyFor(null);
  };

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDesc(p.description || '');
  };

  const saveEdit = () => {
    if (editingId === null || !editName.trim()) return;
    onEditProject(editingId, { name: editName.trim(), description: editDesc.trim() || undefined });
    setEditingId(null);
  };

  const getProjectTotals = (p: Project) => {
    const inventoryTotal = p.inventoryItems.reduce((s, i) => s + i.cost, 0);
    const inventoryPurchased = p.inventoryItems.filter(i => i.purchased).reduce((s, i) => s + i.cost, 0);
    const monthlyTotal = p.monthlyCosts.reduce((s, c) => s + c.amount, 0);
    return { inventoryTotal, inventoryPurchased, monthlyTotal };
  };

  const renderProjectCard = (project: Project) => {
    const isExpanded = expandedProject === project.id;
    const isEditing = editingId === project.id;
    const { inventoryTotal, inventoryPurchased, monthlyTotal } = getProjectTotals(project);
    const purchaseProgress = inventoryTotal > 0 ? (inventoryPurchased / inventoryTotal) * 100 : 0;
    const isLinkedToGoal = goalProjectId === project.id;

    const totalKulaba = Object.values(state.db).reduce((s, d) => s + (d.kulaba || 0), 0);
    const kulabaProgress = inventoryTotal > 0 ? Math.min((totalKulaba / inventoryTotal) * 100, 100) : 0;

    return (
      <Card key={project.id} className={cn(
        'border transition-all duration-200',
        isLinkedToGoal
          ? 'border-amber-400 dark:border-amber-500 ring-1 ring-amber-300 dark:ring-amber-600'
          : project.active
            ? 'border-indigo-200 dark:border-indigo-700/50'
            : 'border-slate-200 dark:border-slate-700 opacity-60'
      )}>
        <CardContent className="p-3 space-y-2">
          {/* ჰედერი */}
          {isEditing ? (
            <div className="space-y-1.5">
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className={COMPACT_INPUT}
                placeholder="პროექტის სახელი"
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
              />
              <Input
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className={COMPACT_INPUT}
                placeholder="აღწერა (არასავალდებულო)"
              />
              <div className="flex gap-1">
                <Button size="sm" className={cn(COMPACT_BTN, 'bg-green-600 hover:bg-green-700')} onClick={saveEdit}>
                  <Check className="w-3 h-3 mr-1" /> შენახვა
                </Button>
                <Button size="sm" variant="outline" className={COMPACT_BTN} onClick={() => setEditingId(null)}>
                  გაუქმება
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <button
                onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏗️</span>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{project.name}</h3>
                    {project.description && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{project.description}</p>
                    )}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(project)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                  <Pencil className="w-3 h-3 text-slate-400" />
                </button>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
          )}

          {/* სამარი — ყოველთვის ჩანს */}
          {!isEditing && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 text-center">
                  <div className="text-indigo-600 dark:text-indigo-400 font-bold">📦 ინვენტარი</div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{inventoryTotal.toLocaleString()}₾</div>
                  {inventoryTotal > 0 && (
                    <Progress value={purchaseProgress} className="h-1 mt-1" />
                  )}
                  <div className="text-slate-500 mt-0.5">
                    ნაყიდი: {inventoryPurchased.toLocaleString()}₾
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
                  <div className="text-amber-600 dark:text-amber-400 font-bold">🔄 ყოველთვიური</div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{monthlyTotal.toLocaleString()}₾</div>
                  <div className="text-slate-500 mt-0.5">
                    {project.monthlyCosts.length} ხარჯი
                  </div>
                </div>
              </div>

              {/* კულაბა → პროექტი progress */}
              {isLinkedToGoal && inventoryTotal > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1.5 text-[10px]">
                    <span className="text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
                      🎯 კულაბა → {project.name}
                    </span>
                    <span className="font-black text-amber-700 dark:text-amber-300">
                      {Math.round(kulabaProgress)}%
                    </span>
                  </div>
                  <div className="h-2 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500"
                      style={{ width: `${kulabaProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-amber-600 dark:text-amber-400">
                    <span>🏺 {totalKulaba.toLocaleString()}₾ შენახული</span>
                    <span>მიზანი: {inventoryTotal.toLocaleString()}₾</span>
                  </div>
                </div>
              )}

              {/* "მიზნად დაყენება" / "გათიშვა" ღილაკი */}
              {project.active && (
                <button
                  onClick={() => onLinkProjectToGoal(isLinkedToGoal ? null : project.id)}
                  className={cn(
                    'w-full text-[10px] font-bold py-1.5 rounded-lg border transition-all',
                    isLinkedToGoal
                      ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-300 hover:text-amber-600'
                  )}
                >
                  {isLinkedToGoal ? '⭐ მიზანი — გათიშვა' : '🎯 მიზნად დაყენება'}
                </button>
              )}
            </div>
          )}

          {/* გახსნილი დეტალები */}
          {isExpanded && !isEditing && (
            <div className="space-y-3 pt-1">
              {/* ===== ინვენტარი ===== */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Package className="w-3 h-3" /> ინვენტარი / ერთჯერადი ხარჯები
                  </h4>
                  <button
                    onClick={() => {
                      setAddingInventoryFor(addingInventoryFor === project.id ? null : project.id);
                      setAddingMonthlyFor(null);
                    }}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> დამატება
                  </button>
                </div>

                {/* დამატების ფორმა */}
                {addingInventoryFor === project.id && (
                  <div className="flex gap-1 mb-2">
                    <Input
                      value={invName}
                      onChange={e => setInvName(e.target.value)}
                      className={cn(COMPACT_INPUT, 'flex-1')}
                      placeholder="მაგ: მაცივარი"
                      onKeyDown={e => e.key === 'Enter' && handleAddInventory(project.id)}
                    />
                    <Input
                      type="number"
                      value={invCost}
                      onChange={e => setInvCost(e.target.value)}
                      className={cn(COMPACT_INPUT, 'w-24')}
                      placeholder="₾"
                      onKeyDown={e => e.key === 'Enter' && handleAddInventory(project.id)}
                    />
                    <Button size="sm" className={cn(COMPACT_BTN, 'bg-indigo-600')} onClick={() => handleAddInventory(project.id)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {/* ინვენტარის სია */}
                {project.inventoryItems.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">ჯერ არაფერი დამატებული</p>
                ) : (
                  <div className="space-y-1">
                    {project.inventoryItems.map(item => (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1 rounded-lg text-xs',
                          item.purchased
                            ? 'bg-green-50 dark:bg-green-900/20 line-through opacity-60'
                            : 'bg-slate-50 dark:bg-slate-800'
                        )}
                      >
                        <button
                          onClick={() => onToggleInventoryPurchased(project.id, item.id)}
                          className={cn(
                            'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center',
                            item.purchased
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          )}
                        >
                          {item.purchased && <Check className="w-3 h-3" />}
                        </button>
                        <span className="flex-1">{item.name}</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">{item.cost.toLocaleString()}₾</span>
                        <button
                          onClick={() => onRemoveInventoryItem(project.id, item.id)}
                          className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          <X className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ===== ყოველთვიური ხარჯები ===== */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Repeat className="w-3 h-3" /> ყოველთვიური ხარჯები
                  </h4>
                  <button
                    onClick={() => {
                      setAddingMonthlyFor(addingMonthlyFor === project.id ? null : project.id);
                      setAddingInventoryFor(null);
                    }}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> დამატება
                  </button>
                </div>

                {/* დამატების ფორმა */}
                {addingMonthlyFor === project.id && (
                  <div className="flex gap-1 mb-2">
                    <Input
                      value={monthlyName}
                      onChange={e => setMonthlyName(e.target.value)}
                      className={cn(COMPACT_INPUT, 'flex-1')}
                      placeholder="მაგ: ქირა"
                      onKeyDown={e => e.key === 'Enter' && handleAddMonthly(project.id)}
                    />
                    <Input
                      type="number"
                      value={monthlyAmount}
                      onChange={e => setMonthlyAmount(e.target.value)}
                      className={cn(COMPACT_INPUT, 'w-24')}
                      placeholder="₾/თვე"
                      onKeyDown={e => e.key === 'Enter' && handleAddMonthly(project.id)}
                    />
                    <Button size="sm" className={cn(COMPACT_BTN, 'bg-amber-600')} onClick={() => handleAddMonthly(project.id)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {/* ყოველთვიური ხარჯების სია */}
                {project.monthlyCosts.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">ჯერ არაფერი დამატებული</p>
                ) : (
                  <div className="space-y-1">
                    {project.monthlyCosts.map(cost => (
                      <div
                        key={cost.id}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-800"
                      >
                        <span className="text-amber-500">🔄</span>
                        <span className="flex-1">{cost.name}</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">{cost.amount.toLocaleString()}₾/თვე</span>
                        <button
                          onClick={() => onRemoveMonthlyCost(project.id, cost.id)}
                          className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          <X className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ===== სამარი ბლოკი ===== */}
              <div className="bg-gradient-to-r from-indigo-50 to-amber-50 dark:from-indigo-900/20 dark:to-amber-900/20 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">📦 ინვენტარი სულ:</span>
                  <span className="font-bold">{getProjectTotals(project).inventoryTotal.toLocaleString()}₾</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">✅ ნაყიდი:</span>
                  <span className="font-bold text-green-600">{getProjectTotals(project).inventoryPurchased.toLocaleString()}₾</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">⏳ დარჩენილი:</span>
                  <span className="font-bold text-red-600">{(getProjectTotals(project).inventoryTotal - getProjectTotals(project).inventoryPurchased).toLocaleString()}₾</span>
                </div>
                <hr className="border-slate-200 dark:border-slate-700" />
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">🔄 ყოველთვიური:</span>
                  <span className="font-bold text-amber-600">{getProjectTotals(project).monthlyTotal.toLocaleString()}₾/თვე</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">📅 წლიური:</span>
                  <span className="font-bold text-purple-600">{(getProjectTotals(project).monthlyTotal * 12).toLocaleString()}₾/წელი</span>
                </div>
                <hr className="border-slate-200 dark:border-slate-700" />
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">💰 გახსნის ჯამური ხარჯი:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {(getProjectTotals(project).inventoryTotal + getProjectTotals(project).monthlyTotal).toLocaleString()}₾
                  </span>
                </div>
              </div>

              {/* მოქმედებები */}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(COMPACT_BTN, 'flex-1', project.active ? 'text-slate-600' : 'text-green-600')}
                  onClick={() => onEditProject(project.id, { active: !project.active })}
                >
                  {project.active ? '📁 არქივში გადატანა' : '♻️ აღდგენა'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(COMPACT_BTN, 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20')}
                  onClick={() => {
                    if (window.confirm(`წავშალო პროექტი "${project.name}"?`)) {
                      onRemoveProject(project.id);
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ყველა აქტიური პროექტის ჯამი
  const grandTotals = useMemo(() => {
    let invTotal = 0, invPurchased = 0, monthlyTotal = 0;
    for (const p of activeProjects) {
      const t = getProjectTotals(p);
      invTotal += t.inventoryTotal;
      invPurchased += t.inventoryPurchased;
      monthlyTotal += t.monthlyTotal;
    }
    return { invTotal, invPurchased, monthlyTotal };
  }, [activeProjects]);

  return (
    <div className="space-y-3">
      {/* ჰედერი + ჯამი */}
      {activeProjects.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-3 text-white">
          <div className="text-[10px] opacity-80 mb-1">🏗️ ჩემი პროექტები — ჯამი</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] opacity-70">ინვენტარი</div>
              <div className="font-bold text-sm">{grandTotals.invTotal.toLocaleString()}₾</div>
            </div>
            <div>
              <div className="text-[10px] opacity-70">ნაყიდი</div>
              <div className="font-bold text-sm text-green-300">{grandTotals.invPurchased.toLocaleString()}₾</div>
            </div>
            <div>
              <div className="text-[10px] opacity-70">ყოველთვ.</div>
              <div className="font-bold text-sm text-amber-300">{grandTotals.monthlyTotal.toLocaleString()}₾</div>
            </div>
          </div>
        </div>
      )}

      {/* ახალი პროექტის დამატება */}
      {showAddForm ? (
        <Card className="border-2 border-dashed border-indigo-300 dark:border-indigo-700">
          <CardContent className="p-3 space-y-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className={COMPACT_INPUT}
              placeholder="პროექტის სახელი (მაგ: საცხობი)"
              onKeyDown={e => e.key === 'Enter' && handleAddProject()}
              autoFocus
            />
            <Input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className={COMPACT_INPUT}
              placeholder="აღწერა (არასავალდებულო)"
            />
            <div className="flex gap-1">
              <Button size="sm" className={cn(COMPACT_BTN, 'flex-1 bg-indigo-600 hover:bg-indigo-700')} onClick={handleAddProject}>
                <Plus className="w-3 h-3 mr-1" /> შექმნა
              </Button>
              <Button size="sm" variant="outline" className={COMPACT_BTN} onClick={() => setShowAddForm(false)}>
                გაუქმება
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          size="sm"
          className={cn(COMPACT_BTN, 'w-full bg-indigo-600 hover:bg-indigo-700')}
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-3 h-3 mr-1" /> ახალი პროექტი
        </Button>
      )}

      {/* აქტიური პროექტები */}
      {activeProjects.length === 0 && !showAddForm && (
        <div className="text-center py-6 text-slate-400">
          <div className="text-3xl mb-2">🏗️</div>
          <p className="text-xs">ჯერ არცერთი პროექტი არ დაგიმატებია</p>
          <p className="text-[10px] mt-1">დაამატე პროექტი და დაითვალე რამდენი დაგჯირდება</p>
        </div>
      )}

      {activeProjects.map(p => renderProjectCard(p))}

      {/* არქივირებული */}
      {archivedProjects.length > 0 && (
        <>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 w-full justify-center"
          >
            {showArchived ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            არქივი ({archivedProjects.length})
          </button>
          {showArchived && archivedProjects.map(p => renderProjectCard(p))}
        </>
      )}
    </div>
  );
};
