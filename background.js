let selectedTabs = {};
let ports = {};

function notifyStateChange() {
    for (let tab_id in ports) {
        if (ports[tab_id]) {
            ports[tab_id].postMessage({ sync_on: sync_scroll.isOn() });
        }
    }
}

let sync_scroll = {
    on: true,
    setOn: function (on) {
        sync_scroll.on = on;
        chrome.action.setBadgeText({
            text: sync_scroll.isOn() ? 'on' : 'off'
        });
        notifyStateChange(); // Notify all tabs of ON/OFF state
        // console.log('Sync Scroll is now', sync_scroll.isOn() ? 'ON' : 'OFF');
    },
    isOn: function () {
        return sync_scroll.on;
    },
    toggle: function () {
        sync_scroll.setOn(!sync_scroll.isOn());
    }
};

chrome.action.onClicked.addListener(() => {
    sync_scroll.toggle();
});

chrome.tabs.onHighlighted.addListener((highlightedInfo) => {
    selectedTabs[highlightedInfo.windowId] = highlightedInfo.tabIds;
    // console.log('highlighted on windowId:' + highlightedInfo.windowId + ' tabIds:' + highlightedInfo.tabIds.join(','));
});

chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'sync_scroll') return;
    let tab_id = port.sender.tab.id;
    ports[tab_id] = port;
    // console.log('port is connected from tabId:' + tab_id);

    // send current ON/OFF state to the newly connected content script
    port.postMessage({ sync_on: sync_scroll.isOn() });

    port.onMessage.addListener((msg) => {
        if (!sync_scroll.isOn()) return;
        if (msg.window_scrollY !== undefined) {
            let x = msg.window_scrollX;
            let y = msg.window_scrollY;
            // only send to highlighted (active) tabs in each window
            const targets = selectedTabIds(); // function already present below
            for (let id of targets) {
                if (id != tab_id && ports[id]) {
                    ports[id].postMessage(msg);
                    // console.log('background sends ' + x + ',' + y + ' to tabId:' + id);
                }
            }
        }
    });

    port.onDisconnect.addListener(() => {
        delete ports[tab_id];
        // console.log('port disconnected from tabId:' + tab_id);
    });
});

function selectedTabIds() {
    let tabIds = [];
    for (let window_id in selectedTabs) {
        if (selectedTabs.hasOwnProperty(window_id)) {
            tabIds = tabIds.concat(selectedTabs[window_id]);
        }
    }
    return tabIds;
}

function sendToSelectedTabs(port, msg) {
    let tabIds = selectedTabIds();
    for (let tab_id of tabIds) {
        if (ports[tab_id] && ports[tab_id] !== port) {
            ports[tab_id].postMessage(msg);
            // console.log('background sends ' + msg.window_scrollX + ',' + msg.window_scrollY + ' to tabId:' + tab_id);
        }
    }
}

// Initialize badge text / notify state on service worker startup
// (onInstalled only runs on install/update; this ensures correct startup state)
sync_scroll.setOn(sync_scroll.on);
// console.log('Sync Scroll background started. state=', sync_scroll.isOn() ? 'ON' : 'OFF');