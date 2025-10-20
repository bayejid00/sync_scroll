let sync_scroll = {
    port: null,
    focused: true,
    connected: false,
    on: false // start OFF until background confirms current state
};

function connectPort() {
    sync_scroll.port = chrome.runtime.connect({ name: "sync_scroll" });
    sync_scroll.connected = true;

    sync_scroll.port.onDisconnect.addListener(() => {
        // console.log('Port disconnected');
        sync_scroll.connected = false;
        sync_scroll.port = null;
        // Try to reconnect after a short delay
        setTimeout(() => {
            if (!sync_scroll.connected) {
                // console.log('Attempting to reconnect port...');
                connectPort();
            }
        }, 500);
    });

    sync_scroll.port.onMessage.addListener((msg) => {
        if (typeof msg.sync_on !== 'undefined') {
            sync_scroll.on = msg.sync_on;
            // console.log('Sync Scroll state updated:', sync_scroll.on ? 'ON' : 'OFF');
        }
        if (typeof msg.window_scrollY !== 'undefined' && sync_scroll.on) {
            const x = msg.window_scrollX;
            const y = msg.window_scrollY;
            window.scrollTo(x, y);
        }
    });
}

// Initial port connection
connectPort();

window.addEventListener('pageshow', () => {
    if (!sync_scroll.connected) {
        // console.log('Reconnected port after bfcache restore');
        connectPort();
    }
});

window.addEventListener('scroll', () => {
    // Only act when extension is ON and port is connected
    if (!sync_scroll.on || !sync_scroll.connected || !sync_scroll.port || !sync_scroll.focused) return;
    const x = window.scrollX;
    const y = window.scrollY;
    // console.log('tab sends scrollXY:', x, y);
    try {
        sync_scroll.port.postMessage({
            window_scrollX: x,
            window_scrollY: y
        });
    } catch (e) {
        console.warn('Failed to send scroll message:', e);
    }
});

window.addEventListener('focus', () => {
    sync_scroll.focused = true;
});

window.addEventListener('blur', () => {
    sync_scroll.focused = false;
});