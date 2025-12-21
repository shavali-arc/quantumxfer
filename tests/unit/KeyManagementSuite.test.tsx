import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyManagerApp from '../../src/KeyManagerApp';
import type { ElectronAPI, IPCResponse, SSHKeyPair, SSHKeyValidationResult } from '../../src/types/electron.d';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const mockKeys: SSHKeyPair[] = [
  { name: 'rsa-2048', type: 'rsa', bits: 2048, fingerprint: 'aa:bb:cc', comment: 'test', createdAt: new Date().toISOString() },
  { name: 'ed25519-main', type: 'ed25519', fingerprint: '11:22:33', comment: '', createdAt: new Date().toISOString() },
];

const setupElectron = () => {
  const list = vi.fn<[], Promise<IPCResponse<SSHKeyPair[]>>>();
  const get = vi.fn<[string], Promise<IPCResponse<SSHKeyPair>>>();
  const generate = vi.fn();
  const importFn = vi.fn();
  const exportFn = vi.fn();
  const del = vi.fn();
  const test = vi.fn<[], Promise<IPCResponse<SSHKeyValidationResult>>>();
  const showOpenDialog = vi.fn();

  (window as { electronAPI?: ElectronAPI }).electronAPI = {
    platform: 'win32',
    isElectron: true,
    getVersion: vi.fn(),
    showSaveDialog: vi.fn(),
    showOpenDialog,
    openTerminalWindow: vi.fn(),
    ssh: {
      connect: vi.fn(),
      executeCommand: vi.fn(),
      listDirectory: vi.fn(),
      listDirectoryRecursive: vi.fn(),
      downloadFile: vi.fn(),
      uploadFile: vi.fn(),
      disconnect: vi.fn(),
      getConnections: vi.fn(),
    },
    writeLogFile: vi.fn(),
    saveProfilesToFile: vi.fn(),
    loadProfilesFromFile: vi.fn(),
    saveCommandHistory: vi.fn(),
    loadCommandHistory: vi.fn(),
    appendCommandHistory: vi.fn(),
    bookmarks: { list: vi.fn(), add: vi.fn(), remove: vi.fn() },
    sshKeys: {
      list,
      get,
      generate,
      import: importFn,
      export: exportFn,
      delete: del,
      test,
    },
    onMenuNewConnection: vi.fn(),
    onMenuLogsDirectory: vi.fn(),
    onMenuManageProfiles: vi.fn(),
    onMenuExportProfiles: vi.fn(),
    onMenuImportProfiles: vi.fn(),
    removeAllListeners: vi.fn(),
  } as unknown as ElectronAPI;

  // Defaults
  list.mockResolvedValue({ success: true, data: mockKeys });
  get.mockResolvedValue({ success: true, data: mockKeys[0] });
  test.mockResolvedValue({ success: true, data: { valid: true } });
  exportFn.mockResolvedValue({ success: true, data: { privateKeyPath: 'C:/out/private.pem', publicKeyPath: 'C:/out/public.pub', metadataPath: 'C:/out/metadata.json' } });
  del.mockResolvedValue({ success: true, data: { success: true, message: 'deleted' } });

  return { list, get, generate, importFn, exportFn, del, test, showOpenDialog };
};

describe('KeyManagerApp Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as { electronAPI?: ElectronAPI }).electronAPI;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as { electronAPI?: ElectronAPI }).electronAPI;
  });

  it('renders KeyList by default with search and refresh', async () => {
    const { list } = setupElectron();
    render(<KeyManagerApp />);
    expect(await screen.findByText('Stored SSH Keys')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search by name, type, or fingerprint…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('filters keys with search query and shows no results state', async () => {
    setupElectron();
    render(<KeyManagerApp />);
    expect(await screen.findByText('Stored SSH Keys')).toBeTruthy();
    const search = screen.getByPlaceholderText('Search by name, type, or fingerprint…');
    await userEvent.type(search, 'no-match-key');
    expect(await screen.findByText('No keys match your search.')).toBeTruthy();
  });

  it('opens details modal and shows key metadata', async () => {
    setupElectron();
    render(<KeyManagerApp />);
    // Find the details button (📋) and click
    const detailsBtn = (await screen.findAllByRole('button', { name: '📋' }))[0];
    await userEvent.click(detailsBtn);
    const modalTitle = await screen.findByText('Key Details');
    const header = modalTitle.parentElement as HTMLElement | null;
    const modalBox = header?.parentElement as HTMLElement | null; // inner modal container
    expect(modalBox).toBeTruthy();
    // Assert fingerprint unique value within modal content
    expect(within(modalBox as HTMLElement).getAllByText('aa:bb:cc').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  });

  it('tests key validity from row action and shows alert on success', async () => {
    const { test } = setupElectron();
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<KeyManagerApp />);
    const testBtn = (await screen.findAllByRole('button', { name: '✓' }))[0];
    await userEvent.click(testBtn);
    expect(test).toHaveBeenCalledWith('rsa-2048', undefined);
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('exports key from row action opens dialog and shows success alert', async () => {
    const { showOpenDialog } = setupElectron();
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['C:/out'] });
    render(<KeyManagerApp />);
    const exportBtn = (await screen.findAllByRole('button', { name: '⬇' }))[0];
    await userEvent.click(exportBtn);
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('delete key confirms and refreshes list', async () => {
    const { del, list } = setupElectron();
    // Confirm dialog
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<KeyManagerApp />);
    const deleteBtn = (await screen.findAllByRole('button', { name: '✕' }))[0];
    await userEvent.click(deleteBtn);
    expect(del).toHaveBeenCalledWith('rsa-2048');
    // loadKeys called again after delete
    expect(list).toHaveBeenCalledTimes(2);
    confirmSpy.mockRestore();
  });

  it('switches tabs: Generate and Import render correctly', async () => {
    setupElectron();
    render(<KeyManagerApp />);
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(await screen.findByText('SSH Key Generator')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(await screen.findByText('Import SSH Key')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'List Keys' }));
    expect(await screen.findByText('Stored SSH Keys')).toBeTruthy();
  });

  it('handles Electron API not available showing error states in List', async () => {
    // No electronAPI
    render(<KeyManagerApp />);
    expect(await screen.findByText('Stored SSH Keys')).toBeTruthy();
    // When list fails due to missing API, KeyList should show error
    expect(await screen.findByText('Electron API not available')).toBeTruthy();
  });

  it('shows error message when list fails (backend error)', async () => {
    const { list } = setupElectron();
    list.mockResolvedValueOnce({ success: false, error: 'Failed to list keys' });
    render(<KeyManagerApp />);
    expect(await screen.findByText('Failed to list keys')).toBeTruthy();
  });
});
