<script lang="ts">
  import { onMount } from 'svelte';
  import { user, getFollowSnapshots, restoreFollowSnapshot, type FollowSnapshot } from '$lib/stores/user';
  import { goto } from '$app/navigation';

  // Format date
  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  let snapshots: FollowSnapshot[] = [];
  let loading = true;
  let restoring = false;
  let restoringId = '';
  let message = '';
  let messageType = '';

  onMount(() => {
    if (!$user) {
      goto('/');
      return;
    }
    
    snapshots = getFollowSnapshots();
    loading = false;
  });

  // Handle restore snapshot
  async function handleRestore(snapshot: FollowSnapshot) {
    if (restoring) return;
    
    restoring = true;
    restoringId = snapshot.eventId;
    messageType = '';
    message = '';
    
    try {
      const success = await restoreFollowSnapshot(snapshot);
      
      if (success) {
        messageType = 'success';
        message = `Successfully restored ${snapshot.count} follows from ${formatDate(snapshot.timestamp)}`;
        
        // Refresh snapshots list
        snapshots = getFollowSnapshots();
      } else {
        messageType = 'error';
        message = 'Failed to restore follow list';
      }
    } catch (err) {
      console.error('Error restoring snapshot:', err);
      messageType = 'error';
      message = `Error: ${err.message || 'Unknown error'}`;
    } finally {
      restoring = false;
      restoringId = '';
      
      // Auto-hide message after 5 seconds
      if (message) {
        setTimeout(() => {
          message = '';
        }, 5000);
      }
    }
  }

  // Export snapshot as JSON
  function exportSnapshot(snapshot: FollowSnapshot) {
    const dataStr = JSON.stringify(snapshot, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `follow-snapshot-${new Date(snapshot.timestamp).toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
</script>

<div class="container py-10">
  <div class="max-w-3xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
      <a href="/" class="btn btn-secondary">Back to Home</a>
    </div>
    
    {#if !$user}
      <div class="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
        <h2 class="text-xl font-medium text-yellow-800 mb-2">Login Required</h2>
        <p class="text-yellow-700 mb-4">
          You need to be logged in with a NIP-07 extension to access settings.
        </p>
        <a href="/" class="btn btn-primary">Back to Home</a>
      </div>
    {:else}
      {#if message}
        <div class="bg-{messageType === 'success' ? 'green' : 'red'}-50 border border-{messageType === 'success' ? 'green' : 'red'}-200 rounded-md p-4 mb-6 text-{messageType === 'success' ? 'green' : 'red'}-700">
          {message}
        </div>
      {/if}
      
      <!-- Following Snapshots Section -->
      <div class="bg-white shadow-sm rounded-lg overflow-hidden mb-8">
        <div class="p-6 border-b">
          <h2 class="text-xl font-medium mb-2">Following Snapshots</h2>
          <p class="text-gray-600 mb-4">
            These are snapshots of your following list that can be restored if needed.
            We automatically save snapshots whenever your follow list changes.
          </p>
          
          {#if loading}
            <div class="flex justify-center py-6">
              <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          {:else if snapshots.length === 0}
            <div class="bg-gray-50 border border-gray-200 rounded-md p-4 text-center text-gray-500">
              No snapshots available yet. Snapshots are saved automatically when you follow users.
            </div>
          {:else}
            <div class="overflow-hidden border border-gray-200 rounded-md">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Following
                    </th>
                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each snapshots as snapshot}
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(snapshot.timestamp)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {snapshot.count} users
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex justify-end space-x-2">
                          <button 
                            on:click={() => exportSnapshot(snapshot)}
                            class="text-purple-600 hover:text-purple-900"
                          >
                            Export
                          </button>
                          <button 
                            on:click={() => handleRestore(snapshot)}
                            disabled={restoring}
                            class="text-indigo-600 hover:text-indigo-900 {restoring && restoringId === snapshot.eventId ? 'opacity-50' : ''}"
                          >
                            {restoring && restoringId === snapshot.eventId ? 'Restoring...' : 'Restore'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            
            <p class="mt-4 text-sm text-gray-500">
              Restoring a snapshot will replace your current following list with the selected snapshot.
            </p>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div> 