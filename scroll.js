let sync_scroll = {
    port: null,
    focused: true,
    connected: false,
    on: true // Track ON/OFF state
};

function connectPort() {
    sync_scroll.port = chrome.runtime.connect({ name: "sync_scroll" });
    sync_scroll.connected = true;

    sync_scroll.port.onDisconnect.addListener(() => {
        console.log('Port disconnected');
        sync_scroll.connected = false;
        sync_scroll.port = null;
    });

    sync_scroll.port.onMessage.addListener((msg) => {
        if (typeof msg.sync_on !== 'undefined') {
            sync_scroll.on = msg.sync_on;
            console.log('Sync Scroll state updated:', sync_scroll.on ? 'ON' : 'OFF');
        }
        if (typeof msg.window_scrollY !== 'undefined' && sync_scroll.on) {
            const x = msg.window_scrollX;
            const y = msg.window_scrollY;
            // console.log('tab receives scrollXY:', x, y);
            window.scrollTo(x, y);
        }
    });
}

// Initial port connection
connectPort();

window.addEventListener('pageshow', (event) => {
    // Reconnect port if coming back from bfcache
    if (!sync_scroll.connected) {
        connectPort();
        console.log('Reconnected port after bfcache restore');
    }
});

window.addEventListener('scroll', () => {
    if (!sync_scroll.focused || !sync_scroll.connected || !sync_scroll.port || !sync_scroll.on) return;
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
    console.log('tab onfocus');
    sync_scroll.focused = true;
});

window.addEventListener('blur', () => {
    console.log('tab onblur');
    sync_scroll.focused = false;
});