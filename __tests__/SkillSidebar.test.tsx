import { fireEvent, render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

import { SkillSidebar } from '../app/components/SkillSidebar';

const setupSidebar = (overrides?: Partial<React.ComponentProps<typeof SkillSidebar>>) => {
  const props: React.ComponentProps<typeof SkillSidebar> = {
    treeId: 'tree-1',
    treeTitle: 'My Tree',
    onTreeTitleChange: vi.fn(),
    name: '',
    description: '',
    cost: '',
    level: '',
    searchQuery: '',
    placeMode: false,
    autoConnect: false,
    hasSelection: false,
    hasSelectedNodes: false,
    onNameChange: vi.fn(),
    onDescriptionChange: vi.fn(),
    onCostChange: vi.fn(),
    onLevelChange: vi.fn(),
    onSearchChange: vi.fn(),
    onTogglePlaceMode: vi.fn(),
    onAddAtCenter: vi.fn(),
    onDeleteSelected: vi.fn(),
    onDetachSelected: vi.fn(),
    onToggleAutoConnect: vi.fn(),
    onResetTree: vi.fn(),
    canResetTree: true,
    onOpenShareModal: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };

  render(<SkillSidebar {...props} />);
  return props;
};

describe('SkillSidebar', () => {
  it('blocks place mode toggle when name or description missing', () => {
    const props = setupSidebar();
    fireEvent.click(screen.getByRole('button', { name: /add \(click to place\)/i }));
    expect(props.onTogglePlaceMode).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('allows place mode toggle when inputs valid', () => {
    const props = setupSidebar({ name: 'Skill', description: 'Desc' });
    fireEvent.click(screen.getByRole('button', { name: /click to place/i }));
    expect(props.onTogglePlaceMode).toHaveBeenCalledTimes(1);
  });

  it('strips non-digit characters from cost/level inputs', () => {
    const onCostChange = vi.fn();
    const onLevelChange = vi.fn();
    setupSidebar({ onCostChange, onLevelChange });

    fireEvent.change(screen.getByPlaceholderText('e.g. 2'), { target: { value: '12abc' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 3'), { target: { value: '9!@#' } });

    expect(onCostChange).toHaveBeenCalledWith('12');
    expect(onLevelChange).toHaveBeenCalledWith('9');
  });
});
