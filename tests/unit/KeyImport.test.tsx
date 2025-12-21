import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyImport from '../../src/components/KeyImport';
import type { ElectronAPI, IPCResponse, SSHKeyPair } from '../../src/types/electron.d';

const setupElectron = () => {
  const showOpenDialog = vi.fn();
  const sshImport = vi.fn();
  (window as unknown as { electronAPI?: ElectronAPI }).electronAPI = {
    showOpenDialog: showOpenDialog,
    sshKeys: {
      import: sshImport,
    },
  } as unknown as ElectronAPI;
  return { showOpenDialog, sshImport };
};

describe('KeyImport Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Ensure a clean electronAPI per test
    delete (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
  });

  it('renders without crashing and shows fields', () => {
    setupElectron();
    render(<KeyImport />);
    expect(screen.getByText('Import SSH Key')).toBeTruthy();
    expect(screen.getByText('Key Name (optional)')).toBeTruthy();
    expect(screen.getByText('Passphrase (if encrypted)')).toBeTruthy();
    expect(screen.getByText('Private Key File')).toBeTruthy();
    expect(screen.getByText('Public Key File (optional)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import Key' })).toBeTruthy();
  });

  it('disables Import Key button when no private key selected', async () => {
    setupElectron();
    render(<KeyImport />);
    const importBtn = screen.getByRole('button', { name: 'Import Key' });
    expect(importBtn).toBeDisabled();
  });

  it('picks private key via dialog and enables Import button', async () => {
    const { showOpenDialog } = setupElectron();
    render(<KeyImport />);
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['C:/keys/id_rsa.pem'] });

    const browseButtons = screen.getAllByRole('button', { name: 'Browse' });
    // First Browse is for private key
    await userEvent.click(browseButtons[0]);

    // Private path should be reflected and button enabled
    expect(screen.getByDisplayValue('C:/keys/id_rsa.pem')).toBeTruthy();
    const importBtn = screen.getByRole('button', { name: 'Import Key' });
    expect(importBtn).not.toBeDisabled();
  });

  it('picks public key via dialog and sets value', async () => {
    const { showOpenDialog } = setupElectron();
    render(<KeyImport />);
    // First call private, second call public
    showOpenDialog
      .mockResolvedValueOnce({ canceled: false, filePaths: ['C:/keys/id_rsa.pem'] })
      .mockResolvedValueOnce({ canceled: false, filePaths: ['C:/keys/id_rsa.pub'] });

    const browseButtons = screen.getAllByRole('button', { name: 'Browse' });
    await userEvent.click(browseButtons[0]);
    await userEvent.click(browseButtons[1]);

    expect(screen.getByDisplayValue('C:/keys/id_rsa.pub')).toBeTruthy();
  });

  it('handles canceled dialog (no change to path)', async () => {
    const { showOpenDialog } = setupElectron();
    render(<KeyImport />);
    showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    const browseButtons = screen.getAllByRole('button', { name: 'Browse' });
    await userEvent.click(browseButtons[0]);

    // No value should be set when canceled
    const privateInput = screen.getByPlaceholderText('Select private key (.pem, .ppk, .key)') as HTMLInputElement;
    expect(privateInput.value).toBe('');
  });

  it('shows error when Electron API is not available', async () => {
    render(<KeyImport />);
    const browseButtons = screen.getAllByRole('button', { name: 'Browse' });
    await userEvent.click(browseButtons[0]);
    expect(screen.getByText('Electron API not available')).toBeTruthy();
  });

  it('calls import API with correct payload (name trimmed, defaults when empty)', async () => {
    const { showOpenDialog, sshImport } = setupElectron();
    render(<KeyImport />);
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['C:/keys/id_rsa.pem'] });

    // Set name with extra spaces and passphrase
    const nameInput = screen.getByPlaceholderText('my-imported-key');
    await userEvent.type(nameInput, '  my-key  ');
    const passInput = screen.getByPlaceholderText('optional');
    await userEvent.type(passInput, 'secret');

    // Pick private key
    const browseButtons = screen.getAllByRole('button', { name: 'Browse' });
    await userEvent.click(browseButtons[0]);

    sshImport.mockResolvedValue({ success: true, data: { name: 'my-key', type: 'rsa', bits: 2048 } });
    await userEvent.click(screen.getByRole('button', { name: 'Import Key' }));

    expect(sshImport).toHaveBeenCalledWith({
      name: 'my-key',
      privateKeyPath: 'C:/keys/id_rsa.pem',
      publicKeyPath: undefined,
      passphrase: 'secret',
    });
    expect(await screen.findByText('Imported Key')).toBeTruthy();
  });

  it('defaults name to "imported-key" when empty', async () => {
    const { showOpenDialog, sshImport } = setupElectron();
    render(<KeyImport />);
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['C:/keys/id_rsa.pem'] });
    await userEvent.click(screen.getAllByRole('button', { name: 'Browse' })[0]);
    sshImport.mockResolvedValue({ success: true, data: { name: 'imported-key', type: 'rsa' } });
    await userEvent.click(screen.getByRole('button', { name: 'Import Key' }));
    expect(sshImport).toHaveBeenCalledWith({
      name: 'imported-key',
      privateKeyPath: 'C:/keys/id_rsa.pem',
      publicKeyPath: undefined,
      passphrase: undefined,
    });
  });

  it('includes publicKeyPath when provided', async () => {
    const { showOpenDialog, sshImport } = setupElectron();
    render(<KeyImport />);
    // Private then public
    showOpenDialog
      .mockResolvedValueOnce({ canceled: false, filePaths: ['C:/keys/id_rsa.pem'] })
      .mockResolvedValueOnce({ canceled: false, filePaths: ['C:/keys/id_rsa.pub'] });

    const browseButtons = screen.getAllByRole('button', { name: 'Browse' });
    await userEvent.click(browseButtons[0]);
    await userEvent.click(browseButtons[1]);

    sshImport.mockResolvedValue({ success: true, data: { name: 'imported-key', type: 'rsa' } });
    await userEvent.click(screen.getByRole('button', { name: 'Import Key' }));
    expect(sshImport).toHaveBeenCalledWith({
      name: 'imported-key',
      privateKeyPath: 'C:/keys/id_rsa.pem',
      publicKeyPath: 'C:/keys/id_rsa.pub',
      passphrase: undefined,
    });
  });

  it('shows loading state during import', async () => {
    const { showOpenDialog, sshImport } = setupElectron();
    render(<KeyImport />);
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['C:/keys/id_rsa.pem'] });
    await userEvent.click(screen.getAllByRole('button', { name: 'Browse' })[0]);

    // Mock a pending promise; we will not await resolution immediately
    let resolveFn!: (v: IPCResponse<SSHKeyPair>) => void;
    const pending = new Promise<IPCResponse<SSHKeyPair>>((resolve) => { resolveFn = resolve; });
    sshImport.mockReturnValue(pending);

    await userEvent.click(screen.getByRole('button', { name: 'Import Key' }));
    // Button should show Importing… text
    expect(screen.getByRole('button', { name: 'Importing…' })).toBeTruthy();
    // Resolve now to avoid hanging
    resolveFn!({ success: true, data: { name: 'imported-key', type: 'rsa' } });
  });

  it('shows error when import fails', async () => {
    const { showOpenDialog, sshImport } = setupElectron();
    render(<KeyImport />);
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['C:/keys/id_rsa.pem'] });
    await userEvent.click(screen.getAllByRole('button', { name: 'Browse' })[0]);

    sshImport.mockResolvedValue({ success: false, error: 'Invalid key format' });
    await userEvent.click(screen.getByRole('button', { name: 'Import Key' }));
    expect(await screen.findByText('Invalid key format')).toBeTruthy();
  });

  it('surfaces thrown errors from import API', async () => {
    const { showOpenDialog, sshImport } = setupElectron();
    render(<KeyImport />);
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['C:/keys/id_rsa.pem'] });
    await userEvent.click(screen.getAllByRole('button', { name: 'Browse' })[0]);

    sshImport.mockRejectedValue(new Error('Unexpected failure'));
    await userEvent.click(screen.getByRole('button', { name: 'Import Key' }));
    expect(await screen.findByText('Unexpected failure')).toBeTruthy();
  });
});
