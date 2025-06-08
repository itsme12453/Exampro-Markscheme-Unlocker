(function() {
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    if (url && url.includes('doc.php')) {
      console.log('FETCH REQUEST to doc.php:', { url, method: init?.method || 'GET' });
    }
    return originalFetch.apply(this, arguments);
  };
  
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    if (url && url.includes('doc.php')) {
      console.log('XHR REQUEST to doc.php:', { url, method });
    }
    return originalXHROpen.apply(this, arguments);
  };
  
  console.log('Debug monitoring installed for network requests to doc.php');
})();
