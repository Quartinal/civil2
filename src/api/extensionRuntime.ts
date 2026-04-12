// biome-ignore-all lint/complexity/noBannedTypes: biome being dumb au
import type { ChromeManifest } from "~/types";
import { extensionsGetAll, extensionsReadText } from "./extensions";

const _listeners: Map<string, Set<Function>> = new Map();

function _emit(event: string, ...args: any[]) {
    _listeners.get(event)?.forEach(fn => {
        try {
            fn(...args);
        } catch {}
    });
}

function _on(event: string, fn: Function) {
    if (!_listeners.has(event)) _listeners.set(event, new Set());
    _listeners.get(event)!.add(fn);
}

const _storage: Record<string, any> = (() => {
    try {
        return JSON.parse(localStorage.getItem("civil-ext-storage") ?? "{}");
    } catch {
        return {};
    }
})();

function _persistStorage() {
    try {
        localStorage.setItem("civil-ext-storage", JSON.stringify(_storage));
    } catch {}
}

export function buildChromeShim(
    extId: string,
    manifest: ChromeManifest,
): string {
    const _name = manifest.name.replace(/'/g, "\\'");
    const _version = manifest.version.replace(/'/g, "\\'");

    return `(function() {
if (window.__civil_chrome_injected) return;
window.__civil_chrome_injected = true;

var _extId = '${extId}';
var _msgListeners = [];
var _runtimeListeners = { onMessage: [], onInstalled: [] };
var _storageData = ${JSON.stringify(_storage)};

function persistStorage() {
    window.__civil_storage = _storageData;
    try { window.parent.postMessage({ type: 'civil-ext-storage', data: _storageData }, '*'); } catch {}
}

window.chrome = window.browser = {
    runtime: {
        id: _extId,
        getManifest: function() { return ${JSON.stringify(manifest)}; },
        getURL: function(path) { return '/civil-ext/' + _extId + '/' + path; },
        sendMessage: function(msg, cb) {
            _runtimeListeners.onMessage.forEach(function(fn) {
                try {
                    var resp = fn(msg, { id: _extId }, function(r) { if (cb) cb(r); });
                    if (resp && typeof resp.then === 'function') resp.then(function(r) { if (cb) cb(r); });
                } catch(e) {}
            });
        },
        onMessage: {
            addListener: function(fn) { _runtimeListeners.onMessage.push(fn); },
            removeListener: function(fn) {
                var i = _runtimeListeners.onMessage.indexOf(fn);
                if (i > -1) _runtimeListeners.onMessage.splice(i, 1);
            },
            hasListener: function(fn) { return _runtimeListeners.onMessage.includes(fn); },
        },
        onInstalled: {
            addListener: function(fn) {
                _runtimeListeners.onInstalled.push(fn);
                setTimeout(function() { try { fn({ reason: 'install' }); } catch {} }, 0);
            },
        },
        lastError: null,
        getPlatformInfo: function(cb) { if (cb) cb({ os: 'win', arch: 'x86-64' }); return Promise.resolve({ os: 'win', arch: 'x86-64' }); },
        openOptionsPage: function() {},
    },
    storage: {
        local: {
            get: function(keys, cb) {
                var result = {};
                if (!keys) { result = Object.assign({}, _storageData); }
                else if (typeof keys === 'string') { result[keys] = _storageData[keys]; }
                else if (Array.isArray(keys)) { keys.forEach(function(k) { result[k] = _storageData[k]; }); }
                else if (typeof keys === 'object') { Object.keys(keys).forEach(function(k) { result[k] = k in _storageData ? _storageData[k] : keys[k]; }); }
                if (cb) cb(result); return Promise.resolve(result);
            },
            set: function(items, cb) {
                Object.assign(_storageData, items); persistStorage();
                if (cb) cb(); return Promise.resolve();
            },
            remove: function(keys, cb) {
                var ks = Array.isArray(keys) ? keys : [keys];
                ks.forEach(function(k) { delete _storageData[k]; }); persistStorage();
                if (cb) cb(); return Promise.resolve();
            },
            clear: function(cb) {
                Object.keys(_storageData).forEach(function(k) { delete _storageData[k]; }); persistStorage();
                if (cb) cb(); return Promise.resolve();
            },
        },
        sync: { get: function(k,cb) { return window.chrome.storage.local.get(k,cb); }, set: function(i,cb) { return window.chrome.storage.local.set(i,cb); }, remove: function(k,cb) { return window.chrome.storage.local.remove(k,cb); }, clear: function(cb) { return window.chrome.storage.local.clear(cb); } },
        managed: { get: function(k,cb) { if(cb) cb({}); return Promise.resolve({}); } },
        onChanged: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
        session: {
            get: function(k,cb) { return window.chrome.storage.local.get(k,cb); },
            set: function(i,cb) { return window.chrome.storage.local.set(i,cb); },
        },
    },
    i18n: {
        getMessage: function(key, subs) {
            if (!subs) return key;
            var msg = key;
            if (Array.isArray(subs)) subs.forEach(function(s,i) { msg = msg.replace('$' + (i+1), s); });
            else msg = msg.replace('$1', String(subs));
            return msg;
        },
        getUILanguage: function() { return navigator.language || 'en'; },
        detectLanguage: function(text, cb) { if (cb) cb({ isReliable: false, languages: [] }); return Promise.resolve({ isReliable: false, languages: [] }); },
    },
    tabs: {
        query: function(q, cb) { if (cb) cb([]); return Promise.resolve([]); },
        sendMessage: function(tabId, msg, cb) { if (cb) cb(undefined); return Promise.resolve(); },
        create: function(props, cb) { if (cb) cb({}); return Promise.resolve({}); },
        update: function(tabId, props, cb) { if (cb) cb({}); return Promise.resolve({}); },
        get: function(tabId, cb) { if (cb) cb({}); return Promise.resolve({}); },
        onActivated: { addListener: function() {}, removeListener: function() {} },
        onUpdated: { addListener: function() {}, removeListener: function() {} },
        onRemoved: { addListener: function() {}, removeListener: function() {} },
    },
    webRequest: {
        onBeforeRequest: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
        onBeforeSendHeaders: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
        onHeadersReceived: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
    },
    declarativeNetRequest: {
        updateDynamicRules: function(o, cb) { if (cb) cb(); return Promise.resolve(); },
        getDynamicRules: function(cb) { if (cb) cb([]); return Promise.resolve([]); },
        updateSessionRules: function(o, cb) { if (cb) cb(); return Promise.resolve(); },
        getSessionRules: function(cb) { if (cb) cb([]); return Promise.resolve([]); },
        isRegexSupported: function(o, cb) { var r = {isSupported:true}; if (cb) cb(r); return Promise.resolve(r); },
    },
    permissions: {
        contains: function(p, cb) { if (cb) cb(true); return Promise.resolve(true); },
        request: function(p, cb) { if (cb) cb(true); return Promise.resolve(true); },
        getAll: function(cb) { var r = {permissions:['<all_urls>'],origins:['<all_urls>']}; if (cb) cb(r); return Promise.resolve(r); },
    },
    action: {
        setIcon: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        setBadgeText: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        setBadgeBackgroundColor: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        setTitle: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        setPopup: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        onClicked: { addListener: function() {}, removeListener: function() {} },
    },
    browserAction: {
        setIcon: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        setBadgeText: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        setBadgeBackgroundColor: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        setTitle: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        setPopup: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        onClicked: { addListener: function() {}, removeListener: function() {} },
    },
    scripting: {
        executeScript: function(d, cb) { if (cb) cb([]); return Promise.resolve([]); },
        insertCSS: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
        removeCSS: function(d, cb) { if (cb) cb(); return Promise.resolve(); },
    },
    windows: {
        getCurrent: function(q, cb) { var w = {id:1,focused:true,type:'normal',state:'normal'}; if (cb) cb(w); return Promise.resolve(w); },
        getAll: function(q, cb) { if (cb) cb([]); return Promise.resolve([]); },
        onFocusChanged: { addListener: function() {}, removeListener: function() {} },
    },
    contextMenus: {
        create: function(p, cb) { if (cb) cb(); return ''; },
        update: function(id, p, cb) { if (cb) cb(); return Promise.resolve(); },
        remove: function(id, cb) { if (cb) cb(); return Promise.resolve(); },
        removeAll: function(cb) { if (cb) cb(); return Promise.resolve(); },
        onClicked: { addListener: function() {}, removeListener: function() {} },
    },
    commands: { onCommand: { addListener: function() {}, removeListener: function() {} }, getAll: function(cb) { if (cb) cb([]); return Promise.resolve([]); } },
    extension: { getURL: function(p) { return '/civil-ext/${extId}/' + p; }, getBackgroundPage: function() { return null; }, isAllowedIncognitoAccess: function(cb) { if (cb) cb(false); return Promise.resolve(false); } },
    notifications: { create: function(id,o,cb) { if(cb) cb(''); try { if(Notification.permission==='granted') new Notification(o.title||'',{body:o.message||''}); } catch {} return Promise.resolve(''); }, clear: function(id,cb) { if(cb) cb(true); return Promise.resolve(true); }, onClicked: { addListener: function(){} }, onClosed: { addListener: function(){} } },
    devtools: undefined,
    history: { search: function(q,cb) { if(cb) cb([]); return Promise.resolve([]); }, addUrl: function(d,cb) { if(cb) cb(); return Promise.resolve(); }, deleteUrl: function(d,cb) { if(cb) cb(); return Promise.resolve(); } },
    bookmarks: { get: function(ids,cb) { if(cb) cb([]); return Promise.resolve([]); }, search: function(q,cb) { if(cb) cb([]); return Promise.resolve([]); }, create: function(b,cb) { if(cb) cb(b); return Promise.resolve(b); }, remove: function(id,cb) { if(cb) cb(); return Promise.resolve(); } },
};

window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'civil-ext-storage-sync') {
        Object.assign(_storageData, e.data.data);
    }
});

})();`;
}

export async function injectExtensionShimsIntoIframe(
    iframe: HTMLIFrameElement,
): Promise<void> {
    const enabled = extensionsGetAll().filter(e => e.enabled);
    for (const ext of enabled) {
        try {
            const manifest = ext.manifest as ChromeManifest;
            const shim = buildChromeShim(ext.id, manifest);
            const iframeDoc = iframe.contentDocument;
            if (!iframeDoc) continue;

            const script = iframeDoc.createElement("script");
            script.textContent = shim;
            (iframeDoc.head ?? iframeDoc.documentElement)?.prepend(script);

            const cs = manifest.content_scripts ?? [];
            for (const rule of cs) {
                for (const cssPath of rule.css ?? []) {
                    try {
                        const raw = await extensionsReadText(ext.id, cssPath);
                        const el = iframeDoc.createElement("style");
                        el.textContent = raw;
                        iframeDoc.head?.appendChild(el);
                    } catch {}
                }
                for (const jsPath of rule.js ?? []) {
                    try {
                        const raw = await extensionsReadText(ext.id, jsPath);
                        const el = iframeDoc.createElement("script");
                        el.textContent = raw;
                        (iframeDoc.head ?? iframeDoc.body)?.appendChild(el);
                    } catch {}
                }
            }
        } catch (e) {
            console.error("[extensionRuntime] inject failed for", ext.id, e);
        }
    }
}
