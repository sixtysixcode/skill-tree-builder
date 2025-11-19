import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShareTreeModal } from '../app/components/ShareTreeModal';

const baseProps: React.ComponentProps<typeof ShareTreeModal> = {
  visible: true,
  shareLink: 'https://example.com/tree/1',
  treeId: 'tree-1',
  shareCopied: false,
  hasTreePassword: false,
  newPasswordInput: '',
  passwordSaving: false,
  passwordMessage: null,
  lastSharedPassword: null,
  onCopyLink: vi.fn(),
  onChangePasswordInput: vi.fn(),
  onUpdatePassword: vi.fn(),
  onRemovePassword: vi.fn(),
  onClose: vi.fn(),
};

describe('ShareTreeModal', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<ShareTreeModal {...baseProps} visible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('fires callbacks for copy, password update, and close actions', () => {
    const props = { ...baseProps };
    render(<ShareTreeModal {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(props.onCopyLink).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/set optional password/i), { target: { value: 'secret' } });
    expect(props.onChangePasswordInput).toHaveBeenCalledWith('secret');

    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(props.onUpdatePassword).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('enables remove password button when a password exists', () => {
    const props = {
      ...baseProps,
      hasTreePassword: true,
    };
    render(<ShareTreeModal {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /remove password/i }));
    expect(props.onRemovePassword).toHaveBeenCalled();
  });
});
