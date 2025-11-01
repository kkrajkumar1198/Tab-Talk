// Signal that the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Offscreen document DOM fully loaded');
  
  // Notify the service worker that the document is ready
  try {
    chrome.runtime.sendMessage({
      type: 'offscreen-document-ready',
      target: 'service-worker'
    }).catch(error => {
      console.log('Error notifying service worker of document ready:', error);
    });
  } catch (error) {
    console.error('Failed to send ready message:', error);
  }
});

