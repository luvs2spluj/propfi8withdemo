# Local-First Architecture Setup Guide

This guide explains how to set up and use the new local-first architecture in PropFi.

## Overview

The local-first architecture allows users to:
- Pick CSV files from their local disk and render charts without uploading
- Store data and settings offline in the browser (IndexedDB)
- Sync changes to Supabase when online and authenticated
- Work on Chromium (File System Access API) with graceful fallbacks for Safari/Firefox
- Use as a PWA with offline page load and cached static assets

## Architecture Components

### Core Libraries
- **Vite + React**: Frontend framework
- **@supabase/supabase-js**: Cloud sync when authenticated
- **idb-keyval**: IndexedDB storage for local data
- **papaparse**: CSV parsing with streaming support
- **vite-plugin-pwa**: Service worker for offline support

### File Structure
```
/src
  /lib
    supabaseClient.ts          # Supabase client configuration
    storage/
      index.ts                 # Storage facade
      localStore.ts            # IndexedDB/OPFS + file handles
      cloudStore.ts            # Supabase reads/writes
    sync/
      syncQueue.ts             # Outbox queue (retry on reconnect)
      netStatus.ts             # Online/offline detection
      syncManager.ts           # Coordinates sync flows
    files/
      filePicker.ts            # FS Access + <input type="file"> fallback
    csv/
      parseCsv.ts              # Papa streaming helpers
  /hooks
    useLocalFolder.ts          # Local folder management
    useDataset.ts              # Dataset loading and processing
    useSync.ts                 # Sync status and authentication
  /components
    DataConnector.tsx          # UI: connect local folder, pick files
    SyncStatus.tsx             # UI: local-only vs synced + errors
    LocalFirstApp.tsx          # Main local-first app component
```

## Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration for Local-First Architecture
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Existing Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
```

### 2. Supabase Database Setup

Run the SQL schema in your Supabase project:

```sql
-- Execute the contents of supabase-local-first-schema.sql
-- This creates the datasets and dataset_samples tables with RLS policies
```

### 3. Install Dependencies

The required dependencies are already installed:
- `idb-keyval` - IndexedDB storage
- `vite-plugin-pwa` - PWA support
- `papaparse` - CSV parsing (already present)

### 4. Build and Run

```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

## Usage

### Accessing Local-First Mode

1. Navigate to the "Local-First Data" section in the sidebar
2. The app will work in local-only mode by default
3. Configure Supabase credentials to enable cloud sync

### Adding Data

#### Option 1: Connect a Folder (Chromium only)
1. Click "Connect Folder" button
2. Select a directory containing CSV files
3. The app will scan and catalog all CSV files
4. Small samples (1000 rows) are stored locally for preview

#### Option 2: Add Individual Files (All browsers)
1. Click "Add Files" button
2. Select single or multiple CSV files
3. Files are processed and added to the local catalog

### Data Management

- **Local Storage**: All data is stored in IndexedDB
- **Sample Data**: First 1000 rows of each CSV are cached for quick preview
- **Metadata**: File information, field types, and structure are stored
- **Sync Queue**: Changes are queued for cloud sync when online

### Cloud Sync

#### Authentication
1. Click the sync status indicator
2. Enter your email to receive a magic link
3. Sign in to enable cloud sync

#### Sync Behavior
- **Online + Authenticated**: Changes sync automatically every 30 seconds
- **Offline**: Changes are queued locally
- **Reconnect**: Queued changes sync automatically
- **Errors**: Failed syncs are retried with exponential backoff

### PWA Features

- **Offline Support**: App loads and works without internet
- **Installable**: Can be installed as a native app
- **Cached Assets**: Static files are cached for offline use
- **Background Sync**: Sync continues when app is in background

## Browser Compatibility

### File System Access API (Chromium)
- **Chrome 86+**: Full directory access support
- **Edge 86+**: Full directory access support
- **Opera 72+**: Full directory access support

### Fallback Support (All browsers)
- **Safari**: Individual file selection only
- **Firefox**: Individual file selection only
- **Mobile browsers**: Individual file selection only

## Data Flow

### Local-First Flow
1. User selects CSV files locally
2. Files are parsed and samples stored in IndexedDB
3. Metadata is cataloged locally
4. Charts render from local data (no network required)

### Cloud Sync Flow
1. User authenticates with Supabase
2. Local changes are queued in outbox
3. Background sync processes queue every 30 seconds
4. Successful syncs update cloud database
5. Failed syncs are retried with backoff

### Offline Flow
1. App works normally with local data
2. Changes are queued locally
3. Network status is monitored
4. On reconnect, queued changes sync automatically

## Troubleshooting

### Common Issues

#### "Supabase not configured" message
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- App works in local-only mode without these

#### "Directory access not supported"
- Use individual file selection instead
- Directory access only works in Chromium-based browsers

#### Sync not working
- Check network connection
- Verify Supabase credentials
- Check browser console for errors
- Ensure user is authenticated

#### Data not persisting
- Check browser storage permissions
- Ensure IndexedDB is enabled
- Try clearing browser data and retrying

### Debug Information

The app provides debug information in the browser console:
- Network status changes
- Sync operations and results
- Storage operations
- File processing status

## Security Considerations

### Local Data
- Data is stored in browser's IndexedDB
- No data leaves the device unless user authenticates
- Local data is isolated per browser/device

### Cloud Sync
- All cloud operations require authentication
- RLS policies ensure users only access their own data
- Data is encrypted in transit and at rest

### File Access
- File System Access API requires user permission
- Files are only read, never modified
- No file content is stored permanently (only samples)

## Performance Considerations

### Local Storage
- IndexedDB has size limits (varies by browser)
- Large files are sampled (1000 rows) for performance
- Full file processing can be memory intensive

### Sync Performance
- Background sync runs every 30 seconds
- Failed syncs use exponential backoff
- Large datasets may take time to sync

### Memory Usage
- CSV parsing is streamed to avoid memory issues
- Sample data is limited to 1000 rows
- Full datasets are processed on-demand

## Future Enhancements

### Planned Features
- **DuckDB-WASM**: In-browser SQL queries
- **OPFS**: Better file storage for Chromium
- **Real-time Sync**: WebSocket-based live updates
- **Conflict Resolution**: Handle concurrent edits
- **Data Export**: Export processed data to various formats

### Integration Opportunities
- **Chart.js**: Enhanced visualization
- **D3.js**: Advanced data visualization
- **Web Workers**: Background processing
- **Service Workers**: Advanced caching strategies

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify environment configuration
3. Test with different browsers
4. Check Supabase dashboard for sync status

The local-first architecture provides a robust foundation for offline-first property management while maintaining the flexibility of optional cloud sync.
