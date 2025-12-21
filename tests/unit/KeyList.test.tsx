import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KeyList from '../../src/components/KeyList';
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

const mockKeys = [
  {
    name: 'test-key-1',
    type: 'rsa',
    bits: 2048,
    fingerprint: 'SHA256:abc123def456',
    comment: 'Test key 1',
    createdAt: new Date('2025-01-15').toISOString(),
  },
  {
    name: 'test-key-2',
    type: 'ed25519',
    bits: 256,
    fingerprint: 'SHA256:xyz789uvw012',
    comment: 'Test key 2',
    createdAt: new Date('2025-01-20').toISOString(),
  },
  {
    name: 'prod-key',
    type: 'ecdsa',
    bits: 384,
    fingerprint: 'SHA256:prod123abc456',
    comment: 'Production key',
    createdAt: new Date('2025-01-10').toISOString(),
  },
];

describe('KeyList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as Window & { electronAPI?: ElectronAPI }).electronAPI = mockElectronAPI;
  });

  afterEach(() => {
    delete (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
  });

  // Test 1: Component renders without crashing
  it('should render without crashing', () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [] });
    render(<KeyList />);
    expect(screen.getByText(/Stored SSH Keys/i)).toBeInTheDocument();
  });

  // Test 2: Shows loading state initially
  it('should show loading state on mount', () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockImplementation(() => new Promise(() => {}));
    render(<KeyList />);
    expect(screen.getByText(/Loading keys/i)).toBeInTheDocument();
  });

  // Test 3: Loads and displays keys on mount
  it('should load and display keys on mount', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: mockKeys });
    render(<KeyList />);
    await waitFor(() => {
      expect(screen.getByText('test-key-1')).toBeInTheDocument();
      expect(screen.getByText('test-key-2')).toBeInTheDocument();
      expect(screen.getByText('prod-key')).toBeInTheDocument();
    });
  });

  // Test 4: Shows empty state when no keys exist
  it('should show empty state when no keys exist', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [] });
    render(<KeyList />);
    await waitFor(() => {
      expect(screen.getByText(/No SSH keys stored yet/i)).toBeInTheDocument();
    });
  });

  // Test 5: Displays error message on load failure
  it('should display error message when loading fails', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ 
      success: false, 
      error: 'Failed to read keys directory' 
    });
    render(<KeyList />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to read keys directory/i)).toBeInTheDocument();
    });
  });

  // Test 6: Displays key properties correctly
  it('should display key name, type, bits, fingerprint, and created date', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    render(<KeyList />);
    await waitFor(() => {
      expect(screen.getByText('test-key-1')).toBeInTheDocument();
      expect(screen.getByText('rsa')).toBeInTheDocument();
      expect(screen.getByText('2048')).toBeInTheDocument();
      expect(screen.getByText('SHA256:abc123def456')).toBeInTheDocument();
    });
  });

  // Test 7: Search/filter by key name
  it('should filter keys by name when searching', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: mockKeys });
    render(<KeyList />);
    
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(searchInput, { target: { value: 'prod' } });
    
    await waitFor(() => {
      expect(screen.getByText('prod-key')).toBeInTheDocument();
      expect(screen.queryByText('test-key-1')).not.toBeInTheDocument();
    });
  });

  // Test 8: Search/filter by key type
  it('should filter keys by type when searching', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: mockKeys });
    render(<KeyList />);
    
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(searchInput, { target: { value: 'ed25519' } });
    
    await waitFor(() => {
      expect(screen.getByText('test-key-2')).toBeInTheDocument();
      expect(screen.queryByText('test-key-1')).not.toBeInTheDocument();
    });
  });

  // Test 9: Search/filter by fingerprint
  it('should filter keys by fingerprint when searching', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: mockKeys });
    render(<KeyList />);
    
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(searchInput, { target: { value: 'xyz789' } });
    
    await waitFor(() => {
      expect(screen.getByText('test-key-2')).toBeInTheDocument();
      expect(screen.queryByText('test-key-1')).not.toBeInTheDocument();
    });
  });

  // Test 10: Shows "no results" when search has no matches
  it('should show no results message when search yields no matches', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: mockKeys });
    render(<KeyList />);
    
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText(/No keys match your search/i)).toBeInTheDocument();
    });
  });

  // Test 11: Refresh button reloads keys
  it('should reload keys when refresh button is clicked', async () => {
    const listSpy = vi.mocked(mockElectronAPI.sshKeys.list)
      .mockResolvedValue({ success: true, data: mockKeys });
    
    render(<KeyList />);
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    expect(listSpy).toHaveBeenCalledTimes(1);
    
    const refreshBtn = screen.getByText('Refresh');
    fireEvent.click(refreshBtn);
    
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(2);
    });
  });

  // Test 12: Opens details modal when view button clicked
  it('should open details modal when view details button is clicked', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    render(<KeyList />);
    
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const viewButtons = screen.getAllByTitle('View details');
    fireEvent.click(viewButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Key Details')).toBeInTheDocument();
      expect(screen.getByText('Test key 1')).toBeInTheDocument(); // Comment field
    });
  });

  // Test 13: Closes details modal when close button clicked
  it('should close details modal when close button is clicked', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    render(<KeyList />);
    
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const viewButtons = screen.getAllByTitle('View details');
    fireEvent.click(viewButtons[0]);
    
    await waitFor(() => expect(screen.getByText('Key Details')).toBeInTheDocument());
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Key Details')).not.toBeInTheDocument();
    });
  });

  // Test 14: Test button calls test API
  it('should call test API when test button is clicked', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    vi.mocked(mockElectronAPI.sshKeys.test).mockResolvedValue({ 
      success: true, 
      data: { requiresPassphrase: false } 
    });
    
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<KeyList />);
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const testButtons = screen.getAllByTitle('Test key validity');
    fireEvent.click(testButtons[0]);
    
    await waitFor(() => {
      expect(mockElectronAPI.sshKeys.test).toHaveBeenCalledWith('test-key-1', undefined);
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Key "test-key-1" is valid'));
    });
    
    alertSpy.mockRestore();
  });

  // Test 15: Test button shows error on failure
  it('should show error alert when key test fails', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    vi.mocked(mockElectronAPI.sshKeys.test).mockResolvedValue({ 
      success: false, 
      error: 'Invalid key format' 
    });
    
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<KeyList />);
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const testButtons = screen.getAllByTitle('Test key validity');
    fireEvent.click(testButtons[0]);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('✗ Key test failed: Invalid key format'));
    });
    
    alertSpy.mockRestore();
  });

  // Test 16: Export button opens directory dialog
  it('should open directory dialog when export button is clicked', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    vi.mocked(mockElectronAPI.showOpenDialog).mockResolvedValue({ 
      canceled: false, 
      filePaths: ['/export/path'] 
    });
    vi.mocked(mockElectronAPI.sshKeys.export).mockResolvedValue({ 
      success: true, 
      data: { metadataPath: '/export/path/test-key-1.json' } 
    });
    
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<KeyList />);
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const exportButtons = screen.getAllByTitle('Export key');
    fireEvent.click(exportButtons[0]);
    
    await waitFor(() => {
      expect(mockElectronAPI.showOpenDialog).toHaveBeenCalled();
      expect(mockElectronAPI.sshKeys.export).toHaveBeenCalledWith('test-key-1', '/export/path');
    });
    
    alertSpy.mockRestore();
  });

  // Test 17: Export cancelled when user cancels dialog
  it('should not export when user cancels directory dialog', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    vi.mocked(mockElectronAPI.showOpenDialog).mockResolvedValue({ 
      canceled: true, 
      filePaths: [] 
    });
    
    render(<KeyList />);
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const exportButtons = screen.getAllByTitle('Export key');
    fireEvent.click(exportButtons[0]);
    
    await waitFor(() => {
      expect(mockElectronAPI.sshKeys.export).not.toHaveBeenCalled();
    });
  });

  // Test 18: Delete button shows confirmation dialog
  it('should show confirmation dialog when delete button is clicked', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(<KeyList />);
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const deleteButtons = screen.getAllByTitle('Delete key');
    fireEvent.click(deleteButtons[0]);
    
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Delete key "test-key-1"'));
    
    confirmSpy.mockRestore();
  });

  // Test 19: Delete key when confirmed
  it('should delete key when user confirms', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list)
      .mockResolvedValueOnce({ success: true, data: [mockKeys[0], mockKeys[1]] })
      .mockResolvedValueOnce({ success: true, data: [mockKeys[1]] });
    vi.mocked(mockElectronAPI.sshKeys.delete).mockResolvedValue({ success: true });
    
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<KeyList />);
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const deleteButtons = screen.getAllByTitle('Delete key');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(mockElectronAPI.sshKeys.delete).toHaveBeenCalledWith('test-key-1');
      expect(mockElectronAPI.sshKeys.list).toHaveBeenCalledTimes(2); // Initial + reload after delete
    });
    
    confirmSpy.mockRestore();
  });

  // Test 20: Delete cancelled when user declines
  it('should not delete key when user cancels confirmation', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(<KeyList />);
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const deleteButtons = screen.getAllByTitle('Delete key');
    fireEvent.click(deleteButtons[0]);
    
    expect(mockElectronAPI.sshKeys.delete).not.toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });

  // Test 21: Shows error message when delete fails
  it('should show error message when delete operation fails', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    vi.mocked(mockElectronAPI.sshKeys.delete).mockResolvedValue({ 
      success: false, 
      error: 'Permission denied' 
    });
    
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<KeyList />);
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    const deleteButtons = screen.getAllByTitle('Delete key');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText(/Permission denied/i)).toBeInTheDocument();
    });
    
    confirmSpy.mockRestore();
  });

  // Test 22: Closes details modal after deleting viewed key
  it('should close details modal when the viewed key is deleted', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list)
      .mockResolvedValueOnce({ success: true, data: [mockKeys[0]] })
      .mockResolvedValueOnce({ success: true, data: [] });
    vi.mocked(mockElectronAPI.sshKeys.delete).mockResolvedValue({ success: true });
    
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<KeyList />);
    await waitFor(() => expect(screen.getByText('test-key-1')).toBeInTheDocument());
    
    // Open details modal
    const viewButtons = screen.getAllByTitle('View details');
    fireEvent.click(viewButtons[0]);
    await waitFor(() => expect(screen.getByText('Key Details')).toBeInTheDocument());
    
    // Delete the key
    const deleteButtons = screen.getAllByTitle('Delete key');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(screen.queryByText('Key Details')).not.toBeInTheDocument();
    });
    
    confirmSpy.mockRestore();
  });

  // Test 23: Handles missing Electron API gracefully
  it('should show error when Electron API is not available', async () => {
    delete (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
    
    render(<KeyList />);
    
    await waitFor(() => {
      expect(screen.getByText(/Electron API not available/i)).toBeInTheDocument();
    });
  });

  // Test 24: Shows action buttons for each key
  it('should display action buttons for each key in the table', async () => {
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [mockKeys[0]] });
    render(<KeyList />);
    
    await waitFor(() => {
      expect(screen.getByTitle('View details')).toBeInTheDocument();
      expect(screen.getByTitle('Test key validity')).toBeInTheDocument();
      expect(screen.getByTitle('Export key')).toBeInTheDocument();
      expect(screen.getByTitle('Delete key')).toBeInTheDocument();
    });
  });

  // Test 25: Formats created date correctly
  it('should format created date in readable format', async () => {
    const key = {
      ...mockKeys[0],
      createdAt: new Date('2025-01-15T10:30:00Z').toISOString(),
    };
    vi.mocked(mockElectronAPI.sshKeys.list).mockResolvedValue({ success: true, data: [key] });
    render(<KeyList />);
    
    await waitFor(() => {
      // Date format varies by locale, so just check a date is displayed
      const dateCell = screen.getByText(/2025/);
      expect(dateCell).toBeInTheDocument();
    });
  });
});
