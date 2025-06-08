console.log("[inject.js] Loaded");

(function () {
  function logToContent(message) {
    window.postMessage({ type: "FROM_INJECT", message }, "*");
    console.log("[inject.js]", message);
  }

  logToContent("Starting enhanced interception");
  function isDocPhpUrl(url) {
    if (!url) return false;
    
    const isMatch = (
      url.includes('/data/doc.php') || 
      /\.?exampro\.net\/data\/doc\.php/i.test(url) ||
      /^data\/doc\.php/i.test(url)
    );
    
    if (url.includes('doc.php')) {
      logToContent(`URL check: ${url}, isMatch: ${isMatch}`);
    }
    
    return isMatch;
  }

  function modifyJsonResponse(json) {
    if (!json || typeof json !== 'object') {
      return null;
    }
    
    logToContent(`Processing JSON: ${JSON.stringify(json).substring(0, 150)}...`);
    
    if ('showm' in json) {
      const originalValue = json.showm;
      json.showm = 1;
      logToContent(`Modified showm from ${originalValue} to ${json.showm}`);
      return json;
    }
    
    return null;
  }

  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    
    if (url && url.includes('doc.php')) {
      logToContent(`Fetch request to: ${url}`);
    }
    
    if (!isDocPhpUrl(url)) {
      return originalFetch.apply(this, arguments);
    }
    
    logToContent(`Intercepting fetch to: ${url}`);
    
    try {
      const response = await originalFetch.apply(this, arguments);
      
      if (!response || !response.clone) {
        logToContent("Response cannot be cloned, returning original");
        return response;
      }
      
      const cloned = response.clone();
      
      // Check response type
      const contentType = response.headers.get('content-type');
      logToContent(`Response content-type: ${contentType}`);
      
      try {
        const text = await cloned.text();
        logToContent(`Received response: ${text.substring(0, 150)}...`);
        
        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          logToContent(`Failed to parse as JSON: ${e.message}. Response starts with: ${text.substring(0, 50)}`);
          return response;
        }
        
        const modified = modifyJsonResponse(json);
        
        if (modified) {
          const modifiedText = JSON.stringify(modified);
          logToContent(`Modified response: ${modifiedText.substring(0, 150)}...`);
          
          const modifiedBlob = new Blob([modifiedText], {
            type: 'application/json'
          });
          
          return new Response(modifiedBlob, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch (e) {
        logToContent(`Failed to process response: ${e.message}`);
      }
      
      return response;
    } catch (error) {
      logToContent(`Error in fetch interception: ${error.message}`);
      return originalFetch.apply(this, arguments);
    }
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._url = url;
    this._isDocPhp = isDocPhpUrl(url);
    
    if (url && url.includes('doc.php')) {
      logToContent(`XHR open: ${method} ${url}`);
    }
    
    return originalXHROpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function(data) {
    if (!this._isDocPhp) {
      return originalXHRSend.apply(this, arguments);
    }
    
    logToContent(`Sending XHR to: ${this._url}`);
    
    const xhr = this;
    
    const originalOnReadyStateChange = this.onreadystatechange;
    this.onreadystatechange = function(evt) {
      if (xhr.readyState === 4) {
        logToContent(`XHR completed with status: ${xhr.status}`);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const contentType = xhr.getResponseHeader('content-type');
            logToContent(`XHR response content-type: ${contentType}`);
            
            if (xhr.responseType === '' || xhr.responseType === 'text' || xhr.responseType === 'json') {
              let originalResponse;
              
              if (xhr.responseType === 'json') {
                originalResponse = xhr.response;
              } else {
                originalResponse = xhr.responseText;
              }
              
              if (!originalResponse) {
                logToContent('Empty response, nothing to modify');
                return;
              }
              
              logToContent(`XHR response: ${typeof originalResponse === 'string' ? 
                originalResponse.substring(0, 150) : 
                'non-string response'}`);
              
              let jsonData;
              if (typeof originalResponse === 'string') {
                try {
                  jsonData = JSON.parse(originalResponse);
                } catch (e) {
                  logToContent(`Failed to parse response as JSON: ${e.message}`);
                  return;
                }
              } else {
                jsonData = originalResponse;
              }
              
              const modified = modifyJsonResponse(jsonData);
              
              if (modified) {
                const modifiedResponse = JSON.stringify(modified);
                logToContent(`Modified XHR response: ${modifiedResponse.substring(0, 150)}...`);
                
                Object.defineProperty(xhr, 'responseText', {
                  get: function() { return modifiedResponse; }
                });
                
                Object.defineProperty(xhr, 'response', {
                  get: function() {
                    return xhr.responseType === 'json' ? modified : modifiedResponse;
                  }
                });
              }
            }
          } catch (e) {
            logToContent(`Error in XHR response modification: ${e.message}, stack: ${e.stack}`);
          }
        }
      }
      
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments);
      }
    };
    
    return originalXHRSend.apply(this, arguments);
  };

  const originalResponseProto = Response.prototype;
  const originalJson = originalResponseProto.json;
  
  if (originalJson) {
    originalResponseProto.json = async function() {
      try {
        const result = await originalJson.apply(this, arguments);
        
        let url = '';
        if (this.url) url = this.url;
        
        if (result && typeof result === 'object' && 'showm' in result) {
          logToContent(`Found object with showm property in Response.json()`);
          const modified = modifyJsonResponse(result);
          if (modified) {
            logToContent('Modified Response.json() result');
            return modified;
          }
        }
        
        return result;
      } catch (e) {
        logToContent(`Error intercepting Response.json: ${e.message}`);
        throw e;
      }
    };
  }
  
  const originalJSONParse = JSON.parse;
  window.JSON.parse = function(text) {
    try {
      const result = originalJSONParse.apply(this, arguments);
      
      if (result && typeof result === 'object' && 'showm' in result) {
        logToContent('Found JSON with showm property through JSON.parse');
        const modified = modifyJsonResponse(result);
        if (modified) {
          return modified;
        }
      }
      
      return result;
    } catch (e) {
      throw e;
    }
  };

  logToContent("Successfully intercepted network APIs");
})();
