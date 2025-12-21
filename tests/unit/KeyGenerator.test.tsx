import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KeyGenerator from '../../src/components/KeyGenerator';
import type { ElectronAPI } from '../../src/types/electron.d';

// Mock Electron API
const mockElectronAPI: ElectronAPI = {
  sshKeys: {
    list: vi.fn(),
    get: vi.fn(),
    generate: vi.fn(),
    import: vi.fn(),
    delete: vi.fn(),
    test: vi.fn(),
    export: vi.fn(),
  },
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  ipcRenderer: {
    send: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
} as unknown as ElectronAPI;

const mockGeneratedKey = {
  name: 'test-key',
  type: 'rsa',
  bits: 4096,
  fingerprint: 'SHA256:abc123def456',
  comment: 'test@example.com',
  publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC...',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----',
  createdAt: new Date().toISOString(),
};

describe('KeyGenerator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as Window & { electronAPI?: ElectronAPI }).electronAPI = mockElectronAPI;
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    delete (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
  });

  // Test 1: Component renders without crashing
  it('should render without crashing', () => {
    render(<KeyGenerator />);
    expect(screen.getByText('SSH Key Generator')).toBeInTheDocument();
  });

  // Test 2: Shows all form fields on load
  it('should display all form fields', () => {
    render(<KeyGenerator />);
    
    expect(screen.getByPlaceholderText('my-work-key')).toBeInTheDocument();
    expect(screen.getByDisplayValue('RSA')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Generate Key')).toBeInTheDocument();
  });

  // Test 3: Key type selection works
  it('should allow selecting different key types', async () => {
    render(<KeyGenerator />);
    
    const typeSelect = screen.getByDisplayValue('RSA');
    
    fireEvent.change(typeSelect, { target: { value: 'ed25519' } });
    expect(typeSelect).toHaveValue('ed25519');
    
    fireEvent.change(typeSelect, { target: { value: 'ecdsa' } });
    expect(typeSelect).toHaveValue('ecdsa');
    
    fireEvent.change(typeSelect, { target: { value: 'rsa' } });
    expect(typeSelect).toHaveValue('rsa');
  });

  // Test 4: RSA bit size selector appears only for RSA type
  it('should show bit size selector only for RSA type', async () => {
    render(<KeyGenerator />);
    
    const typeSelect = screen.getByDisplayValue('RSA');
    
    // RSA should show bits
    expect(screen.getByText('RSA Bits')).toBeInTheDocument();
    
    // Switch to ED25519 - bits should disappear
    fireEvent.change(typeSelect, { target: { value: 'ed25519' } });
    await waitFor(() => {
      expect(screen.queryByText('RSA Bits')).not.toBeInTheDocument();
    });
  });

  // Test 5: RSA bit size can be changed
  it('should allow changing RSA bit size', () => {
    render(<KeyGenerator />);
    
    const bitsSelect = screen.getByDisplayValue('4096');
    
    fireEvent.change(bitsSelect, { target: { value: '2048' } });
    expect(bitsSelect).toHaveValue('2048');
    
    fireEvent.change(bitsSelect, { target: { value: '4096' } });
    expect(bitsSelect).toHaveValue('4096');
  });

  // Test 6: Comment field accepts input
  it('should accept input in comment field', () => {
    render(<KeyGenerator />);
    
    const commentInput = screen.getByPlaceholderText('user@example.com');
    fireEvent.change(commentInput, { target: { value: 'admin@company.com' } });
    expect(commentInput).toHaveValue('admin@company.com');
  });

  // Test 7: Key name field accepts input
  it('should accept input in key name field', () => {
    render(<KeyGenerator />);
    
    const nameInput = screen.getByPlaceholderText('my-work-key');
    fireEvent.change(nameInput, { target: { value: 'production-key' } });
    expect(nameInput).toHaveValue('production-key');
  });

  // Test 8: Passphrase mismatch validation
  it('should show error when passphrases do not match', async () => {
    const { container } = render(<KeyGenerator />);
    
    const passwordInputs = container.querySelectorAll('input[type="password"]');
    const passphraseInput = passwordInputs[0];
    const confirmInput = passwordInputs[1];
    
    fireEvent.change(passphraseInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password456' } });
    
    await waitFor(() => {
      expect(screen.getByText('Passphrases do not match')).toBeInTheDocument();
    });
  });

  // Test 9: Passphrase match clears error
  it('should not show error when passphrases match', async () => {
    const { container } = render(<KeyGenerator />);
    
    const passwordInputs = container.querySelectorAll('input[type="password"]');
    const passphraseInput = passwordInputs[0];
    const confirmInput = passwordInputs[1];
    
    fireEvent.change(passphraseInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Passphrases do not match')).not.toBeInTheDocument();
    });
  });

  // Test 10: Generate button disabled when passphrases mismatch
  it('should disable generate button when passphrases do not match', async () => {
    const { container } = render(<KeyGenerator />);
    
    const passwordInputs = container.querySelectorAll('input[type="password"]');
    const generateBtn = screen.getByText('Generate Key');
    
    fireEvent.change(passwordInputs[0], { target: { value: 'pass1' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'pass2' } });
    
    await waitFor(() => {
      expect(generateBtn).toBeDisabled();
    });
  });

  // Test 11: Generate button calls API with correct parameters
  it('should call generate API with correct parameters', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: mockGeneratedKey,
    });
    
    render(<KeyGenerator />);
    
    const nameInput = screen.getByPlaceholderText('my-work-key');
    const commentInput = screen.getByPlaceholderText('user@example.com');
    const generateBtn = screen.getByText('Generate Key');
    
    fireEvent.change(nameInput, { target: { value: 'test-key' } });
    fireEvent.change(commentInput, { target: { value: 'test@example.com' } });
    fireEvent.click(generateBtn);
    
    await waitFor(() => {
      expect(mockElectronAPI.sshKeys.generate).toHaveBeenCalledWith({
        name: 'test-key',
        type: 'rsa',
        bits: 4096,
        comment: 'test@example.com',
        passphrase: undefined,
      });
    });
  });

  // Test 12: Generate button shows loading state
  it('should show loading state during key generation', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockGeneratedKey }), 100))
    );
    
    render(<KeyGenerator />);
    
    const generateBtn = screen.getByText('Generate Key');
    fireEvent.click(generateBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Generating…')).toBeInTheDocument();
    });
  });

  // Test 13: Displays generated key metadata
  it('should display generated key metadata after successful generation', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: mockGeneratedKey,
    });
    
    render(<KeyGenerator />);
    
    const generateBtn = screen.getByText('Generate Key');
    fireEvent.click(generateBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Generated Key')).toBeInTheDocument();
      expect(screen.getByText('test-key')).toBeInTheDocument();
      expect(screen.getByText('SHA256:abc123def456')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  // Test 14: Copy public key to clipboard
  it('should copy public key to clipboard', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: mockGeneratedKey,
    });
    
    render(<KeyGenerator />);
    
    fireEvent.click(screen.getByText('Generate Key'));
    
    await waitFor(() => {
      expect(screen.getByText('Copy Public Key')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Copy Public Key'));
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockGeneratedKey.publicKey);
    });
  });

  // Test 15: Copy private key to clipboard
  it('should copy private key to clipboard', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: mockGeneratedKey,
    });
    
    render(<KeyGenerator />);
    
    fireEvent.click(screen.getByText('Generate Key'));
    
    await waitFor(() => {
      expect(screen.getByText('Copy Private Key')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Copy Private Key'));
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockGeneratedKey.privateKey);
    });
  });

  // Test 16: Export button opens directory dialog
  it('should open directory dialog when export button clicked', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: mockGeneratedKey,
    });
    vi.mocked(mockElectronAPI.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ['/export/path'],
    });
    vi.mocked(mockElectronAPI.sshKeys.export).mockResolvedValue({
      success: true,
      data: { metadataPath: '/export/path/test-key.json' },
    });
    
    render(<KeyGenerator />);
    
    fireEvent.click(screen.getByText('Generate Key'));
    
    await waitFor(() => {
      expect(screen.getByText('Export to Folder')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Export to Folder'));
    
    await waitFor(() => {
      expect(mockElectronAPI.showOpenDialog).toHaveBeenCalled();
      expect(mockElectronAPI.sshKeys.export).toHaveBeenCalledWith('test-key', '/export/path');
    });
  });

  // Test 17: Export cancelled when user cancels dialog
  it('should not export when user cancels directory dialog', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: mockGeneratedKey,
    });
    vi.mocked(mockElectronAPI.showOpenDialog).mockResolvedValue({
      canceled: true,
      filePaths: [],
    });
    
    render(<KeyGenerator />);
    
    fireEvent.click(screen.getByText('Generate Key'));
    
    await waitFor(() => {
      expect(screen.getByText('Export to Folder')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Export to Folder'));
    
    await waitFor(() => {
      expect(mockElectronAPI.sshKeys.export).not.toHaveBeenCalled();
    });
  });

  // Test 18: Error message displayed when generation fails
  it('should display error message when key generation fails', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: false,
      error: 'Failed to generate key',
    });
    
    render(<KeyGenerator />);
    
    fireEvent.click(screen.getByText('Generate Key'));
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to generate key/i)).toBeInTheDocument();
    });
  });

  // Test 19: Handles missing Electron API gracefully
  it('should show error when Electron API is not available', async () => {
    delete (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
    
    render(<KeyGenerator />);
    
    fireEvent.click(screen.getByText('Generate Key'));
    
    await waitFor(() => {
      expect(screen.getByText(/Electron API not available/i)).toBeInTheDocument();
    });
  });

  // Test 20: Passphrase included in API call when provided
  it('should include passphrase in API call when provided', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: mockGeneratedKey,
    });
    
    const { container } = render(<KeyGenerator />);
    
    const passwordInputs = container.querySelectorAll('input[type="password"]');
    const generateBtn = screen.getByText('Generate Key');
    
    fireEvent.change(passwordInputs[0], { target: { value: 'securepass123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'securepass123' } });
    fireEvent.click(generateBtn);
    
    await waitFor(() => {
      expect(mockElectronAPI.sshKeys.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          passphrase: 'securepass123',
        })
      );
    });
  });

  // Test 21: ED25519 key generation
  it('should generate ED25519 key without bits parameter', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: { ...mockGeneratedKey, type: 'ed25519', bits: undefined },
    });
    
    render(<KeyGenerator />);
    
    const typeSelect = screen.getByDisplayValue('RSA');
    fireEvent.change(typeSelect, { target: { value: 'ed25519' } });
    
    fireEvent.click(screen.getByText('Generate Key'));
    
    await waitFor(() => {
      expect(mockElectronAPI.sshKeys.generate).toHaveBeenCalledWith({
        name: undefined,
        type: 'ed25519',
        bits: undefined,
        comment: undefined,
        passphrase: undefined,
      });
    });
  });

  // Test 22: ECDSA key generation
  it('should generate ECDSA key without bits parameter', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: { ...mockGeneratedKey, type: 'ecdsa', bits: undefined },
    });
    
    render(<KeyGenerator />);
    
    const typeSelect = screen.getByDisplayValue('RSA');
    fireEvent.change(typeSelect, { target: { value: 'ecdsa' } });
    
    fireEvent.click(screen.getByText('Generate Key'));
    
    await waitFor(() => {
      expect(mockElectronAPI.sshKeys.generate).toHaveBeenCalledWith({
        name: undefined,
        type: 'ecdsa',
        bits: undefined,
        comment: undefined,
        passphrase: undefined,
      });
    });
  });

  // Test 23: Export success notification
  it('should show success notification after export', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: mockGeneratedKey,
    });
    vi.mocked(mockElectronAPI.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ['/export/path'],
    });
    vi.mocked(mockElectronAPI.sshKeys.export).mockResolvedValue({
      success: true,
      data: { metadataPath: '/export/path/test-key.json' },
    });
    
    render(<KeyGenerator />);
    
    fireEvent.click(screen.getByText('Generate Key'));
    
    await waitFor(() => {
      expect(screen.getByText('Export to Folder')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Export to Folder'));
    
    await waitFor(() => {
      expect(screen.getByText(/Exported to/i)).toBeInTheDocument();
    });
  });

  // Test 24: Export error handling
  it('should show error when export fails', async () => {
    vi.mocked(mockElectronAPI.sshKeys.generate).mockResolvedValue({
      success: true,
      data: mockGeneratedKey,
    });
    vi.mocked(mockElectronAPI.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ['/export/path'],
    });
    vi.mocked(mockElectronAPI.sshKeys.export).mockResolvedValue({
      success: false,
      error: 'Permission denied',
    });
    
    render(<KeyGenerator />);
    
    fireEvent.click(screen.getByText('Generate Key'));
    
    await waitFor(() => {
      expect(screen.getByText('Export to Folder')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Export to Folder'));
    
    await waitFor(() => {
      expect(screen.getByText(/Permission denied/i)).toBeInTheDocument();
    });
  });

  // Test 25: Generate button enabled for valid form
  it('should enable generate button when form is valid', () => {
    render(<KeyGenerator />);
    
    const generateBtn = screen.getByText('Generate Key');
    expect(generateBtn).not.toBeDisabled();
  });
});
